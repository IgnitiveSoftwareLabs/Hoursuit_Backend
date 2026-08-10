import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import { normalizeOptionalNumber } from "../../../../utils/normalizeOptionalNumber";
import { findCompanyForUser } from "../../../../utils/findCompanyForUser";
import ItemMaster from "../../../../modals/masters/items/itemMaster";
import Customer from "../../../../modals/masters/customer/customer";
import { CustomRequest } from "../../../../typeRequest/customReq";
import { 
    SalesOrderHeader, 
    SalesOrderLine 
} from "../../../../modals/Transactions/sales/salesOrder";
import sequelize from "../../../../dbconfig/dbconfig";

// Helper function to calculate line totals
const calculateLineTotals = (quantity: number, unitPrice: number, discountPercent: number, taxPercent: number) => {
    const baseAmount = quantity * unitPrice;
    const discountAmount = Number(((baseAmount * discountPercent) / 100).toFixed(2));
    const taxableAmount = Number((baseAmount - discountAmount).toFixed(2));
    const taxAmount = Number(((taxableAmount * taxPercent) / 100).toFixed(2));
    const lineTotal = Number((taxableAmount + taxAmount).toFixed(2));
    return { discountAmount, taxAmount, lineTotal };
};

const SalesOrderController = {
    // Create a new sales order
    createSalesOrder: asyncHandler(async (req: CustomRequest, res: Response) => {
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

            const orderDate = header.orderDate ? new Date(header.orderDate) : null;
            const expectedDeliveryDate = header.expectedDeliveryDate ? new Date(header.expectedDeliveryDate) : null;

            const headerPayload: any = {
                orderNumber: String(header.orderNumber || "").trim(),
                customerId: Number(header.customerId),
                uomId: Number(header.uomId),
                transportationModeId: Number(header.transportationModeId),
                warehouseId: Number(header.warehouseId),
                godownId: normalizeOptionalNumber(header.godownId),
                stackId: normalizeOptionalNumber(header.stackId),
                subsidiaryId: Number(header.subsidiaryId),
                cityId: Number(header.cityId),
                orderDate,
                expectedDeliveryDate,
                customerPO: header.customerPO || null,
                referenceNumber: header.referenceNumber || null,
                status: header.status || "DRAFT",
                shippingAmount: normalizeOptionalNumber(header.shippingAmount) ?? 0,
                remarks: header.remarks || null,
                shippingAddress: header.shippingAddress || null,
                billingAddress: header.billingAddress || null,
                companyId,
                user_id,
            };

            if (!headerPayload.orderNumber) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("orderNumber is required");
            }
            if (!headerPayload.customerId) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("customerId is required");
            }
            if (!headerPayload.uomId) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("uomId is required");
            }
            if (!headerPayload.transportationModeId) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("transportationModeId is required");
            }
            if (!headerPayload.warehouseId) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("warehouseId is required");
            }
            if (!headerPayload.subsidiaryId) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("subsidiaryId is required");
            }
            if (!headerPayload.cityId) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("cityId is required");
            }
            if (!headerPayload.orderDate || Number.isNaN(headerPayload.orderDate.getTime())) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid orderDate is required");
            }

            let subtotal = 0;
            let discountAmount = 0;
            let taxAmount = 0;
            const createdHeader = await SalesOrderHeader.create(headerPayload, { transaction });
            const createdLineItems: any[] = [];

            for (let index = 0; index < lineItems.length; index++) {
                const item = lineItems[index];
                const orderedQty = Number(item.orderedQty);
                const unitPrice = Number(item.unitPrice);
                const discountPercent = normalizeOptionalNumber(item.discountPercent) ?? 0;
                const taxPercent = normalizeOptionalNumber(item.taxPercent) ?? 0;
                const { discountAmount: lineDiscount, taxAmount: lineTax, lineTotal } = calculateLineTotals(orderedQty, unitPrice, discountPercent, taxPercent);

                const linePayload: any = {
                    salesOrderHeaderId: createdHeader.id,
                    itemId: Number(item.itemId),
                    orderedQty,
                    dispatchedQty: 0,
                    pendingQty: orderedQty,
                    unitPrice,
                    discountPercent,
                    discountAmount: lineDiscount,
                    taxPercent,
                    taxAmount: lineTax,
                    lineTotal,
                    remarks: item.remarks || null,
                };

                if (!linePayload.itemId) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`itemId is required in line item ${index + 1}`);
                }
                if (!linePayload.orderedQty || linePayload.orderedQty <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`orderedQty must be greater than zero in line item ${index + 1}`);
                }
                if (linePayload.unitPrice < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`unitPrice cannot be negative in line item ${index + 1}`);
                }

                const createdLine = await SalesOrderLine.create(linePayload, { transaction });
                createdLineItems.push(createdLine);
                subtotal += orderedQty * unitPrice;
                discountAmount += lineDiscount;
                taxAmount += lineTax;
            }

            const totalAmount = Number((subtotal - discountAmount + taxAmount + createdHeader.shippingAmount).toFixed(2));
            await createdHeader.update({
                subtotal: Number(subtotal.toFixed(2)),
                discountAmount: Number(discountAmount.toFixed(2)),
                taxAmount: Number(taxAmount.toFixed(2)),
                totalAmount,
            }, { transaction });

            await transaction.commit();
            res.status(StatusCodes.CREATED).json({
                success: true,
                message: "Sales order created successfully",
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

    // Fetch all sales orders with pagination, search, and status filter
    getAllSalesOrders: asyncHandler(async (req: CustomRequest, res: Response) => {
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
                { orderNumber: { [Op.like]: `%${search}%` } },
                { customerPO: { [Op.like]: `%${search}%` } },
            ];
        }
        if (status) {
            whereClause.status = status;
        }

        const { rows: orders, count: total } = await SalesOrderHeader.findAndCountAll({
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
            message: "Sales orders fetched successfully",
            result: orders,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }),

    // Fetch a single sales order by ID
    getSalesOrderById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;
        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const order = await SalesOrderHeader.findOne({
            where: { id: Number(id), companyId },
            include: [
                {
                    model: Customer,
                    as: "customer",
                    attributes: ["id", "name"],
                    required: false,
                },
                {
                    model: SalesOrderLine,
                    as: "salesOrderLines",
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

        if (!order) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Sales order not found");
        }

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Sales order fetched successfully",
            result: order,
        });
    }),

    // Update an existing sales order
    updateSalesOrder: asyncHandler(async (req: CustomRequest, res: Response) => {
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

            const existingOrder = await SalesOrderHeader.findOne({
                where: { id: Number(id), companyId },
                transaction,
            });
            if (!existingOrder) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Sales order not found");
            }

            const orderDate = header.orderDate ? new Date(header.orderDate) : existingOrder.orderDate;
            const expectedDeliveryDate = header.expectedDeliveryDate !== undefined ? (header.expectedDeliveryDate ? new Date(header.expectedDeliveryDate) : null) : existingOrder.expectedDeliveryDate;
            const status = header.status || existingOrder.status;

            const headerPayload: any = {
                orderNumber: String(header.orderNumber || existingOrder.orderNumber).trim(),
                customerId: Number(header.customerId || existingOrder.customerId),
                uomId: Number(header.uomId || existingOrder.uomId),
                transportationModeId: Number(header.transportationModeId || existingOrder.transportationModeId),
                warehouseId: Number(header.warehouseId || existingOrder.warehouseId),
                subsidiaryId: Number(header.subsidiaryId || existingOrder.subsidiaryId),
                cityId: Number(header.cityId || existingOrder.cityId),
                orderDate,
                expectedDeliveryDate,
                customerPO: header.hasOwnProperty("customerPO") ? header.customerPO : existingOrder.customerPO,
                referenceNumber: header.hasOwnProperty("referenceNumber") ? header.referenceNumber : existingOrder.referenceNumber,
                status,
                shippingAmount: normalizeOptionalNumber(header.shippingAmount) ?? existingOrder.shippingAmount,
                remarks: header.hasOwnProperty("remarks") ? header.remarks : existingOrder.remarks,
                shippingAddress: header.hasOwnProperty("shippingAddress") ? header.shippingAddress : existingOrder.shippingAddress,
                billingAddress: header.hasOwnProperty("billingAddress") ? header.billingAddress : existingOrder.billingAddress,
                companyId,
                user_id,
            };

            if (!headerPayload.orderNumber) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("orderNumber is required");
            }
            if (!headerPayload.customerId) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("customerId is required");
            }
            if (!headerPayload.orderDate || Number.isNaN(headerPayload.orderDate.getTime())) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid orderDate is required");
            }

            const lineUpdateAllowed = ["DRAFT", "CONFIRMED"].includes(existingOrder.status);
            if (lineItems && Array.isArray(lineItems) && lineItems.length > 0 && !lineUpdateAllowed) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Cannot update line items after dispatch has started");
            }

            await existingOrder.update(headerPayload, { transaction });

            let updatedLineItems: any[] = [];
            if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
                await SalesOrderLine.destroy({ where: { salesOrderHeaderId: existingOrder.id }, transaction });

                let subtotal = 0;
                let discountAmount = 0;
                let taxAmount = 0;

                for (let index = 0; index < lineItems.length; index++) {
                    const item = lineItems[index];
                    const orderedQty = Number(item.orderedQty);
                    const unitPrice = Number(item.unitPrice);
                    const discountPercent = normalizeOptionalNumber(item.discountPercent) ?? 0;
                    const taxPercent = normalizeOptionalNumber(item.taxPercent) ?? 0;
                    const { discountAmount: lineDiscount, taxAmount: lineTax, lineTotal } = calculateLineTotals(orderedQty, unitPrice, discountPercent, taxPercent);

                    const linePayload: any = {
                        salesOrderHeaderId: existingOrder.id,
                        itemId: Number(item.itemId),
                        orderedQty,
                        dispatchedQty: 0,
                        pendingQty: orderedQty,
                        unitPrice,
                        discountPercent,
                        discountAmount: lineDiscount,
                        taxPercent,
                        taxAmount: lineTax,
                        lineTotal,
                        remarks: item.remarks || null,
                    };

                    if (!linePayload.itemId) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`itemId is required in line item ${index + 1}`);
                    }
                    if (!linePayload.orderedQty || linePayload.orderedQty <= 0) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`orderedQty must be greater than zero in line item ${index + 1}`);
                    }
                    if (linePayload.unitPrice < 0) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`unitPrice cannot be negative in line item ${index + 1}`);
                    }

                    const createdLine = await SalesOrderLine.create(linePayload, { transaction });
                    updatedLineItems.push(createdLine);
                    subtotal += orderedQty * unitPrice;
                    discountAmount += lineDiscount;
                    taxAmount += lineTax;
                }

                const totalAmount = Number((subtotal - discountAmount + taxAmount + existingOrder.shippingAmount).toFixed(2));
                await existingOrder.update({
                    subtotal: Number(subtotal.toFixed(2)),
                    discountAmount: Number(discountAmount.toFixed(2)),
                    taxAmount: Number(taxAmount.toFixed(2)),
                    totalAmount,
                }, { transaction });
            }

            await transaction.commit();
            res.status(StatusCodes.OK).json({
                success: true,
                message: "Sales order updated successfully",
                result: {
                    header: existingOrder,
                    lineItems: updatedLineItems,
                },
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }),

    // Update sales order status
    updateSalesOrderStatus: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { status } = req.body;

        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;
        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const order = await SalesOrderHeader.findOne({ where: { id: Number(id), companyId } });
        if (!order) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Sales order not found");
        }
        if (!status) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("status is required");
        }

        await order.update({ status });
        res.status(StatusCodes.OK).json({
            success: true,
            message: "Sales order status updated successfully",
            result: order,
        });
    }),

    // Delete a sales order
    deleteSalesOrder: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;
        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const order = await SalesOrderHeader.findOne({ where: { id: Number(id), companyId } });
        if (!order) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Sales order not found");
        }
        if (["PARTIAL_DISPATCHED", "DISPATCHED", "COMPLETED"].includes(order.status)) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Cannot delete a sales order that has been dispatched or completed");
        }

        await SalesOrderLine.destroy({ where: { salesOrderHeaderId: order.id } });
        await order.destroy();

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Sales order deleted successfully",
            result: null,
        });
    }),
};

export default SalesOrderController;