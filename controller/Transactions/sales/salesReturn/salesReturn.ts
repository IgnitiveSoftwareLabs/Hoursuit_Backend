import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import { findCompanyForUser } from "../../../../utils/findCompanyForUser";
import { normalizeOptionalNumber } from "../../../../utils/normalizeOptionalNumber";
import { CustomRequest } from "../../../../typeRequest/customReq";
import sequelize from "../../../../dbconfig/dbconfig";
import { SalesReturnHeader, SalesReturnLine } from "../../../../modals/Transactions/sales/salesReturn";
import { SalesOrderHeader } from "../../../../modals/Transactions/sales/salesOrder";
import { DeliveryChallanHeader } from "../../../../modals/Transactions/sales/deliveryChallan";
import Customer from "../../../../modals/masters/customer/customer";
import ItemMaster from "../../../../modals/masters/items/itemMaster";
import InventoryCount from "../../../../modals/inventory/inventory";

const calculateLineTotal = (quantity: number, unitPrice: number) => Number((quantity * unitPrice).toFixed(2));

const getInventoryDimensions = async (header: any, transaction: any) => {
    let uomId = null;
    let warehouseId = null;
    if (header.salesOrderHeaderId) {
        const order = await SalesOrderHeader.findOne({ where: { id: Number(header.salesOrderHeaderId) }, transaction });
        if (order) {
            uomId = order.uomId;
            warehouseId = order.warehouseId;
        }
    }
    if (uomId === null && header.deliveryChallanHeaderId) {
        const challan = await DeliveryChallanHeader.findOne({ where: { id: Number(header.deliveryChallanHeaderId) }, transaction });
        if (challan) {
            uomId = challan.uom_id;
            warehouseId = challan.warehouseId;
        }
    }
    return { uomId: normalizeOptionalNumber(uomId) ?? 0, warehouseId: normalizeOptionalNumber(warehouseId) ?? null };
};

const processReturnInventory = async (
    header: any,
    lineItems: any[],
    companyId: number,
    user_id: number,
    transaction: any,
    operation: "ADD" | "SUBTRACT"
) => {
    const dimensions = await getInventoryDimensions(header, transaction);

    if (operation === "SUBTRACT") {
        const headerData = {
            work_order: header.returnNumber,
            customer_id: Number(header.customerId),
            CompanyId: companyId,
            user_id,
        };

        const adaptedLines = lineItems.map((line) => ({
            item_id: Number(line.itemId),
            qty_delivered: Number(line.returnQty),
            rate: Number(line.unitPrice || 0),
            amount: calculateLineTotal(Number(line.returnQty), Number(line.unitPrice || 0)),
            lot_number: line.batchNo || "GENERAL",
            warehouseId: dimensions.warehouseId,
            godownId: null,
            stack: null as any,
            location: header.returnNumber || "SALES_RETURN",
            uom_id: dimensions.uomId,
        }));

        await InventoryCount.reverseInventoryForLineItems(adaptedLines, headerData, "ADD", transaction);
        return;
    }

    for (const line of lineItems) {
        const qty = Number(line.returnQty);
        const lineTotal = calculateLineTotal(qty, Number(line.unitPrice || 0));

        await InventoryCount.updateInventory(
            {
                work_order: header.returnNumber,
                item_id: Number(line.itemId),
                qty,
                uom_id: dimensions.uomId,
                rate: Number(line.unitPrice || 0),
                amount: lineTotal,
                location: header.returnNumber || "SALES_RETURN",
                warehouseId: dimensions.warehouseId,
                godownId: null,
                stack: null as any,
                work_category_id: null,
                customer_id: Number(header.customerId),
                lot_number: line.batchNo || null,
                CompanyId: companyId,
                user_id,
                operation,
            },
            transaction
        );
    }
};

const SalesReturnController = {
    createSalesReturn: asyncHandler(async (req: CustomRequest, res: Response) => {
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
            const headerPayload: any = {
                returnNumber: String(header.returnNumber || "").trim(),
                customerId: Number(header.customerId),
                salesOrderHeaderId: normalizeOptionalNumber(header.salesOrderHeaderId),
                deliveryChallanHeaderId: normalizeOptionalNumber(header.deliveryChallanHeaderId),
                returnDate,
                status: header.status || "DRAFT",
                returnReason: header.returnReason || null,
                remarks: header.remarks || null,
                receivedBy: normalizeOptionalNumber(header.receivedBy),
                approvedBy: normalizeOptionalNumber(header.approvedBy),
                user_id,
                companyId,
            };

            if (!headerPayload.returnNumber) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("returnNumber is required");
            }
            if (!headerPayload.customerId) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("customerId is required");
            }
            if (!headerPayload.returnDate || Number.isNaN(headerPayload.returnDate.getTime())) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid returnDate is required");
            }

            const createdHeader = await SalesReturnHeader.create(headerPayload, { transaction });
            const createdLineItems: any[] = [];

            for (let index = 0; index < lineItems.length; index++) {
                const item = lineItems[index];
                const returnQty = Number(item.returnQty);
                const approvedQty = normalizeOptionalNumber(item.approvedQty) ?? 0;
                const rejectedQty = normalizeOptionalNumber(item.rejectedQty) ?? 0;
                const damagedQty = normalizeOptionalNumber(item.damagedQty) ?? 0;
                const unitPrice = normalizeOptionalNumber(item.unitPrice) ?? 0;
                const lineTotal = calculateLineTotal(returnQty, unitPrice);

                const linePayload: any = {
                    salesReturnHeaderId: createdHeader.id,
                    salesOrderLineId: normalizeOptionalNumber(item.salesOrderLineId),
                    deliveryChallanLineId: normalizeOptionalNumber(item.deliveryChallanLineId),
                    itemId: Number(item.itemId),
                    batchNo: item.batchNo || null,
                    returnQty,
                    approvedQty,
                    rejectedQty,
                    damagedQty,
                    unitPrice,
                    lineTotal,
                    reason: item.reason || null,
                    status: item.status || "PENDING",
                    remarks: item.remarks || null,
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

                const createdLine = await SalesReturnLine.create(linePayload, { transaction });
                createdLineItems.push(createdLine);
            }

            if (createdHeader.status !== "DRAFT" && createdHeader.status !== "CANCELLED") {
                await processReturnInventory(createdHeader, createdLineItems, companyId, user_id, transaction, "ADD");
            }

            await transaction.commit();
            res.status(StatusCodes.CREATED).json({
                success: true,
                message: "Sales return created successfully",
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

    getAllSalesReturns: asyncHandler(async (req: CustomRequest, res: Response) => {
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
                { returnReason: { [Op.like]: `%${search}%` } },
                { remarks: { [Op.like]: `%${search}%` } },
            ];
        }
        if (status) {
            whereClause.status = status;
        }

        const { rows: returns, count: total } = await SalesReturnHeader.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Customer,
                    as: "customer",
                    attributes: ["id", "name"],
                    required: false,
                },
            ],
            offset,
            limit: Number(limit),
            order: [["createdAt", "DESC"]],
        });

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Sales returns fetched successfully",
            result: returns,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }),

    getSalesReturnById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;
        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const salesReturn = await SalesReturnHeader.findOne({
            where: { id: Number(id), companyId },
            include: [
                {
                    model: Customer,
                    as: "customer",
                    attributes: ["id", "name"],
                    required: false,
                },
                {
                    model: SalesReturnLine,
                    as: "lineItems",
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

        if (!salesReturn) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Sales return not found");
        }

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Sales return fetched successfully",
            result: salesReturn,
        });
    }),

    updateSalesReturn: asyncHandler(async (req: CustomRequest, res: Response) => {
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

            if (!header) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Header is required");
            }

            const company = await findCompanyForUser(req.user);
            const companyId = company?.id;
            const user_id = req.user?.id;
            if (!companyId || !user_id) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User authentication required");
            }

            const existingReturn = await SalesReturnHeader.findOne({
                where: { id: Number(id), companyId },
                transaction,
            });
            if (!existingReturn) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Sales return not found");
            }

            const returnDate = header.returnDate ? new Date(header.returnDate) : existingReturn.returnDate;
            const status = header.status || existingReturn.status;
            const headerPayload: any = {
                returnNumber: String(header.returnNumber || existingReturn.returnNumber).trim(),
                customerId: Number(header.customerId || existingReturn.customerId),
                salesOrderHeaderId: normalizeOptionalNumber(header.salesOrderHeaderId) ?? existingReturn.salesOrderHeaderId,
                deliveryChallanHeaderId: normalizeOptionalNumber(header.deliveryChallanHeaderId) ?? existingReturn.deliveryChallanHeaderId,
                returnDate,
                status,
                returnReason: header.hasOwnProperty("returnReason") ? header.returnReason : existingReturn.returnReason,
                remarks: header.hasOwnProperty("remarks") ? header.remarks : existingReturn.remarks,
                receivedBy: normalizeOptionalNumber(header.receivedBy) ?? existingReturn.receivedBy,
                approvedBy: normalizeOptionalNumber(header.approvedBy) ?? existingReturn.approvedBy,
                user_id,
                companyId,
            };

            if (!headerPayload.returnNumber) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("returnNumber is required");
            }
            if (!headerPayload.customerId) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("customerId is required");
            }
            if (!headerPayload.returnDate || Number.isNaN(headerPayload.returnDate.getTime())) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid returnDate is required");
            }

            const lineUpdateAllowed = ["DRAFT"].includes(existingReturn.status);
            if (lineItems && Array.isArray(lineItems) && lineItems.length > 0 && !lineUpdateAllowed) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Cannot update line items after return has been processed");
            }

            await existingReturn.update(headerPayload, { transaction });

            let updatedLineItems: any[] = [];
            if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
                await SalesReturnLine.destroy({ where: { salesReturnHeaderId: existingReturn.id }, transaction });

                for (let index = 0; index < lineItems.length; index++) {
                    const item = lineItems[index];
                    const returnQty = Number(item.returnQty);
                    const approvedQty = normalizeOptionalNumber(item.approvedQty) ?? 0;
                    const rejectedQty = normalizeOptionalNumber(item.rejectedQty) ?? 0;
                    const damagedQty = normalizeOptionalNumber(item.damagedQty) ?? 0;
                    const unitPrice = normalizeOptionalNumber(item.unitPrice) ?? 0;
                    const lineTotal = calculateLineTotal(returnQty, unitPrice);

                    const linePayload: any = {
                        salesReturnHeaderId: existingReturn.id,
                        salesOrderLineId: normalizeOptionalNumber(item.salesOrderLineId),
                        deliveryChallanLineId: normalizeOptionalNumber(item.deliveryChallanLineId),
                        itemId: Number(item.itemId),
                        batchNo: item.batchNo || null,
                        returnQty,
                        approvedQty,
                        rejectedQty,
                        damagedQty,
                        unitPrice,
                        lineTotal,
                        reason: item.reason || null,
                        status: item.status || "PENDING",
                        remarks: item.remarks || null,
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

                    const createdLine = await SalesReturnLine.create(linePayload, { transaction });
                    updatedLineItems.push(createdLine);
                }
            }

            const wasProcessed = existingReturn.status !== "DRAFT" && existingReturn.status !== "CANCELLED";
            const willProcess = status !== "DRAFT" && status !== "CANCELLED";
            const lineItemsToProcess = updatedLineItems.length > 0 ? updatedLineItems : await SalesReturnLine.findAll({ where: { salesReturnHeaderId: existingReturn.id }, transaction });

            if (!wasProcessed && willProcess) {
                await processReturnInventory(existingReturn, lineItemsToProcess, companyId, user_id, transaction, "ADD");
            }
            if (wasProcessed && status === "CANCELLED") {
                await processReturnInventory(existingReturn, lineItemsToProcess, companyId, user_id, transaction, "SUBTRACT");
            }

            await transaction.commit();
            res.status(StatusCodes.OK).json({
                success: true,
                message: "Sales return updated successfully",
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

    updateSalesReturnStatus: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { status } = req.body;

        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;
        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const existingReturn = await SalesReturnHeader.findOne({ where: { id: Number(id), companyId } });
        if (!existingReturn) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Sales return not found");
        }
        if (!status) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("status is required");
        }

        const transaction = await sequelize.transaction();
        try {
            const wasProcessed = existingReturn.status !== "DRAFT" && existingReturn.status !== "CANCELLED";
            const willProcess = status !== "DRAFT" && status !== "CANCELLED";

            await existingReturn.update({ status }, { transaction });
            const lineItems = await SalesReturnLine.findAll({ where: { salesReturnHeaderId: existingReturn.id }, transaction });

            if (!wasProcessed && willProcess) {
                await processReturnInventory(existingReturn, lineItems, companyId, user_id, transaction, "ADD");
            }
            if (wasProcessed && status === "CANCELLED") {
                await processReturnInventory(existingReturn, lineItems, companyId, user_id, transaction, "SUBTRACT");
            }

            await transaction.commit();
            res.status(StatusCodes.OK).json({
                success: true,
                message: "Sales return status updated successfully",
                result: existingReturn,
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }),

    deleteSalesReturn: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;
        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const existingReturn = await SalesReturnHeader.findOne({ where: { id: Number(id), companyId } });
        if (!existingReturn) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Sales return not found");
        }
        if (existingReturn.status !== "DRAFT") {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Cannot delete a sales return once it has been processed");
        }

        await SalesReturnLine.destroy({ where: { salesReturnHeaderId: existingReturn.id } });
        await existingReturn.destroy();

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Sales return deleted successfully",
            result: null,
        });
    }),
};

export default SalesReturnController;
