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
import ItemMaster from "../../../../modals/masters/items/itemMaster";
import VendorDetails from "../../../../modals/masters/vendorDetails/vendorDetails";
import { InventoryService } from "../../../../utils/inventoryService";
import { GLImpactService } from "../../../../utils/glImpactService";

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

            const fulfillmentNumber = String(header.fulfillmentNumber || `PRF-${Date.now()}`).trim();
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

                const createdLine = await PurchaseReturnFulfillmentLine.create({
                    fulfillmentHeaderId: fulfillmentHeader.id,
                    purchaseReturnLineId,
                    itemId: Number(line.itemId || parentLine.itemId),
                    fulfilledQty,
                    unitPrice,
                    warehouseId: line.warehouseId ? Number(line.warehouseId) : null,
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
