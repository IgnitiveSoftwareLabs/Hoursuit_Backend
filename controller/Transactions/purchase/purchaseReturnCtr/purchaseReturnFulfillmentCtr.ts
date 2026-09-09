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

            const parentStatus = String(parentReturn.status).toUpperCase();
            if (parentStatus === "DRAFT") {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error(`Purchase Return #${parentReturn.returnNumber || parentReturn.id} is in DRAFT status. It must be AUTHORIZED before fulfillment.`);
            }

            if (parentStatus === "FULFILLED") {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error(`Purchase Return #${parentReturn.returnNumber || parentReturn.id} is already FULFILLED and cannot be fulfilled again.`);
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

            let fulfillmentNumber = String(header.fulfillmentNumber || "").trim();
            if (!fulfillmentNumber || fulfillmentNumber.startsWith("PRF-NEW") || fulfillmentNumber === "To Be Generated" || fulfillmentNumber.startsWith("PRF-17")) {
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

            const fulfillmentHeader = await PurchaseReturnFulfillmentHeader.create({
                companyId,
                fulfillmentNumber,
                purchaseReturnHeaderId: parentReturn.id,
                vendorId: parentReturn.vendorId,
                fulfillmentDate,
                status: "FULFILLED",
                remarks: header.remarks || null,
                user_id
            }, { transaction });

            const createdLines: any[] = [];
            const returnLinesMap = new Map<number, any>();
            ((parentReturn as any).purchaseReturnLines || []).forEach((line: any) => {
                returnLinesMap.set(line.id, line);
            });

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

                // Check previously fulfilled qty for this line
                const existingFulfillments = await PurchaseReturnFulfillmentLine.findAll({
                    where: { purchaseReturnLineId },
                    include: [{
                        model: PurchaseReturnFulfillmentHeader,
                        as: "fulfillmentHeader",
                        where: { status: { [Op.ne]: "CANCELLED" } }
                    }],
                    transaction
                });

                const previouslyFulfilledQty = existingFulfillments.reduce((sum, f) => sum + Number(f.fulfilledQty || 0), 0);
                const authorizedQty = Number(parentLine.returnQty || 0);
                const remainingFulfillableQty = authorizedQty - previouslyFulfilledQty;

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

                // If no records found with specific location, fallback to all company stock for this item
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

            // 1. Physical inventory reduction (Stock DECREASES only on fulfillment)
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

            // 3. Update Parent Purchase Return Header Status
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
                        where: { status: { [Op.ne]: "CANCELLED" } }
                    }],
                    transaction
                });
                totalFulfilled += fLinesForPLine.reduce((s, f) => s + Number(f.fulfilledQty || 0), 0);
            }

            const nextParentStatus = totalFulfilled >= totalAuthorized ? "FULFILLED" : "PARTIALLY_FULFILLED";
            await parentReturn.update({ status: nextParentStatus }, { transaction });

            await transaction.commit();

            res.status(StatusCodes.CREATED).json({
                success: true,
                message: "Return fulfillment created and inventory/GL updated successfully",
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

    getAllFulfillments: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;

        if (!companyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const { page = 1, limit = 10, returnHeaderId } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const whereClause: any = { companyId };

        if (returnHeaderId) {
            whereClause.purchaseReturnHeaderId = Number(returnHeaderId);
        }

        const total = await PurchaseReturnFulfillmentHeader.count({ where: whereClause });
        const fulfillments = await PurchaseReturnFulfillmentHeader.findAll({
            where: whereClause,
            include: [
                { model: PurchaseReturnHeader, as: "purchaseReturnHeader", attributes: ["id", "returnNumber", "status"] },
                { model: VendorDetails, as: "vendor", attributes: ["id", "company_name"] },
                {
                    model: PurchaseReturnFulfillmentLine,
                    as: "fulfillmentLines",
                    include: [{ model: ItemMaster, as: "item", attributes: ["id", "item_code", "item_name"] }]
                }
            ],
            offset,
            limit: Number(limit),
            order: [["createdAt", "DESC"]]
        });

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Return fulfillments fetched successfully",
            result: fulfillments,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        });
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
                { model: VendorDetails, as: "vendor", attributes: ["id", "company_name"] },
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
    })
};

export default PurchaseReturnFulfillmentController;
