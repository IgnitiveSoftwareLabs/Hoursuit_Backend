import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import { normalizeOptionalNumber } from "../../../../utils/normalizeOptionalNumber";
import { findCompanyForUser } from "../../../../utils/findCompanyForUser";
import ItemMaster from "../../../../modals/masters/items/itemMaster";
import Customer from "../../../../modals/masters/customer/customer";
import InventoryCount from "../../../../modals/inventory/inventory";
import { CustomRequest } from "../../../../typeRequest/customReq";
import { 
    DeliveryChallanHeader, 
    DeliveryChallanLine 
} from "../../../../modals/Transactions/sales/deliveryChallan";
import { 
    SalesOrderHeader, 
    SalesOrderLine 
} from "../../../../modals/Transactions/sales/salesOrder";
import sequelize from "../../../../dbconfig/dbconfig";

// Calculate line total with proper rounding
const calculateLineTotal = (quantity: number, unitPrice: number) => {
    return Number((quantity * unitPrice).toFixed(2));
};

// Process inventory dispatch for a delivery challan
const processDispatch = async (
    header: any,
    lineItems: any[],
    companyId: number,
    user_id: number,
    transaction: any
) => {
    for (const line of lineItems) {
        const dispatchQty = Number(line.dispatchQty);
        const orderLine = await SalesOrderLine.findOne({
            where: { id: Number(line.salesOrderLineId), salesOrderHeaderId: header.salesOrderHeaderId },
            transaction,
        });
        if (!orderLine) {
            throw new Error(`Sales order line not found for line item ${line.salesOrderLineId}`);
        }
        if (dispatchQty <= 0) {
            throw new Error("dispatchQty must be greater than zero");
        }
        const pendingQty = Number(orderLine.pendingQty);
        if (dispatchQty > pendingQty) {
            throw new Error(`Cannot dispatch more than pending quantity for sales order line ${orderLine.id}`);
        }

        await InventoryCount.updateInventory(
            {
                work_order: header.challanNumber,
                item_id: Number(line.itemId),
                qty: dispatchQty,
                uom_id: normalizeOptionalNumber(header.uom_id) ?? 0,
                rate: Number(line.unitPrice),
                amount: Number(line.lineTotal),
                location: header.challanNumber || "DISPATCH",
                warehouseId: normalizeOptionalNumber(header.warehouseId),
                godownId: null,
                stack: null as any,
                work_category_id: null,
                customer_id: Number(header.customerId),
                lot_number: line.batchNo || null,
                CompanyId: companyId,
                user_id,
                operation: "SUBTRACT",
            },
            transaction
        );

        await orderLine.update(
            {
                dispatchedQty: Number(orderLine.dispatchedQty) + dispatchQty,
                pendingQty: Number(orderLine.orderedQty) - (Number(orderLine.dispatchedQty) + dispatchQty),
            },
            { transaction }
        );
    }
};

// Reverse inventory dispatch for a delivery challan (e.g., on cancellation)
const reverseDispatch = async (
    header: any,
    lineItems: any[],
    companyId: number,
    user_id: number,
    transaction: any
) => {
    const headerData = {
        work_order: header.challanNumber,
        customer_id: Number(header.customerId),
        CompanyId: companyId,
        user_id,
    };

    const adaptedLines = lineItems.map((line) => ({
        item_id: Number(line.itemId),
        qty_delivered: Number(line.dispatchQty),
        rate: Number(line.unitPrice),
        amount: Number(line.lineTotal),
        lot_number: line.batchNo || "GENERAL",
        warehouseId: normalizeOptionalNumber(header.warehouseId),
        godownId: null,
        stack: null as any,
        location: header.challanNumber || "DISPATCH",
        uom_id: normalizeOptionalNumber(header.uom_id) ?? 0,
    }));

    await InventoryCount.reverseInventoryForLineItems(adaptedLines, headerData, "SUBTRACT", transaction);

    for (const line of lineItems) {
        const dispatchQty = Number(line.dispatchQty);
        const orderLine = await SalesOrderLine.findOne({
            where: { id: Number(line.salesOrderLineId), salesOrderHeaderId: header.salesOrderHeaderId },
            transaction,
        });
        if (!orderLine) {
            throw new Error(`Sales order line not found for line item ${line.salesOrderLineId}`);
        }

        await orderLine.update(
            {
                dispatchedQty: Math.max(Number(orderLine.dispatchedQty) - dispatchQty, 0),
                pendingQty: Number(orderLine.orderedQty) - Math.max(Number(orderLine.dispatchedQty) - dispatchQty, 0),
            },
            { transaction }
        );
    }
};

const DeliveryChallanController = {
    // Create a new delivery challan
    createDeliveryChallan: asyncHandler(async (req: CustomRequest, res: Response) => {
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

            const challanDate = header.challanDate ? new Date(header.challanDate) : null;
            const dispatchDate = header.dispatchDate ? new Date(header.dispatchDate) : null;
            const deliveredDate = header.deliveredDate ? new Date(header.deliveredDate) : null;

            const headerPayload: any = {
                challanNumber: String(header.challanNumber || "").trim(),
                salesOrderHeaderId: Number(header.salesOrderHeaderId),
                customerId: Number(header.customerId),
                challanDate,
                vehicleNumber: header.vehicleNumber || null,
                transporterName: header.transporterName || null,
                driverName: header.driverName || null,
                driverPhone: header.driverPhone || null,
                dispatchDate,
                deliveredDate,
                transportationModeId: normalizeOptionalNumber(header.transportationModeId),
                warehouseId: normalizeOptionalNumber(header.warehouseId),
                subsidiaryId: normalizeOptionalNumber(header.subsidiaryId),
                cityId: normalizeOptionalNumber(header.cityId),
                uom_id: normalizeOptionalNumber(header.uom_id),
                status: header.status || "DRAFT",
                remarks: header.remarks || null,
                shippingAddress: header.shippingAddress || null,
                companyId,
                user_id,
            };

            if (!headerPayload.challanNumber) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("challanNumber is required");
            }
            if (!headerPayload.salesOrderHeaderId) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("salesOrderHeaderId is required");
            }
            if (!headerPayload.customerId) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("customerId is required");
            }
            if (!headerPayload.challanDate || Number.isNaN(headerPayload.challanDate.getTime())) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid challanDate is required");
            }

            const createdHeader = await DeliveryChallanHeader.create(headerPayload, { transaction });
            const createdLineItems: any[] = [];

            for (let index = 0; index < lineItems.length; index++) {
                const item = lineItems[index];
                const dispatchQty = Number(item.dispatchQty);
                const unitPrice = Number(item.unitPrice);
                const lineTotal = calculateLineTotal(dispatchQty, unitPrice);

                const linePayload: any = {
                    deliveryChallanHeaderId: createdHeader.id,
                    salesOrderLineId: Number(item.salesOrderLineId),
                    itemId: Number(item.itemId),
                    batchNo: item.batchNo || null,
                    dispatchQty,
                    unitPrice,
                    lineTotal,
                    remarks: item.remarks || null,
                };

                if (!linePayload.salesOrderLineId) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`salesOrderLineId is required in line item ${index + 1}`);
                }
                if (!linePayload.itemId) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`itemId is required in line item ${index + 1}`);
                }
                if (!linePayload.dispatchQty || linePayload.dispatchQty <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`dispatchQty must be greater than zero in line item ${index + 1}`);
                }

                const createdLine = await DeliveryChallanLine.create(linePayload, { transaction });
                createdLineItems.push(createdLine);
            }

            if (["DISPATCHED", "DELIVERED"].includes(createdHeader.status)) {
                await processDispatch(createdHeader, createdLineItems, companyId, user_id, transaction);
            }

            await transaction.commit();
            res.status(StatusCodes.CREATED).json({
                success: true,
                message: "Delivery challan created successfully",
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

    // Get all delivery challans with pagination, search, and status filter
    getAllDeliveryChallans: asyncHandler(async (req: CustomRequest, res: Response) => {
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
                { challanNumber: { [Op.like]: `%${search}%` } },
                { vehicleNumber: { [Op.like]: `%${search}%` } },
            ];
        }
        if (status) {
            whereClause.status = status;
        }

        const { rows: challans, count: total } = await DeliveryChallanHeader.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: SalesOrderHeader,
                    as: "salesOrderHeader",
                    attributes: ["id", "orderNumber"],
                    required: false,
                },
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
            message: "Delivery challans fetched successfully",
            result: challans,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }),

    // Get a single delivery challan by ID
    getDeliveryChallanById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;
        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const challan = await DeliveryChallanHeader.findOne({
            where: { id: Number(id), companyId },
            include: [
                {
                    model: SalesOrderHeader,
                    as: "salesOrderHeader",
                    attributes: ["id", "orderNumber"],
                    required: false,
                },
                {
                    model: Customer,
                    as: "customer",
                    attributes: ["id", "name"],
                    required: false,
                },
                {
                    model: DeliveryChallanLine,
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

        if (!challan) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Delivery challan not found");
        }

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Delivery challan fetched successfully",
            result: challan,
        });
    }),

    // Update an existing delivery challan
    updateDeliveryChallan: asyncHandler(async (req: CustomRequest, res: Response) => {
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

            const existingChallan = await DeliveryChallanHeader.findOne({
                where: { id: Number(id), companyId },
                transaction,
            });
            if (!existingChallan) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Delivery challan not found");
            }

            const challanDate = header.challanDate ? new Date(header.challanDate) : existingChallan.challanDate;
            const dispatchDate = header.dispatchDate !== undefined ? (header.dispatchDate ? new Date(header.dispatchDate) : null) : existingChallan.dispatchDate;
            const deliveredDate = header.deliveredDate !== undefined ? (header.deliveredDate ? new Date(header.deliveredDate) : null) : existingChallan.deliveredDate;
            const status = header.status || existingChallan.status;

            const headerPayload: any = {
                challanNumber: String(header.challanNumber || existingChallan.challanNumber).trim(),
                salesOrderHeaderId: Number(header.salesOrderHeaderId || existingChallan.salesOrderHeaderId),
                customerId: Number(header.customerId || existingChallan.customerId),
                challanDate,
                vehicleNumber: header.hasOwnProperty("vehicleNumber") ? header.vehicleNumber : existingChallan.vehicleNumber,
                transporterName: header.hasOwnProperty("transporterName") ? header.transporterName : existingChallan.transporterName,
                driverName: header.hasOwnProperty("driverName") ? header.driverName : existingChallan.driverName,
                driverPhone: header.hasOwnProperty("driverPhone") ? header.driverPhone : existingChallan.driverPhone,
                dispatchDate,
                deliveredDate,
                transportationModeId: normalizeOptionalNumber(header.transportationModeId) ?? existingChallan.transportationModeId,
                warehouseId: normalizeOptionalNumber(header.warehouseId) ?? existingChallan.warehouseId,
                subsidiaryId: normalizeOptionalNumber(header.subsidiaryId) ?? existingChallan.subsidiaryId,
                cityId: normalizeOptionalNumber(header.cityId) ?? existingChallan.cityId,
                uom_id: normalizeOptionalNumber(header.uom_id) ?? existingChallan.uom_id,
                status,
                remarks: header.hasOwnProperty("remarks") ? header.remarks : existingChallan.remarks,
                shippingAddress: header.hasOwnProperty("shippingAddress") ? header.shippingAddress : existingChallan.shippingAddress,
                companyId,
                user_id,
            };

            if (!headerPayload.challanNumber) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("challanNumber is required");
            }
            if (!headerPayload.salesOrderHeaderId) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("salesOrderHeaderId is required");
            }
            if (!headerPayload.customerId) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("customerId is required");
            }
            if (!headerPayload.challanDate || Number.isNaN(headerPayload.challanDate.getTime())) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid challanDate is required");
            }

            const lineUpdateAllowed = ["DRAFT"].includes(existingChallan.status);
            if (lineItems && Array.isArray(lineItems) && lineItems.length > 0 && !lineUpdateAllowed) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Cannot update line items once dispatch has started");
            }

            await existingChallan.update(headerPayload, { transaction });

            let updatedLineItems: any[] = [];
            if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
                await DeliveryChallanLine.destroy({ where: { deliveryChallanHeaderId: existingChallan.id }, transaction });

                for (let index = 0; index < lineItems.length; index++) {
                    const item = lineItems[index];
                    const dispatchQty = Number(item.dispatchQty);
                    const unitPrice = Number(item.unitPrice);
                    const lineTotal = calculateLineTotal(dispatchQty, unitPrice);

                    const linePayload: any = {
                        deliveryChallanHeaderId: existingChallan.id,
                        salesOrderLineId: Number(item.salesOrderLineId),
                        itemId: Number(item.itemId),
                        batchNo: item.batchNo || null,
                        dispatchQty,
                        unitPrice,
                        lineTotal,
                        remarks: item.remarks || null,
                    };

                    if (!linePayload.salesOrderLineId) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`salesOrderLineId is required in line item ${index + 1}`);
                    }
                    if (!linePayload.itemId) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`itemId is required in line item ${index + 1}`);
                    }
                    if (!linePayload.dispatchQty || linePayload.dispatchQty <= 0) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`dispatchQty must be greater than zero in line item ${index + 1}`);
                    }

                    const createdLine = await DeliveryChallanLine.create(linePayload, { transaction });
                    updatedLineItems.push(createdLine);
                }
            }

            const wasDispatched = ["DISPATCHED", "DELIVERED"].includes(existingChallan.status);
            const willDispatch = ["DISPATCHED", "DELIVERED"].includes(headerPayload.status);
            if (!wasDispatched && willDispatch) {
                const processedLines = updatedLineItems.length > 0 ? updatedLineItems : await DeliveryChallanLine.findAll({ where: { deliveryChallanHeaderId: existingChallan.id }, transaction });
                await processDispatch(existingChallan, processedLines, companyId, user_id, transaction);
            }
            if (wasDispatched && headerPayload.status === "CANCELLED") {
                const processedLines = await DeliveryChallanLine.findAll({ where: { deliveryChallanHeaderId: existingChallan.id }, transaction });
                await reverseDispatch(existingChallan, processedLines, companyId, user_id, transaction);
            }

            await transaction.commit();
            res.status(StatusCodes.OK).json({
                success: true,
                message: "Delivery challan updated successfully",
                result: {
                    header: existingChallan,
                    lineItems: updatedLineItems,
                },
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }),

    // Update delivery challan status (e.g., DISPATCHED, DELIVERED, CANCELLED)
    updateDeliveryChallanStatus: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { status } = req.body;

        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;
        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const challan = await DeliveryChallanHeader.findOne({ where: { id: Number(id), companyId } });
        if (!challan) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Delivery challan not found");
        }
        if (!status) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("status is required");
        }

        const transaction = await sequelize.transaction();
        try {
            const wasDispatched = ["DISPATCHED", "DELIVERED"].includes(challan.status);
            const willDispatch = ["DISPATCHED", "DELIVERED"].includes(status);

            await challan.update({ status }, { transaction });

            const lineItems = await DeliveryChallanLine.findAll({ where: { deliveryChallanHeaderId: challan.id }, transaction });
            if (!wasDispatched && willDispatch) {
                await processDispatch(challan, lineItems, companyId, user_id, transaction);
            }
            if (wasDispatched && status === "CANCELLED") {
                await reverseDispatch(challan, lineItems, companyId, user_id, transaction);
            }

            await transaction.commit();
            res.status(StatusCodes.OK).json({
                success: true,
                message: "Delivery challan status updated successfully",
                result: challan,
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }),

    // Delete a delivery challan (only if not dispatched)
    deleteDeliveryChallan: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;
        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const challan = await DeliveryChallanHeader.findOne({ where: { id: Number(id), companyId } });
        if (!challan) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Delivery challan not found");
        }

        if (["DISPATCHED", "DELIVERED"].includes(challan.status)) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Cannot delete a delivery challan after dispatch has started");
        }

        await DeliveryChallanLine.destroy({ where: { deliveryChallanHeaderId: challan.id } });
        await challan.destroy();

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Delivery challan deleted successfully",
            result: null,
        });
    }),
};

export default DeliveryChallanController;