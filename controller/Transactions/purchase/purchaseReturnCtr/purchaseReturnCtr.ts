import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import { findCompanyForUser } from "../../../../utils/findCompanyForUser";
import { normalizePurchaseReturnStatus } from "../../../../utils/p2pStatus";
import { CustomRequest } from "../../../../typeRequest/customReq";
import sequelize from "../../../../dbconfig/dbconfig";
import { PurchaseReturnHeader, PurchaseReturnLine } from "../../../../modals/Transactions/purchase/purchaseReturn";
import PurchaseInvoiceHeader from "../../../../modals/Transactions/purchase/purchaseInvoice/purchaseInvoiceHeader";
import PurchaseOrder from "../../../../modals/Transactions/purchase/purchaseOrder/purchaseOrderHeader";
import { GRN } from "../../../../modals/Transactions/purchase/GRN";
import VendorDetails from "../../../../modals/masters/vendorDetails/vendorDetails";
import ItemMaster from "../../../../modals/masters/items/itemMaster";
import { InventoryService } from "../../../../utils/inventoryService";
import { GLImpactService } from "../../../../utils/glImpactService";

const normalizeOptionalId = (value: unknown) => {
    if (value === null || value === undefined || value === "") {
        return null;
    }
    return Number(value);
};

const PurchaseReturnController = {
    createPurchaseReturn: asyncHandler(async (req: CustomRequest, res: Response) => {
        const transaction = await sequelize.transaction();
        try {
            let header = req.body.header;
            let lineItems = req.body.lineItems;

            if (typeof header === "string") {
                header = JSON.parse(header);
            }
            if (typeof lineItems === "string") {
                lineItems = JSON.parse(lineItems);
            }

            if (!header || !Array.isArray(lineItems) || lineItems.length === 0) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Header and at least one line item are required");
            }

            const company = await findCompanyForUser(req.user);
            const companyId = company?.id;
            const user_id = req.user?.id;

            if (!companyId || !user_id) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User authentication required");
            }

            const returnDate = header.returnDate ? new Date(header.returnDate) : null;
            const status = normalizePurchaseReturnStatus(header.status, "DRAFT");

            const headerPayload: any = {
                returnNumber: String(header.returnNumber || "").trim(),
                vendorId: Number(header.vendorId),
                purchaseOrderHeaderId: normalizeOptionalId(header.purchaseOrderHeaderId),
                purchaseInvoiceHeaderId: normalizeOptionalId(header.purchaseInvoiceHeaderId),
                grnHeaderId: normalizeOptionalId(header.grnHeaderId),
                returnDate,
                status,
                reason: header.reason || null,
                remarks: header.remarks || null,
                companyId,
                user_id,
            };

            if (!headerPayload.returnNumber) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("returnNumber is required");
            }
            if (!headerPayload.vendorId) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("vendorId is required");
            }
            if (!headerPayload.returnDate || Number.isNaN(headerPayload.returnDate.getTime())) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid returnDate is required");
            }

            const createdHeader = await PurchaseReturnHeader.create(headerPayload, { transaction });
            const createdLineItems: any[] = [];

            for (let index = 0; index < lineItems.length; index++) {
                const lineItem = lineItems[index];
                const returnQty = Number(lineItem.returnQty);
                const rejectedQty = lineItem.rejectedQty !== undefined ? Number(lineItem.rejectedQty) : 0;
                const damagedQty = lineItem.damagedQty !== undefined ? Number(lineItem.damagedQty) : 0;
                const unitPrice = Number(lineItem.unitPrice);

                const linePayload: any = {
                    returnHeaderId: createdHeader.id,
                    grnLineId: normalizeOptionalId(lineItem.grnLineId),
                    itemId: Number(lineItem.itemId),
                    batchNo: lineItem.batchNo || null,
                    returnQty,
                    rejectedQty,
                    damagedQty,
                    unitPrice,
                    reason: lineItem.reason || null,
                    remarks: lineItem.remarks || null,
                };

                if (!linePayload.itemId) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`itemId is required in line item ${index + 1}`);
                }
                if (!linePayload.returnQty || linePayload.returnQty <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`returnQty must be greater than zero in line item ${index + 1}`);
                }
                if (linePayload.unitPrice < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`unitPrice cannot be negative in line item ${index + 1}`);
                }

                const createdLine = await PurchaseReturnLine.create(linePayload, { transaction });
                createdLineItems.push(createdLine);
            }

            await transaction.commit();
            res.status(StatusCodes.CREATED).json({
                success: true,
                message: "Purchase return created successfully",
                result: {
                    header: createdHeader,
                    lineItems: createdLineItems,
                },
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }),

    getAllPurchaseReturns: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;

        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const { page = 1, limit = 10, search, status } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const whereClause: any = { companyId };

        if (search) {
            whereClause[Op.or] = [
                { returnNumber: { [Op.like]: `%${search}%` } },
                { reason: { [Op.like]: `%${search}%` } },
                { remarks: { [Op.like]: `%${search}%` } },
            ];
        }
        if (status) {
            whereClause.status = status;
        }

        const { rows: returns, count: total } = await PurchaseReturnHeader.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: PurchaseInvoiceHeader,
                    as: "purchaseInvoiceHeader",
                    attributes: ["id", "invoiceNumber"],
                    required: false,
                },
                {
                    model: PurchaseOrder,
                    as: "purchaseOrderHeader",
                    attributes: ["id", "purchaseNo"],
                    required: false,
                },
                {
                    model: VendorDetails,
                    as: "vendor",
                    attributes: ["id", "vendor_name"],
                    required: false,
                },
                {
                    model: GRN,
                    as: "grnHeader",
                    attributes: ["id", "grnNo"],
                    required: false,
                },
            ],
            offset,
            limit: Number(limit),
            order: [["createdAt", "DESC"]],
        });

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Purchase returns fetched successfully",
            result: returns,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }),

    getPurchaseReturnById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;

        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const purchaseReturn = await PurchaseReturnHeader.findOne({
            where: { id: Number(id), companyId },
            include: [
                {
                    model: PurchaseInvoiceHeader,
                    as: "purchaseInvoiceHeader",
                    attributes: ["id", "invoiceNumber"],
                    required: false,
                },
                {
                    model: PurchaseOrder,
                    as: "purchaseOrderHeader",
                    attributes: ["id", "purchaseNo"],
                    required: false,
                },
                {
                    model: VendorDetails,
                    as: "vendor",
                    attributes: ["id", "vendor_name"],
                    required: false,
                },
                {
                    model: GRN,
                    as: "grnHeader",
                    attributes: ["id", "grnNo"],
                    required: false,
                },
                {
                    model: PurchaseReturnLine,
                    as: "purchaseReturnLines",
                    required: false,
                    include: [
                        {
                            model: ItemMaster,
                            as: "item",
                            attributes: ["id", "item_code", "item_name", "item_desc"],
                        },
                    ],
                },
            ],
        });

        if (!purchaseReturn) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Purchase return not found");
        }

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Purchase return fetched successfully",
            result: purchaseReturn,
        });
    }),

    updatePurchaseReturn: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const transaction = await sequelize.transaction();

        try {
            let header = req.body.header;
            let lineItems = req.body.lineItems;

            if (typeof header === "string") {
                header = JSON.parse(header);
            }
            if (typeof lineItems === "string") {
                lineItems = JSON.parse(lineItems);
            }

            if (!header || !Array.isArray(lineItems) || lineItems.length === 0) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Header and at least one line item are required");
            }

            const company = await findCompanyForUser(req.user);
            const companyId = company?.id;
            const user_id = req.user?.id;

            if (!companyId || !user_id) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User authentication required");
            }

            const existingReturn = await PurchaseReturnHeader.findOne({
                where: { id: Number(id), companyId },
                transaction,
            });
            if (!existingReturn) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Purchase return not found");
            }

            const returnDate = header.returnDate ? new Date(header.returnDate) : existingReturn.returnDate;
            const status = normalizePurchaseReturnStatus(header.status || existingReturn.status, existingReturn.status || "DRAFT");

            const headerPayload: any = {
                returnNumber: String(header.returnNumber || existingReturn.returnNumber).trim(),
                vendorId: Number(header.vendorId || existingReturn.vendorId),
                purchaseOrderHeaderId: normalizeOptionalId(header.purchaseOrderHeaderId),
                purchaseInvoiceHeaderId: normalizeOptionalId(header.purchaseInvoiceHeaderId),
                grnHeaderId: normalizeOptionalId(header.grnHeaderId),
                returnDate,
                status,
                reason: header.hasOwnProperty("reason") ? header.reason : existingReturn.reason,
                remarks: header.hasOwnProperty("remarks") ? header.remarks : existingReturn.remarks,
                companyId,
                user_id,
            };

            if (!headerPayload.returnNumber) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("returnNumber is required");
            }
            if (!headerPayload.vendorId) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("vendorId is required");
            }
            if (!headerPayload.returnDate || Number.isNaN(headerPayload.returnDate.getTime())) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid returnDate is required");
            }

            await existingReturn.update(headerPayload, { transaction });
            await PurchaseReturnLine.destroy({ where: { returnHeaderId: existingReturn.id }, transaction });

            const updatedLineItems: any[] = [];
            for (let index = 0; index < lineItems.length; index++) {
                const lineItem = lineItems[index];
                const returnQty = Number(lineItem.returnQty);
                const rejectedQty = lineItem.rejectedQty !== undefined ? Number(lineItem.rejectedQty) : 0;
                const damagedQty = lineItem.damagedQty !== undefined ? Number(lineItem.damagedQty) : 0;
                const unitPrice = Number(lineItem.unitPrice);

                const linePayload: any = {
                    returnHeaderId: existingReturn.id,
                    grnLineId: normalizeOptionalId(lineItem.grnLineId),
                    itemId: Number(lineItem.itemId),
                    batchNo: lineItem.batchNo || null,
                    returnQty,
                    rejectedQty,
                    damagedQty,
                    unitPrice,
                    reason: lineItem.reason || null,
                    remarks: lineItem.remarks || null,
                };

                if (!linePayload.itemId) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`itemId is required in line item ${index + 1}`);
                }
                if (!linePayload.returnQty || linePayload.returnQty <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`returnQty must be greater than zero in line item ${index + 1}`);
                }
                if (linePayload.unitPrice < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`unitPrice cannot be negative in line item ${index + 1}`);
                }

                const createdLine = await PurchaseReturnLine.create(linePayload, { transaction });
                updatedLineItems.push(createdLine);
            }

            await transaction.commit();
            res.status(StatusCodes.OK).json({
                success: true,
                message: "Purchase return updated successfully",
                result: {
                    header: existingReturn,
                    lineItems: updatedLineItems,
                },
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }),

    updatePurchaseReturnStatus: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { status } = req.body;

        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;

        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const purchaseReturn = await PurchaseReturnHeader.findOne({ where: { id: Number(id), companyId } });
        if (!purchaseReturn) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Purchase return not found");
        }
        if (!status) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("status is required");
        }

        const previousStatus = purchaseReturn.status;
        const normalizedStatus = normalizePurchaseReturnStatus(status);

        if (previousStatus === normalizedStatus) {
            res.status(StatusCodes.OK).json({
                success: true,
                message: `Purchase return status is already set to ${status}`,
                result: purchaseReturn,
            });
            return;
        }

        await sequelize.transaction(async (t) => {
            await purchaseReturn.update({
                status: normalizedStatus as "DRAFT" | "APPROVED" | "RETURNED" | "CANCELLED"
            }, { transaction: t });

            if (normalizedStatus === "RETURNED" || normalizedStatus === "APPROVED") {
                // 1. Deduct stock balances for returned inventory
                await InventoryService.reduceStockFromPurchaseReturn(
                    purchaseReturn.id,
                    companyId,
                    user_id,
                    t
                );

                // 2. Post GL Entry (Debit Accounts Payable / Vendor Credit, Credit Inventory Asset)
                await GLImpactService.processPurchaseReturnPosting(
                    purchaseReturn.id,
                    companyId,
                    user_id,
                    undefined,
                    3, // Accounts Payable Vendor Account ID
                    t
                );
            }
        });

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Purchase return status updated successfully",
            result: purchaseReturn,
        });
    }),

    deletePurchaseReturn: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;

        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const purchaseReturn = await PurchaseReturnHeader.findOne({ where: { id: Number(id), companyId } });
        if (!purchaseReturn) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Purchase return not found");
        }

        await PurchaseReturnLine.destroy({ where: { returnHeaderId: purchaseReturn.id } });
        await purchaseReturn.destroy();

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Purchase return deleted successfully",
            result: null,
        });
    }),
};

export default PurchaseReturnController;

