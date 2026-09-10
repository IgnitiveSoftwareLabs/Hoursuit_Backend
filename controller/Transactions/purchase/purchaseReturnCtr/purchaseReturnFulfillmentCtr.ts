import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import sequelize from "../../../../dbconfig/dbconfig";
import { CustomRequest } from "../../../../typeRequest/customReq";
import { findCompanyForUser } from "../../../../utils/findCompanyForUser";
import { PurchaseReturnHeader, PurchaseReturnLine } from "../../../../modals/Transactions/purchase/purchaseReturn";
import PurchaseReturnFulfillmentHeader from "../../../../modals/Transactions/purchase/purchaseReturn/purchaseReturnFulfillmentHeader";
import PurchaseReturnFulfillmentLine from "../../../../modals/Transactions/purchase/purchaseReturn/purchaseReturnFulfillmentLine";
import { PurchaseOrder } from "../../../../modals/Transactions/purchase/purchaseOrder";
import { GRN } from "../../../../modals/Transactions/purchase/GRN";
import { PurchaseInvoiceHeader } from "../../../../modals/Transactions/purchase/purchaseInvoice";
import ItemMaster from "../../../../modals/masters/items/itemMaster";
import CityMaster from "../../../../modals/masters/city/city";
import VendorDetails from "../../../../modals/masters/vendorDetails/vendorDetails";
import InventoryCount from "../../../../modals/inventory/inventory";
import { InventoryService } from "../../../../utils/inventoryService";
import { GLImpactService } from "../../../../utils/glImpactService";
import { generateSequentialDocNumber } from "../../../../utils/documentNumberHelper";
import { normalizePurchaseReturnStatus, normalizeReturnFulfillmentStatus } from "../../../../utils/p2pStatus";

export const PurchaseReturnFulfillmentController = {
    createFulfillment: asyncHandler(async (req: CustomRequest, res: Response) => {
        const transaction = await sequelize.transaction();
        try {
            const rawBody = req.body || {};
            const body = rawBody.body || rawBody;
            let header = body.header || body;
            let lineItems = body.lineItems || body.lines || body.fulfillmentLines || body.details;

            if (typeof header === "string") header = JSON.parse(header);
            if (typeof lineItems === "string") lineItems = JSON.parse(lineItems);

            if (!header || !Array.isArray(lineItems) || lineItems.length === 0) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Header and at least one line item are required for return fulfillment");
            }

            const company = await findCompanyForUser(req.user);
            const companyId = company?.id;
            const user_id = req.user?.id;

            if (!companyId || !user_id) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User authentication required");
            }

            const purchaseReturnHeaderId = Number(header.purchaseReturnHeaderId);
            if (!purchaseReturnHeaderId || isNaN(purchaseReturnHeaderId)) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Purchase Return Authorization reference is required to fulfill items.");
            }

            const parentReturn = await PurchaseReturnHeader.findOne({
                where: { id: purchaseReturnHeaderId, companyId },
                include: [{ model: PurchaseReturnLine, as: "purchaseReturnLines" }],
                transaction
            });

            if (!parentReturn) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error(`Purchase Return #${purchaseReturnHeaderId} not found`);
            }

            const parentStatus = normalizePurchaseReturnStatus(parentReturn.status);
            if (parentStatus === "PENDING_APPROVAL" || parentStatus === "DRAFT") {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error(`Purchase Return #${parentReturn.returnNumber || parentReturn.id} is in Pending Approval status. It must be Approved / Pending Return before fulfillment.`);
            }

            if (parentStatus === "PENDING_CREDIT" || parentStatus === "CREDITED" || parentStatus === "CLOSED") {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error(`Purchase Return #${parentReturn.returnNumber || parentReturn.id} is already fulfilled (${parentStatus}) and cannot be fulfilled again.`);
            }

            if (parentReturn.purchaseOrderHeaderId) {
                const po = await PurchaseOrder.findOne({ where: { id: parentReturn.purchaseOrderHeaderId, CompanyId: companyId }, transaction });
                if (po && po.isActive === false) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`Cannot fulfill Purchase Return #${parentReturn.returnNumber || parentReturn.id} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
                }
            }
            if (parentReturn.grnHeaderId) {
                const grn = await GRN.findOne({ where: { id: parentReturn.grnHeaderId, CompanyId: companyId }, transaction });
                if (grn && grn.purchaseOrderId) {
                    const po = await PurchaseOrder.findOne({ where: { id: grn.purchaseOrderId, CompanyId: companyId }, transaction });
                    if (po && po.isActive === false) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`Cannot fulfill Purchase Return #${parentReturn.returnNumber || parentReturn.id} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
                    }
                }
            }
            if (parentReturn.purchaseInvoiceHeaderId) {
                const inv = await PurchaseInvoiceHeader.findOne({ where: { id: parentReturn.purchaseInvoiceHeaderId, companyId }, transaction });
                if (inv) {
                    if (inv.poHeaderId) {
                        const po = await PurchaseOrder.findOne({ where: { id: inv.poHeaderId, CompanyId: companyId }, transaction });
                        if (po && po.isActive === false) {
                            res.status(StatusCodes.BAD_REQUEST);
                            throw new Error(`Cannot fulfill Purchase Return #${parentReturn.returnNumber || parentReturn.id} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
                        }
                    }
                    if (inv.grnHeaderId) {
                        const grn = await GRN.findOne({ where: { id: inv.grnHeaderId, CompanyId: companyId }, transaction });
                        if (grn && grn.purchaseOrderId) {
                            const po = await PurchaseOrder.findOne({ where: { id: grn.purchaseOrderId, CompanyId: companyId }, transaction });
                            if (po && po.isActive === false) {
                                res.status(StatusCodes.BAD_REQUEST);
                                throw new Error(`Cannot fulfill Purchase Return #${parentReturn.returnNumber || parentReturn.id} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
                            }
                        }
                    }
                }
            }

            let fulfillmentNumber = header.fulfillmentNumber;
            if (!fulfillmentNumber) {
                fulfillmentNumber = await generateSequentialDocNumber(
                    PurchaseReturnFulfillmentHeader,
                    "fulfillmentNumber",
                    "PRF",
                    "companyId",
                    companyId,
                    transaction
                );
            } else {
                const exists = await PurchaseReturnFulfillmentHeader.findOne({
                    where: { fulfillmentNumber, companyId },
                    transaction
                });
                if (exists) {
                    fulfillmentNumber = await generateSequentialDocNumber(
                        PurchaseReturnFulfillmentHeader,
                        "fulfillmentNumber",
                        "PRF",
                        "companyId",
                        companyId,
                        transaction
                    );
                }
            }
            const fulfillmentDate = header.fulfillmentDate ? new Date(header.fulfillmentDate) : new Date();
            const initialStatus = normalizeReturnFulfillmentStatus(header.status, "FULFILLED");

            const fulfillmentHeader = await PurchaseReturnFulfillmentHeader.create({
                companyId,
                fulfillmentNumber,
                purchaseReturnHeaderId: parentReturn.id,
                vendorId: parentReturn.vendorId,
                fulfillmentDate,
                status: initialStatus,
                remarks: header.remarks || null,
                user_id
            }, { transaction });

            const createdLines: any[] = [];
            const returnLinesMap = new Map<number, any>();
            ((parentReturn as any).purchaseReturnLines || []).forEach((line: any) => {
                returnLinesMap.set(line.id, line);
            });

            const isFulfilled = initialStatus === "FULFILLED" || initialStatus === "APPROVED";

            for (let index = 0; index < lineItems.length; index++) {
                const line = lineItems[index];
                const purchaseReturnLineId = Number(line.purchaseReturnLineId);
                const fulfilledQty = Number(line.fulfilledQty);

                if (!purchaseReturnLineId) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`purchaseReturnLineId is required in line ${index + 1}`);
                }
                if (!fulfilledQty || fulfilledQty <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`fulfilledQty must be greater than zero in line ${index + 1}`);
                }

                const parentLine = returnLinesMap.get(purchaseReturnLineId);
                if (!parentLine) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`Purchase Return Line #${purchaseReturnLineId} does not belong to Purchase Return #${parentReturn.id}`);
                }

                // Check previously fulfilled qty ONLY from already FULFILLED / APPROVED fulfillments
                const existingFulfillments = await PurchaseReturnFulfillmentLine.findAll({
                    where: { purchaseReturnLineId },
                    include: [{
                        model: PurchaseReturnFulfillmentHeader,
                        as: "fulfillmentHeader",
                        where: { status: { [Op.in]: ["FULFILLED", "APPROVED"] } }
                    }],
                    transaction
                });

                const previouslyFulfilledQty = existingFulfillments.reduce((sum, f) => sum + Number(f.fulfilledQty || 0), 0);
                const authorizedQty = Number(parentLine.returnQty || 0);
                const remainingFulfillableQty = Math.max(0, authorizedQty - previouslyFulfilledQty);

                if (fulfilledQty > remainingFulfillableQty) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(
                        `Cannot fulfill ${fulfilledQty} units for item (Line #${purchaseReturnLineId}). Max fulfillable is ${remainingFulfillableQty} (Authorized: ${authorizedQty}, Previously Fulfilled: ${previouslyFulfilledQty}).`
                    );
                }

                const unitPrice = line.unitPrice !== undefined ? Number(line.unitPrice) : Number(parentLine.unitPrice || 0);
                const resolvedWarehouseId = line.warehouseId ? Number(line.warehouseId) : (header.location_id ? Number(header.location_id) : null);
                const targetItemId = Number(line.itemId || parentLine.itemId);

                let targetLocationName: string | null = null;
                if (resolvedWarehouseId) {
                    const city = await CityMaster.findByPk(resolvedWarehouseId, { transaction });
                    if (city) {
                        targetLocationName = city.city_name || (city as any).name;
                    }
                }

                if (isFulfilled) {
                    // Check on-hand stock for this item in this location / company
                    const inventoryWhere: any = {
                        item_id: targetItemId,
                        CompanyId: companyId,
                        isActive: true,
                    };
                    if (targetLocationName) {
                        inventoryWhere[Op.or] = [
                            { location: targetLocationName },
                            { location: String(resolvedWarehouseId) }
                        ];
                    }

                    let invRecords = await InventoryCount.findAll({
                        where: inventoryWhere,
                        transaction
                    });

                    if (invRecords.length === 0) {
                        invRecords = await InventoryCount.findAll({
                            where: {
                                item_id: targetItemId,
                                CompanyId: companyId,
                                isActive: true
                            },
                            transaction
                        });
                    }

                    const currentOnHand = invRecords.reduce((sum, inv) => sum + Number(inv.qty || 0), 0);

                    if (currentOnHand <= 0) {
                        const itObj = await ItemMaster.findByPk(targetItemId, { transaction });
                        const itName = itObj?.item_name || `Item #${targetItemId}`;
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`Cannot fulfill return for "${itName}": On-hand stock is 0 at ${targetLocationName ? `location "${targetLocationName}"` : "the selected location"}.`);
                    }

                    if (fulfilledQty > currentOnHand) {
                        const itObj = await ItemMaster.findByPk(targetItemId, { transaction });
                        const itName = itObj?.item_name || `Item #${targetItemId}`;
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`Cannot fulfill ${fulfilledQty} units for "${itName}": Available on-hand stock is only ${currentOnHand} at ${targetLocationName ? `location "${targetLocationName}"` : "the selected location"}.`);
                    }
                }

                const createdLine = await PurchaseReturnFulfillmentLine.create({
                    fulfillmentHeaderId: fulfillmentHeader.id,
                    purchaseReturnLineId,
                    itemId: targetItemId,
                    fulfilledQty,
                    unitPrice,
                    warehouseId: resolvedWarehouseId,
                    batchNo: line.batchNo || parentLine.batchNo || null,
                    remarks: line.remarks || null
                }, { transaction });

                createdLines.push(createdLine);
            }

            if (isFulfilled) {
                // 1. Physical inventory reduction (Stock DECREASES only on fulfilled fulfillment)
                await InventoryService.reduceStockFromPurchaseReturnFulfillment(
                    fulfillmentHeader.id,
                    companyId,
                    user_id,
                    transaction
                );

                // 2. Post Return Fulfillment GL Entry (DR Purchase Return Clearing, CR Inventory Asset)
                await GLImpactService.processPurchaseReturnFulfillmentPosting(
                    fulfillmentHeader.id,
                    companyId,
                    user_id,
                    undefined,
                    undefined,
                    transaction
                );
            }

            // 3. Update Parent Purchase Return Header Status based on FULFILLED fulfillments
            const allParentLines = await PurchaseReturnLine.findAll({
                where: { returnHeaderId: parentReturn.id },
                transaction
            });

            let totalAuthorized = 0;
            let totalFulfilled = 0;

            for (const pLine of allParentLines) {
                totalAuthorized += Number(pLine.returnQty || 0);
                const fLinesForPLine = await PurchaseReturnFulfillmentLine.findAll({
                    where: { purchaseReturnLineId: pLine.id },
                    include: [{
                        model: PurchaseReturnFulfillmentHeader,
                        as: "fulfillmentHeader",
                        where: { status: { [Op.in]: ["FULFILLED", "APPROVED"] } }
                    }],
                    transaction
                });
                totalFulfilled += fLinesForPLine.reduce((s, f) => s + Number(f.fulfilledQty || 0), 0);
            }

            let nextParentStatus = parentReturn.status;
            if (totalFulfilled > 0) {
                nextParentStatus = totalFulfilled >= totalAuthorized ? "PENDING_CREDIT" : "PARTIALLY_RETURNED";
                await parentReturn.update({ status: nextParentStatus }, { transaction });
            }

            await transaction.commit();

            res.status(StatusCodes.CREATED).json({
                success: true,
                message: isFulfilled
                    ? "Return fulfillment fulfilled, inventory deducted, and GL updated successfully"
                    : "Return fulfillment recorded in Pending Approval (Draft) status",
                result: {
                    header: fulfillmentHeader,
                    lineItems: createdLines,
                    parentReturnStatus: nextParentStatus
                }
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }),

    updateFulfillment: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const transaction = await sequelize.transaction();
        try {
            const rawBody = req.body || {};
            const body = rawBody.body || rawBody;
            let header = body.header || body;
            let lineItems = body.lineItems || body.lines || body.fulfillmentLines || body.details;

            if (typeof header === "string") header = JSON.parse(header);
            if (typeof lineItems === "string") lineItems = JSON.parse(lineItems);

            const company = await findCompanyForUser(req.user);
            const companyId = company?.id;
            const user_id = req.user?.id;

            if (!companyId || !user_id) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User authentication required");
            }

            const fulfillment = await PurchaseReturnFulfillmentHeader.findOne({
                where: { id: Number(id), companyId },
                include: [{ model: PurchaseReturnFulfillmentLine, as: "fulfillmentLines" }],
                transaction
            });

            if (!fulfillment) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error(`Item Fulfillment #${id} not found`);
            }

            const prevStatus = fulfillment.status;
            if (prevStatus === "FULFILLED" || prevStatus === "APPROVED") {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error(`Item Fulfillment #${fulfillment.fulfillmentNumber || id} is already FULFILLED and locked against modifications.`);
            }

            const newStatus = header.status ? normalizeReturnFulfillmentStatus(header.status) : prevStatus;
            const willFulfill = newStatus === "FULFILLED" || newStatus === "APPROVED";

            const parentReturn = await PurchaseReturnHeader.findOne({
                where: { id: fulfillment.purchaseReturnHeaderId, companyId },
                include: [{ model: PurchaseReturnLine, as: "purchaseReturnLines" }],
                transaction
            });

            if (!parentReturn) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error(`Referenced Purchase Return not found`);
            }

            // Update header fields
            await fulfillment.update({
                fulfillmentDate: header.fulfillmentDate ? new Date(header.fulfillmentDate) : fulfillment.fulfillmentDate,
                remarks: header.remarks !== undefined ? header.remarks : fulfillment.remarks,
                status: newStatus
            }, { transaction });

            // If lineItems provided, update lines
            if (Array.isArray(lineItems) && lineItems.length > 0) {
                await PurchaseReturnFulfillmentLine.destroy({
                    where: { fulfillmentHeaderId: fulfillment.id },
                    transaction
                });

                const returnLinesMap = new Map<number, any>();
                ((parentReturn as any).purchaseReturnLines || []).forEach((line: any) => {
                    returnLinesMap.set(line.id, line);
                });

                for (let index = 0; index < lineItems.length; index++) {
                    const line = lineItems[index];
                    const purchaseReturnLineId = Number(line.purchaseReturnLineId);
                    const fulfilledQty = Number(line.fulfilledQty);

                    if (!purchaseReturnLineId || !fulfilledQty || fulfilledQty <= 0) continue;

                    const parentLine = returnLinesMap.get(purchaseReturnLineId);
                    if (!parentLine) continue;

                    // Calculate previously fulfilled qty from OTHER fulfilled fulfillments
                    const existingFulfillments = await PurchaseReturnFulfillmentLine.findAll({
                        where: {
                            purchaseReturnLineId,
                            fulfillmentHeaderId: { [Op.ne]: fulfillment.id }
                        },
                        include: [{
                            model: PurchaseReturnFulfillmentHeader,
                            as: "fulfillmentHeader",
                            where: { status: { [Op.in]: ["FULFILLED", "APPROVED"] } }
                        }],
                        transaction
                    });

                    const previouslyFulfilledQty = existingFulfillments.reduce((sum, f) => sum + Number(f.fulfilledQty || 0), 0);
                    const authorizedQty = Number(parentLine.returnQty || 0);
                    const remainingFulfillableQty = Math.max(0, authorizedQty - previouslyFulfilledQty);

                    if (fulfilledQty > remainingFulfillableQty) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(
                            `Cannot fulfill ${fulfilledQty} units for item (Line #${purchaseReturnLineId}). Max fulfillable is ${remainingFulfillableQty} (Authorized: ${authorizedQty}, Previously Fulfilled: ${previouslyFulfilledQty}).`
                        );
                    }

                    const resolvedWarehouseId = line.warehouseId ? Number(line.warehouseId) : (header.location_id ? Number(header.location_id) : null);
                    const targetItemId = Number(line.itemId || parentLine.itemId);

                    let targetLocationName: string | null = null;
                    if (resolvedWarehouseId) {
                        const city = await CityMaster.findByPk(resolvedWarehouseId, { transaction });
                        if (city) {
                            targetLocationName = city.city_name || (city as any).name;
                        }
                    }

                    if (willFulfill) {
                        const inventoryWhere: any = {
                            item_id: targetItemId,
                            CompanyId: companyId,
                            isActive: true,
                        };
                        if (targetLocationName) {
                            inventoryWhere[Op.or] = [
                                { location: targetLocationName },
                                { location: String(resolvedWarehouseId) }
                            ];
                        }

                        let invRecords = await InventoryCount.findAll({
                            where: inventoryWhere,
                            transaction
                        });

                        if (invRecords.length === 0) {
                            invRecords = await InventoryCount.findAll({
                                where: {
                                    item_id: targetItemId,
                                    CompanyId: companyId,
                                    isActive: true
                                },
                                transaction
                            });
                        }

                        const currentOnHand = invRecords.reduce((sum, inv) => sum + Number(inv.qty || 0), 0);
                        if (fulfilledQty > currentOnHand) {
                            const itObj = await ItemMaster.findByPk(targetItemId, { transaction });
                            const itName = itObj?.item_name || `Item #${targetItemId}`;
                            res.status(StatusCodes.BAD_REQUEST);
                            throw new Error(`Cannot fulfill ${fulfilledQty} units for "${itName}": Available on-hand stock is only ${currentOnHand} at ${targetLocationName ? `location "${targetLocationName}"` : "the selected location"}.`);
                        }
                    }

                    await PurchaseReturnFulfillmentLine.create({
                        fulfillmentHeaderId: fulfillment.id,
                        purchaseReturnLineId,
                        itemId: targetItemId,
                        fulfilledQty,
                        unitPrice: line.unitPrice !== undefined ? Number(line.unitPrice) : Number(parentLine.unitPrice || 0),
                        warehouseId: resolvedWarehouseId,
                        batchNo: line.batchNo || parentLine.batchNo || null,
                        remarks: line.remarks || null
                    }, { transaction });
                }
            }

            if (willFulfill) {
                // 1. Reduce stock upon fulfillment
                await InventoryService.reduceStockFromPurchaseReturnFulfillment(
                    fulfillment.id,
                    companyId,
                    user_id,
                    transaction
                );

                // 2. Post GL entry upon fulfillment
                await GLImpactService.processPurchaseReturnFulfillmentPosting(
                    fulfillment.id,
                    companyId,
                    user_id,
                    undefined,
                    undefined,
                    transaction
                );
            }

            // 3. Recalculate parent return status based on all FULFILLED fulfillments
            const allParentLines = await PurchaseReturnLine.findAll({
                where: { returnHeaderId: parentReturn.id },
                transaction
            });

            let totalAuthorized = 0;
            let totalFulfilled = 0;

            for (const pLine of allParentLines) {
                totalAuthorized += Number(pLine.returnQty || 0);
                const fLinesForPLine = await PurchaseReturnFulfillmentLine.findAll({
                    where: { purchaseReturnLineId: pLine.id },
                    include: [{
                        model: PurchaseReturnFulfillmentHeader,
                        as: "fulfillmentHeader",
                        where: { status: { [Op.in]: ["FULFILLED", "APPROVED"] } }
                    }],
                    transaction
                });
                totalFulfilled += fLinesForPLine.reduce((s, f) => s + Number(f.fulfilledQty || 0), 0);
            }

            const nextParentStatus = totalFulfilled >= totalAuthorized ? "PENDING_CREDIT" : totalFulfilled > 0 ? "PARTIALLY_RETURNED" : "PENDING_RETURN";
            await parentReturn.update({ status: nextParentStatus }, { transaction });

            await transaction.commit();

            res.status(StatusCodes.OK).json({
                success: true,
                message: willFulfill
                    ? "Item Fulfillment fulfilled, inventory deducted, and GL posted successfully."
                    : "Item Fulfillment updated successfully.",
                result: fulfillment
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }),

    getAllFulfillments: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;

        if (!companyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.max(1, Number(req.query.limit) || 10);
        const offset = (page - 1) * limit;
        const { search, status, vendorId, returnHeaderId, startDate, endDate } = req.query;
        const option = String(req.query.option) === "true" || (req.query.option as any) === true;

        const whereClause: any = { companyId };

        if (status) {
            whereClause.status = status;
        }

        if (vendorId) {
            whereClause.vendorId = Number(vendorId);
        }

        if (returnHeaderId) {
            whereClause.purchaseReturnHeaderId = Number(returnHeaderId);
        }

        if (startDate && endDate) {
            whereClause.fulfillmentDate = {
                [Op.between]: [new Date(String(startDate)), new Date(String(endDate))]
            };
        } else if (startDate) {
            whereClause.fulfillmentDate = { [Op.gte]: new Date(String(startDate)) };
        } else if (endDate) {
            whereClause.fulfillmentDate = { [Op.lte]: new Date(String(endDate)) };
        }

        if (search) {
            const searchStr = String(search).trim();
            const matchingVendors = await VendorDetails.findAll({
                where: {
                    company_id: companyId,
                    [Op.or]: [
                        { company_name: { [Op.like]: `%${searchStr}%` } },
                        { first_name: { [Op.like]: `%${searchStr}%` } },
                        { last_name: { [Op.like]: `%${searchStr}%` } },
                    ]
                },
                attributes: ["id"]
            });
            const vIds = matchingVendors.map((v: any) => v.id);

            const searchOr: any[] = [
                { fulfillmentNumber: { [Op.like]: `%${searchStr}%` } },
                { remarks: { [Op.like]: `%${searchStr}%` } }
            ];

            if (vIds.length > 0) {
                searchOr.push({ vendorId: { [Op.in]: vIds } });
            }

            if (!isNaN(Number(searchStr))) {
                searchOr.push({ id: Number(searchStr) });
                searchOr.push({ purchaseReturnHeaderId: Number(searchStr) });
            }

            whereClause[Op.or] = searchOr;
        }

        const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy : "createdAt";
        const sortOrder = String(req.query.sortOrder || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

        const sortFieldMap: { [key: string]: any } = {
            id: [["id", sortOrder]],
            fulfillmentNumber: [["fulfillmentNumber", sortOrder]],
            fulfillmentDate: [["fulfillmentDate", sortOrder]],
            status: [["status", sortOrder]],
            createdAt: [["createdAt", sortOrder]],
            updatedAt: [["updatedAt", sortOrder]],
        };

        const orderClause = sortFieldMap[sortBy] || [["createdAt", "DESC"]];

        const includeConfig = [
            { model: PurchaseReturnHeader, as: "purchaseReturnHeader", attributes: ["id", "returnNumber", "status"] },
            { model: VendorDetails, as: "vendor", attributes: ["id", "company_name", "first_name", "last_name"] },
            {
                model: PurchaseReturnFulfillmentLine,
                as: "fulfillmentLines",
                include: [{ model: ItemMaster, as: "item", attributes: ["id", "item_code", "item_name"] }]
            }
        ];

        if (option) {
            const fulfillments = await PurchaseReturnFulfillmentHeader.findAll({
                where: whereClause,
                include: includeConfig,
                order: orderClause
            });

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Return fulfillments fetched successfully",
                result: fulfillments,
                total: fulfillments.length
            });
            return;
        }

        const total = await PurchaseReturnFulfillmentHeader.count({ where: whereClause });
        const fulfillments = await PurchaseReturnFulfillmentHeader.findAll({
            where: whereClause,
            include: includeConfig,
            offset,
            limit,
            order: orderClause
        });

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Return fulfillments fetched successfully",
            result: fulfillments,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    }),

    exportFulfillmentsCSV: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;

        if (!companyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const { search, status, vendorId, returnHeaderId, startDate, endDate } = req.query;
        const whereClause: any = { companyId };

        if (status) whereClause.status = status;
        if (vendorId) whereClause.vendorId = Number(vendorId);
        if (returnHeaderId) whereClause.purchaseReturnHeaderId = Number(returnHeaderId);

        if (startDate && endDate) {
            whereClause.fulfillmentDate = {
                [Op.between]: [new Date(String(startDate)), new Date(String(endDate))]
            };
        } else if (startDate) {
            whereClause.fulfillmentDate = { [Op.gte]: new Date(String(startDate)) };
        } else if (endDate) {
            whereClause.fulfillmentDate = { [Op.lte]: new Date(String(endDate)) };
        }

        if (search) {
            const searchStr = String(search).trim();
            whereClause[Op.or] = [
                { fulfillmentNumber: { [Op.like]: `%${searchStr}%` } },
                { remarks: { [Op.like]: `%${searchStr}%` } }
            ];
        }

        const fulfillments = await PurchaseReturnFulfillmentHeader.findAll({
            where: whereClause,
            include: [
                { model: PurchaseReturnHeader, as: "purchaseReturnHeader", attributes: ["id", "returnNumber", "status"] },
                { model: VendorDetails, as: "vendor" },
                {
                    model: PurchaseReturnFulfillmentLine,
                    as: "fulfillmentLines",
                    include: [{ model: ItemMaster, as: "item" }]
                }
            ],
            order: [["createdAt", "DESC"]]
        });

        const formatDateVal = (date: any) => (date ? new Date(date).toISOString().split("T")[0] : "");

        const csvRows: any[] = [];
        fulfillments.forEach((f: any) => {
            const vendorName = f.vendor?.company_name || [f.vendor?.first_name, f.vendor?.last_name].filter(Boolean).join(" ") || "";
            const lines = f.fulfillmentLines || [];

            if (lines.length > 0) {
                lines.forEach((l: any, idx: number) => {
                    const item = l.item || {};
                    csvRows.push({
                        "Fulfillment Internal ID": f.id,
                        "Fulfillment #": f.fulfillmentNumber || "",
                        "Fulfillment Date": formatDateVal(f.fulfillmentDate),
                        "Status": f.status || "",
                        "Vendor Name": vendorName,
                        "Return Authorization #": f.purchaseReturnHeader?.returnNumber || "",
                        "Header Remarks": f.remarks || "",
                        "Created Date": formatDateVal(f.createdAt),
                        "Line #": idx + 1,
                        "Item Code": item.item_code || "",
                        "Item Name": item.item_name || "",
                        "Fulfilled Quantity": l.fulfilledQty || "",
                        "Unit Price": Number(l.unitPrice || 0).toFixed(2),
                        "Batch #": l.batchNo || "",
                        "Line Remarks": l.remarks || ""
                    });
                });
            } else {
                csvRows.push({
                    "Fulfillment Internal ID": f.id,
                    "Fulfillment #": f.fulfillmentNumber || "",
                    "Fulfillment Date": formatDateVal(f.fulfillmentDate),
                    "Status": f.status || "",
                    "Vendor Name": vendorName,
                    "Return Authorization #": f.purchaseReturnHeader?.returnNumber || "",
                    "Header Remarks": f.remarks || "",
                    "Created Date": formatDateVal(f.createdAt),
                    "Line #": "",
                    "Item Code": "",
                    "Item Name": "",
                    "Fulfilled Quantity": "",
                    "Unit Price": "",
                    "Batch #": "",
                    "Line Remarks": ""
                });
            }
        });

        const defaultHeaders = [
            "Fulfillment Internal ID", "Fulfillment #", "Fulfillment Date", "Status",
            "Vendor Name", "Return Authorization #", "Header Remarks", "Created Date",
            "Line #", "Item Code", "Item Name", "Fulfilled Quantity", "Unit Price", "Batch #", "Line Remarks"
        ];

        const headers = csvRows.length > 0 ? Object.keys(csvRows[0]) : defaultHeaders;
        const csvContent = [
            headers.join(","),
            ...csvRows.map((row) =>
                headers.map((h) => {
                    const val = row[h] !== undefined && row[h] !== null ? String(row[h]) : "";
                    if (val.includes(",") || val.includes('"') || val.includes("\n") || val.includes("\r")) {
                        return `"${val.replace(/"/g, '""')}"`;
                    }
                    return val;
                }).join(",")
            )
        ].join("\n");

        const filename = `item_fulfillments_export_${new Date().toISOString().split("T")[0]}.csv`;
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.status(StatusCodes.OK).send(csvContent);
    }),

    getFulfillmentById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;

        if (!companyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const fulfillment = await PurchaseReturnFulfillmentHeader.findOne({
            where: { id: Number(id), companyId },
            include: [
                { model: PurchaseReturnHeader, as: "purchaseReturnHeader" },
                { model: VendorDetails, as: "vendor" },
                {
                    model: PurchaseReturnFulfillmentLine,
                    as: "fulfillmentLines",
                    include: [{ model: ItemMaster, as: "item" }]
                }
            ]
        });

        if (!fulfillment) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Return fulfillment not found");
        }

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Return fulfillment fetched successfully",
            result: fulfillment
        });
    }),

    updateFulfillmentStatus: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { status } = req.body;
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;

        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const fulfillment = await PurchaseReturnFulfillmentHeader.findOne({
            where: { id: Number(id), companyId },
            include: [{ model: PurchaseReturnHeader, as: "purchaseReturnHeader" }]
        });

        if (!fulfillment) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Return fulfillment not found");
        }

        const prevStatus = fulfillment.status;
        const newStatus = normalizeReturnFulfillmentStatus(status);

        if (prevStatus === newStatus) {
            res.status(StatusCodes.OK).json({
                success: true,
                message: `Status is already set to ${newStatus}`,
                result: fulfillment
            });
            return;
        }

        const transaction = await sequelize.transaction();
        try {
            await fulfillment.update({ status: newStatus }, { transaction });

            if ((newStatus === "FULFILLED" || newStatus === "APPROVED") && prevStatus !== "FULFILLED" && prevStatus !== "APPROVED") {
                await InventoryService.reduceStockFromPurchaseReturnFulfillment(
                    fulfillment.id,
                    companyId,
                    user_id,
                    transaction
                );
                await GLImpactService.processPurchaseReturnFulfillmentPosting(
                    fulfillment.id,
                    companyId,
                    user_id,
                    undefined,
                    undefined,
                    transaction
                );
            }

            // Recalculate parent return status
            const parentReturn = await PurchaseReturnHeader.findByPk(fulfillment.purchaseReturnHeaderId, { transaction });
            if (parentReturn) {
                const allParentLines = await PurchaseReturnLine.findAll({
                    where: { returnHeaderId: parentReturn.id },
                    transaction
                });

                let totalAuthorized = 0;
                let totalFulfilled = 0;

                for (const pLine of allParentLines) {
                    totalAuthorized += Number(pLine.returnQty || 0);
                    const fLinesForPLine = await PurchaseReturnFulfillmentLine.findAll({
                        where: { purchaseReturnLineId: pLine.id },
                        include: [{
                            model: PurchaseReturnFulfillmentHeader,
                            as: "fulfillmentHeader",
                            where: { status: { [Op.in]: ["FULFILLED", "APPROVED"] } }
                        }],
                        transaction
                    });
                    totalFulfilled += fLinesForPLine.reduce((s, f) => s + Number(f.fulfilledQty || 0), 0);
                }

                const nextParentStatus = totalFulfilled >= totalAuthorized ? "PENDING_CREDIT" : totalFulfilled > 0 ? "PARTIALLY_RETURNED" : "PENDING_RETURN";
                await parentReturn.update({ status: nextParentStatus }, { transaction });
            }

            await transaction.commit();

            res.status(StatusCodes.OK).json({
                success: true,
                message: `Fulfillment status updated to ${newStatus}`,
                result: fulfillment
            });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }),
};

export default PurchaseReturnFulfillmentController;
