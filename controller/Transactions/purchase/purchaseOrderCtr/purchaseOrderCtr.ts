import { Response } from "express";

import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import TransportationMode from "../../../../modals/masters/transportMode/transportMode";
import SubsidiaryMaster from "../../../../modals/masters/subsidiaries/subsdiaryMaster";
import WorkCategory from "../../../../modals/masters/workCategory/workCatMaster";
import Vendor from "../../../../modals/masters/vendorDetails/vendorDetails";
import HSNSACMaster from "../../../../modals/masters/HSN-SAC/HSNSACMaster";
import { findCompanyForUser } from "../../../../utils/findCompanyForUser";
import Warehouse from "../../../../modals/masters/warehouse/warehouse";
import ItemMaster from "../../../../modals/masters/items/itemMaster";
import Customer from "../../../../modals/masters/customer/customer";
import { CustomRequest } from "../../../../typeRequest/customReq";
import UOMMaster from "../../../../modals/masters/UOM/UOMMaster";
import {
    PurchaseOrder,
    PurchaseOrderLine,
} from "../../../../modals/Transactions/purchase/purchaseOrder";
import CityMaster from "../../../../modals/masters/city/city";
import Godown from "../../../../modals/masters/godown/godown";
import Stack from "../../../../modals/masters/stack/stack";
import sequelize from "../../../../dbconfig/dbconfig";
import { normalizePurchaseOrderStatus } from "../../../../utils/p2pStatus";

import ChartOfAccountMaster from "../../../../modals/masters/chartOfAccount/chartOfAccount";

const normalizeOptionalId = (value: unknown) => {
    if (value === null || value === "") {
        return null;
    }
    return Number(value);
};

const itemIncludeConfig = {
    model: ItemMaster,
    as: "item",
    attributes: ["id", "item_code", "item_name", "item_desc", "track_inventory", "cost_price", "default_rate", "asset_account_id", "income_account_id", "cogs_account_id", "expense_account_id"],
    include: [
        { model: ChartOfAccountMaster, as: "asset_account", attributes: ["id", "account_number", "account_name"], include: [{ association: "accountType", attributes: ["id", "account_type_name"] }] },
        { model: ChartOfAccountMaster, as: "income_account", attributes: ["id", "account_number", "account_name"], include: [{ association: "accountType", attributes: ["id", "account_type_name"] }] },
        { model: ChartOfAccountMaster, as: "cogs_account", attributes: ["id", "account_number", "account_name"], include: [{ association: "accountType", attributes: ["id", "account_type_name"] }] },
        { model: ChartOfAccountMaster, as: "expense_account", attributes: ["id", "account_number", "account_name"], include: [{ association: "accountType", attributes: ["id", "account_type_name"] }] },
    ],
};

const PurchaseOrderController = {
    // Create a new purchase order with header and line items
    createPurchaseOrder: asyncHandler(async (req: CustomRequest, res: Response) => {
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
            const CompanyId = company?.id;
            const user_id = req.user?.id;

            if (!CompanyId || !user_id) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User authentication required");
            }

            const headerPayload: any = {
                purchaseNo: String(header.purchaseNo || "").trim(),
                vendor_id: Number(header.vendor_id),
                purchaseDate: header.purchaseDate ? new Date(header.purchaseDate) : null,
                deliveryDate: header.deliveryDate ? new Date(header.deliveryDate) : null,
                deliveredDate: header.deliveredDate ? new Date(header.deliveredDate) : null,
                shipped_from: header.shipped_from || null,
                shipped_to: header.shipped_to || null,
                city_id: Number(header.city_id),
                work_order_no: String(header.work_order_no || "").trim(),
                transportation_mode_id: Number(header.transportation_mode_id),
                vehicleNumber: header.vehicleNumber || null,
                transporterName: header.transporterName || null,
                driverName: header.driverName || null,
                driverPhone: header.driverPhone || null,
                warehouse_id: Number(header.warehouse_id),
                godown_id: normalizeOptionalId(header.godown_id),
                stack_id: normalizeOptionalId(header.stack_id),
                subsidiary_id: Number(header.subsidiary_id),
                status: normalizePurchaseOrderStatus(header.status, "DRAFT"),
                remarks: header.remarks || null,
                CompanyId,
                user_id,
            };

            if (!headerPayload.purchaseNo) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("purchaseNo is required");
            }
            // if (!headerPayload.customer_id) {
            //     res.status(StatusCodes.BAD_REQUEST);
            //     throw new Error("customer_id is required");
            // }
            if (!headerPayload.purchaseDate || Number.isNaN(headerPayload.purchaseDate.getTime())) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid purchaseDate is required");
            }
            if (!headerPayload.deliveryDate || Number.isNaN(headerPayload.deliveryDate.getTime())) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid deliveryDate is required");
            }
            if (!headerPayload.city_id) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("city_id is required");
            }
            if (!headerPayload.work_order_no) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("work_order_no is required");
            }
            if (!headerPayload.transportation_mode_id) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("transportation_mode_id is required");
            }
            if (!headerPayload.warehouse_id) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("warehouse_id is required");
            }
            if (!headerPayload.subsidiary_id) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("subsidiary_id is required");
            }

            // Validate and prepare all line items before creating header
            const preparedLineItems = [];
            for (let index = 0; index < lineItems.length; index++) {
                const lineItem = lineItems[index];
                const quantity = Number(lineItem.quantity);
                const rate = lineItem.rate !== undefined && lineItem.rate !== "" ? Number(lineItem.rate) : null;
                const taxRate =
                    lineItem.tax_rate !== undefined && lineItem.tax_rate !== ""
                        ? Number(lineItem.tax_rate)
                        : 0;
                const taxableAmount = rate !== null ? quantity * rate : 0;
                const amount =
                    lineItem.amount !== undefined && lineItem.amount !== ""
                        ? Number(lineItem.amount)
                        : taxableAmount;
                const taxAmount = Number(((taxableAmount * taxRate) / 100).toFixed(2));
                const lineTotal =
                    lineItem.line_total !== undefined && lineItem.line_total !== ""
                        ? Number(lineItem.line_total)
                        : Number((taxableAmount + taxAmount).toFixed(2));

                const linePayload: any = {
                    item_id: Number(lineItem.item_id),
                    hsn_sac_id: normalizeOptionalId(lineItem.hsn_sac_id),
                    work_category_id: normalizeOptionalId(lineItem.work_category_id),
                    work_order_no: String(lineItem.work_order_no || headerPayload.work_order_no || "").trim(),
                    lot_number: lineItem.lot_number || null,
                    quantity,
                    uom_id: Number(lineItem.uom_id),
                    rate,
                    amount,
                    ndian_tax_nature: lineItem.ndian_tax_nature || null,
                    use_rate_calculation:
                        lineItem.use_rate_calculation !== undefined
                            ? Boolean(lineItem.use_rate_calculation)
                            : true,
                    tax_rate: taxRate,
                    tax_amount: taxAmount,
                    line_total: lineTotal,
                    status: lineItem.status || "PENDING",
                    remarks: lineItem.remarks || null,
                    CompanyId,
                    user_id,
                    isActive: lineItem.isActive !== undefined ? Boolean(lineItem.isActive) : true,
                };

                // Validate line item
                if (!linePayload.item_id) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`item_id is required in line item ${index + 1}`);
                }
                if (!linePayload.work_order_no) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`work_order_no is required in line item ${index + 1}`);
                }
                if (!linePayload.quantity || linePayload.quantity <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`quantity must be greater than zero in line item ${index + 1}`);
                }
                if (!linePayload.uom_id) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`uom_id is required in line item ${index + 1}`);
                }
                if (linePayload.rate !== null && linePayload.rate !== undefined && linePayload.rate < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`rate cannot be negative in line item ${index + 1}`);
                }

                preparedLineItems.push(linePayload);
            }

            // All validations passed, now create header
            const createdHeader = await PurchaseOrder.create(headerPayload, { transaction });

            // Create line items with the header ID
            const createdLineItems = [];
            for (const linePayload of preparedLineItems) {
                linePayload.purchase_order_header_id = createdHeader.id;
                const createdLine = await PurchaseOrderLine.create(linePayload, { transaction });
                createdLineItems.push(createdLine);
            }

            await transaction.commit();

            res.status(StatusCodes.CREATED).json({
                success: true,
                message: "Purchase order created successfully",
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

    // Fetch all purchase orders with pagination and optional search
    getAllPurchaseOrder: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const CompanyId = company?.id;
        const user_id = req.user?.id;

        if (!CompanyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const { page = 1, limit = 10, search } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const whereClause: any = {
            CompanyId,
        };
        if (search) {
            whereClause[Op.or] = [
                { purchaseNo: { [Op.like]: `%${search}%` } },
                { work_order_no: { [Op.like]: `%${search}%` } },
            ];
        }

        const total = await PurchaseOrder.count({ where: whereClause });
        const purchaseOrders = await PurchaseOrder.findAll({
            where: whereClause,
            include: [
                {
                    model: CityMaster,
                    as: "city",
                    attributes: ["id", "city_name"],
                },
                {
                    model: Vendor,
                    as: "vendor",
                    attributes: ["id", "vendor_name"]
                },
                {
                    model: TransportationMode,
                    as: "transportationMode",
                    attributes: ["id", "mode_name"],
                },
                {
                    model: Warehouse,
                    as: "warehouse",
                    attributes: ["id"],
                },
                {
                    model: SubsidiaryMaster,
                    as: "subsidiary",
                    attributes: ["id", "subsidiary_name"],
                },
                {
                    model: PurchaseOrderLine,
                    as: "purchaseOrderLines",
                    required: false,
                    include: [
                        itemIncludeConfig,
                        {
                            model: HSNSACMaster,
                            as: "hsnSac",
                            attributes: ["id", "code"],
                        },
                        {
                            model: UOMMaster,
                            as: "uom",
                            attributes: ["id", "uom_name"],
                        },
                        {
                            model: WorkCategory,
                            as: "workCategory",
                            attributes: ["id", "work_category_name"],
                        },
                    ],
                }
            ],
            offset,
            limit: Number(limit),
            order: [["createdAt", "DESC"]],
        });

        res.status(StatusCodes.OK).json({
            message: "Purchase orders fetched successfully",
            success: true,
            result: purchaseOrders,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }),

    // Fetch a single purchase order by ID
    getPurchaseOrderById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const company = await findCompanyForUser(req.user);
        const CompanyId = company?.id;
        const user_id = req.user?.id;

        if (!CompanyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const purchaseOrder = await PurchaseOrder.findOne({
            where: { id: Number(id), CompanyId },
            include: [
                // {
                //     model: Customer,
                //     as: "customer",
                //     attributes: ["id", "name", "contact", "email"],
                // },
                {
                    model: Vendor,
                    as: "vendor",
                    attributes: ["id", "vendor_name"]
                },
                {
                    model: CityMaster,
                    as: "city",
                    attributes: ["id", "city_name"],
                },
                {
                    model: TransportationMode,
                    as: "transportationMode",
                    attributes: ["id", "mode_name"],
                },
                {
                    model: Warehouse,
                    as: "warehouse",
                    attributes: ["id", "warehouse_name"],
                },
                {
                    model: SubsidiaryMaster,
                    as: "subsidiary",
                    attributes: ["id", "subsidiary_name"],
                },
                {
                    model: Godown,
                    as: "godown",
                    attributes: ["id", "godown_name"],
                    required: false,
                },
                {
                    model: Stack,
                    as: "stack",
                    attributes: ["id", "stack_name"],
                    required: false,
                },
                {
                    model: PurchaseOrderLine,
                    as: "purchaseOrderLines",
                    required: false,
                    include: [
                        itemIncludeConfig,
                        { model: HSNSACMaster, as: "hsnSac", attributes: ["id", "code"] },
                        { model: UOMMaster, as: "uom", attributes: ["id", "uom_name"] },
                        {
                            model: WorkCategory,
                            as: "workCategory",
                            attributes: ["id", "work_category_name"],
                        },
                        {
                            model: Warehouse,
                            as: "warehouse",
                            attributes: ["id", "warehouse_name"],
                        },
                    ],
                },
            ],
        });

        if (!purchaseOrder) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Purchase order not found");
        }

        res.status(StatusCodes.OK).json({
            message: "Purchase order fetched successfully",
            success: true,
            result: purchaseOrder,
        });
    }),

    // Update a purchase order header and its line items
    updatePurchaseOrder: asyncHandler(async (req: CustomRequest, res: Response) => {
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
            const CompanyId = company?.id;
            const user_id = req.user?.id;

            if (!CompanyId || !user_id) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User authentication required");
            }

            const existingPurchaseOrder = await PurchaseOrder.findOne({
                where: { id: Number(id), CompanyId },
                transaction,
            });

            if (!existingPurchaseOrder) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Purchase order not found");
            }

            const headerPayload: any = {
                purchaseNo: String(header.purchaseNo || "").trim(),
                // customer_id: Number(header.customer_id),
                purchaseDate: header.purchaseDate ? new Date(header.purchaseDate) : null,
                deliveryDate: header.deliveryDate ? new Date(header.deliveryDate) : null,
                deliveredDate: header.deliveredDate ? new Date(header.deliveredDate) : null,
                shipped_from: header.shipped_from || null,
                shipped_to: header.shipped_to || null,
                city_id: Number(header.city_id),
                work_order_no: String(header.work_order_no || "").trim(),
                transportation_mode_id: Number(header.transportation_mode_id),
                vehicleNumber: header.vehicleNumber || null,
                transporterName: header.transporterName || null,
                driverName: header.driverName || null,
                driverPhone: header.driverPhone || null,
                warehouse_id: Number(header.warehouse_id),
                godown_id: normalizeOptionalId(header.godown_id),
                stack_id: normalizeOptionalId(header.stack_id),
                subsidiary_id: Number(header.subsidiary_id),
                status: normalizePurchaseOrderStatus(header.status || existingPurchaseOrder.status, existingPurchaseOrder.status || "DRAFT"),
                remarks: header.remarks || null,
                CompanyId,
                user_id,
            };

            // Validation similar to create
            if (!headerPayload.purchaseNo) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("purchaseNo is required");
            }
            // if (!headerPayload.customer_id) {
            //     res.status(StatusCodes.BAD_REQUEST);
            //     throw new Error("customer_id is required");
            // }
            if (!headerPayload.purchaseDate || Number.isNaN(headerPayload.purchaseDate.getTime())) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid purchaseDate is required");
            }
            if (!headerPayload.deliveryDate || Number.isNaN(headerPayload.deliveryDate.getTime())) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid deliveryDate is required");
            }
            if (!headerPayload.city_id) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("city_id is required");
            }
            if (!headerPayload.work_order_no) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("work_order_no is required");
            }
            if (!headerPayload.transportation_mode_id) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("transportation_mode_id is required");
            }
            if (!headerPayload.warehouse_id) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("warehouse_id is required");
            }
            if (!headerPayload.subsidiary_id) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("subsidiary_id is required");
            }

            await existingPurchaseOrder.update(headerPayload, { transaction });

            // Delete existing line items and recreate
            await PurchaseOrderLine.destroy({
                where: { purchase_order_header_id: existingPurchaseOrder.id },
                transaction,
            });

            const updatedLineItems = [];
            for (const lineItem of lineItems) {
                const quantity = Number(lineItem.quantity);
                const rate = lineItem.rate !== undefined && lineItem.rate !== "" ? Number(lineItem.rate) : null;
                const taxRate =
                    lineItem.tax_rate !== undefined && lineItem.tax_rate !== ""
                        ? Number(lineItem.tax_rate)
                        : 0;
                const taxableAmount = rate !== null ? quantity * rate : 0;
                const amount =
                    lineItem.amount !== undefined && lineItem.amount !== ""
                        ? Number(lineItem.amount)
                        : taxableAmount;
                const taxAmount = Number(((taxableAmount * taxRate) / 100).toFixed(2));
                const lineTotal =
                    lineItem.line_total !== undefined && lineItem.line_total !== ""
                        ? Number(lineItem.line_total)
                        : Number((taxableAmount + taxAmount).toFixed(2));

                const linePayload: any = {
                    purchase_order_header_id: existingPurchaseOrder.id,
                    item_id: Number(lineItem.item_id),
                    hsn_sac_id: normalizeOptionalId(lineItem.hsn_sac_id),
                    work_category_id: normalizeOptionalId(lineItem.work_category_id),
                    work_order_no: String(lineItem.work_order_no || headerPayload.work_order_no || "").trim(),
                    lot_number: lineItem.lot_number || null,
                    quantity,
                    uom_id: Number(lineItem.uom_id),
                    rate,
                    amount,
                    ndian_tax_nature: lineItem.ndian_tax_nature || null,
                    use_rate_calculation:
                        lineItem.use_rate_calculation !== undefined
                            ? Boolean(lineItem.use_rate_calculation)
                            : true,
                    tax_rate: taxRate,
                    tax_amount: taxAmount,
                    line_total: lineTotal,
                    status: lineItem.status || "PENDING",
                    remarks: lineItem.remarks || null,
                    CompanyId,
                    user_id,
                    isActive: lineItem.isActive !== undefined ? Boolean(lineItem.isActive) : true,
                };

                // Validations
                if (!linePayload.item_id) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error("item_id is required in each line item");
                }
                if (!linePayload.work_order_no) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error("work_order_no is required in each line item");
                }
                if (!linePayload.quantity || linePayload.quantity <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error("quantity must be greater than zero in each line item");
                }
                if (!linePayload.uom_id) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error("uom_id is required in each line item");
                }
                if (linePayload.rate !== null && linePayload.rate !== undefined && linePayload.rate < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error("rate cannot be negative in each line item");
                }

                const createdLine = await PurchaseOrderLine.create(linePayload, { transaction });
                updatedLineItems.push(createdLine);
            }

            await transaction.commit();

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Purchase order updated successfully",
                result: {
                    header: existingPurchaseOrder,
                    lineItems: updatedLineItems,
                },
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }),

    // Update only the status of a purchase order
    updateStatusOfPurchaseOrder: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { status } = req.body;

        const company = await findCompanyForUser(req.user);
        const CompanyId = company?.id;
        const user_id = req.user?.id;

        if (!CompanyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const purchaseOrder = await PurchaseOrder.findOne({
            where: { id: Number(id), CompanyId },
        });

        if (!purchaseOrder) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Purchase order not found");
        }

        if (!status) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Status is required");
        }

        const normalizedStatus = normalizePurchaseOrderStatus(status);
        await purchaseOrder.update({ status: normalizedStatus });

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Purchase order status updated successfully",
            result: purchaseOrder,
        });
    }),

    // Delete a purchase order and its line items
    deletePurchaseOrder: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;

        const company = await findCompanyForUser(req.user);
        const CompanyId = company?.id;
        const user_id = req.user?.id;

        if (!CompanyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const purchaseOrder = await PurchaseOrder.findOne({
            where: { id: Number(id), CompanyId },
        });

        if (!purchaseOrder) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Purchase order not found");
        }

        // Delete line items first
        await PurchaseOrderLine.destroy({
            where: { purchase_order_header_id: purchaseOrder.id },
        });

        await purchaseOrder.destroy();

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Purchase order deleted successfully",
            result: null,
        });
    }),

    // Export purchase orders to CSV based on filters
    exportPurchaseOrdersCSV: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const CompanyId = company?.id;
        const {
            fromDate,
            toDate,
            status,
            work_category_id,
            warehouse_id,
            city_id,
        } = req.query;

        if (!CompanyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        let whereClause: any = { CompanyId };

        // Helper function to convert DD/MM/YYYY to YYYY-MM-DD
        const convertDateFormat = (dateStr: string): string => {
            if (dateStr.includes("/")) {
                const parts = dateStr.split("/");
                if (parts.length === 3) {
                    // DD/MM/YYYY to YYYY-MM-DD
                    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
                }
            }
            return dateStr; // Return as-is if already in correct format
        };

        // Add date range filter using DATE() function for comparison
        if (fromDate || toDate) {
            if (fromDate && toDate) {
                // Both dates provided - use BETWEEN on DATE part
                const formattedFromDate = convertDateFormat(fromDate as string);
                const formattedToDate = convertDateFormat(toDate as string);
                whereClause[Op.and] = [
                    sequelize.where(
                        sequelize.fn("DATE", sequelize.col("PurchaseOrder.purchaseDate")),
                        {
                            [Op.between]: [formattedFromDate, formattedToDate],
                        }
                    ),
                ];
            } else if (fromDate) {
                // Only from date - greater than or equal
                const formattedFromDate = convertDateFormat(fromDate as string);
                whereClause[Op.and] = [
                    sequelize.where(
                        sequelize.fn("DATE", sequelize.col("PurchaseOrder.purchaseDate")),
                        {
                            [Op.gte]: formattedFromDate,
                        }
                    ),
                ];
            } else if (toDate) {
                // Only to date - less than or equal
                const formattedToDate = convertDateFormat(toDate as string);
                whereClause[Op.and] = [
                    sequelize.where(
                        sequelize.fn("DATE", sequelize.col("PurchaseOrder.purchaseDate")),
                        {
                            [Op.lte]: formattedToDate,
                        }
                    ),
                ];
            }
        }

        // Add status filter
        if (status) {
            whereClause.status = status;
        }

        // Additional filters
        if (warehouse_id) {
            whereClause.warehouse_id = warehouse_id;
        }

        if (city_id) {
            whereClause.city_id = city_id;
        }


        const lineWhere: any = {};
        if (work_category_id) lineWhere.work_category_id = work_category_id;
        if (warehouse_id) lineWhere.warehouse_id = warehouse_id;

        const includeArr: any[] = [
            {
                model: Customer,
                as: "customer",
                attributes: ["id", "name", "contact", "email"],
            },
            {
                model: CityMaster,
                as: "city",
                attributes: ["id", "city_name"],
            },
            {
                model: TransportationMode,
                as: "transportationMode",
                attributes: ["id", "mode_name"],
            },
            {
                model: Warehouse,
                as: "warehouse",
                attributes: ["id", "warehouse_name"],
            },
            {
                model: SubsidiaryMaster,
                as: "subsidiary",
                attributes: ["id", "subsidiary_name"],
            },
        ];

        if (Object.keys(lineWhere).length > 0) {
            includeArr.push({
                model: PurchaseOrderLine,
                as: "purchaseOrderLines",
                where: lineWhere,
                required: true,
                include: [
                    {
                        model: ItemMaster,
                        as: "item",
                        attributes: ["id", "item_code", "item_name", "item_desc"],
                    },
                    { model: HSNSACMaster, as: "hsnSac", attributes: ["id", "code"] },
                    { model: UOMMaster, as: "uom", attributes: ["id", "uom_name"] },
                    {
                        model: WorkCategory,
                        as: "workCategory",
                        attributes: ["id", "work_category_name"],
                    },
                    {
                        model: Warehouse,
                        as: "warehouse",
                        attributes: ["id", "warehouse_name"],
                    },
                ],
            });
        } else {
            includeArr.push({
                model: PurchaseOrderLine,
                as: "purchaseOrderLines",
                include: [
                    {
                        model: ItemMaster,
                        as: "item",
                        attributes: ["id", "item_code", "item_name", "item_desc"],
                    },
                    { model: HSNSACMaster, as: "hsnSac", attributes: ["id", "code"] },
                    { model: UOMMaster, as: "uom", attributes: ["id", "uom_name"] },
                ],
            });
        }

        const purchaseOrders = await PurchaseOrder.findAll({
            where: whereClause,
            include: includeArr,
            order: [["createdAt", "DESC"]],
        });

        // Prepare CSV data
        const csvData: any[] = [];

        purchaseOrders.forEach((purchaseOrder: any) => {
            const poLines = purchaseOrder.purchaseOrderLines || purchaseOrder.lineItems || [];
            if (poLines.length > 0) {
                poLines.forEach((lineItem: any) => {
                    csvData.push({
                        "Purchase Order Number": purchaseOrder.purchaseNo || "",
                        "Work Order No": purchaseOrder.work_order_no || "",
                        "Customer Name": purchaseOrder.customer?.name || "",
                        "Customer Contact": purchaseOrder.customer?.contact || "",
                        City: purchaseOrder.city?.city_name || "",
                        "Transportation Mode": purchaseOrder.transportationMode?.mode_name || "",
                        "Vehicle No": purchaseOrder.vehicleNumber || "",
                        "Transporter Name": purchaseOrder.transporterName || "",
                        "Driver Name": purchaseOrder.driverName || "",
                        "Driver Phone": purchaseOrder.driverPhone || "",
                        Warehouse: purchaseOrder.warehouse?.warehouse_name || "",
                        Subsidiary: purchaseOrder.subsidiary?.subsidiary_name || "",
                        "Purchase Date": purchaseOrder.purchaseDate
                            ? new Date(purchaseOrder.purchaseDate).toLocaleDateString()
                            : "",
                        "Delivery Date": purchaseOrder.deliveryDate
                            ? new Date(purchaseOrder.deliveryDate).toLocaleDateString()
                            : "",
                        Status: purchaseOrder.status || "",
                        "Item Code": lineItem.item?.item_code || "",
                        "Item Name": lineItem.item?.item_name || "",
                        "Item Description": lineItem.item?.item_desc || "",
                        "HSN/SAC Code": lineItem.hsnSac?.code || "",
                        "Lot Number": lineItem.lot_number || "",
                        Quantity: lineItem.quantity || 0,
                        UOM: lineItem.uom?.uom_name || "",
                        Rate: lineItem.rate || 0,
                        "Tax Rate %": lineItem.tax_rate || 0,
                        "Tax Amount": lineItem.tax_amount || 0,
                        "Line Total": lineItem.line_total || 0,
                        "Work Category": lineItem.workCategory?.work_category_name || "",
                        "Line Warehouse": lineItem.warehouse?.warehouse_name || "",
                        Remarks: purchaseOrder.remarks || "",
                        "Created Date": purchaseOrder.createdAt
                            ? new Date(purchaseOrder.createdAt).toLocaleDateString()
                            : "",
                    });
                });
            } else {
                // Add header-only row if no line items
                csvData.push({
                    "Purchase Order Number": purchaseOrder.purchaseNo || "",
                    "Work Order No": purchaseOrder.work_order_no || "",
                    "Customer Name": purchaseOrder.customer?.name || "",
                    "Customer Contact": purchaseOrder.customer?.contact || "",
                    City: purchaseOrder.city?.city_name || "",
                    "Transportation Mode": purchaseOrder.transportationMode?.mode_name || "",
                    "Vehicle No": purchaseOrder.vehicleNumber || "",
                    "Transporter Name": purchaseOrder.transporterName || "",
                    "Driver Name": purchaseOrder.driverName || "",
                    "Driver Phone": purchaseOrder.driverPhone || "",
                    Warehouse: purchaseOrder.warehouse?.warehouse_name || "",
                    Subsidiary: purchaseOrder.subsidiary?.subsidiary_name || "",
                    "Purchase Date": purchaseOrder.purchaseDate
                        ? new Date(purchaseOrder.purchaseDate).toLocaleDateString()
                        : "",
                    "Delivery Date": purchaseOrder.deliveryDate
                        ? new Date(purchaseOrder.deliveryDate).toLocaleDateString()
                        : "",
                    Status: purchaseOrder.status || "",
                    "Item Code": "",
                    "Item Name": "",
                    "Item Description": "",
                    "HSN/SAC Code": "",
                    "Lot Number": "",
                    Quantity: 0,
                    UOM: "",
                    Rate: 0,
                    "Tax Rate %": 0,
                    "Tax Amount": 0,
                    "Line Total": 0,
                    "Work Category": "",
                    "Line Warehouse": "",
                    Remarks: purchaseOrder.remarks || "",
                    "Created Date": purchaseOrder.createdAt
                        ? new Date(purchaseOrder.createdAt).toLocaleDateString()
                        : "",
                });
            }
        });

        // Convert to CSV format
        if (csvData.length === 0) {
            // Return empty CSV with headers only
            const headers = [
                "Purchase Order Number",
                "Work Order No",
                "Customer Name",
                "Customer Contact",
                "City",
                "Transportation Mode",
                "Vehicle No",
                "Transporter Name",
                "Driver Name",
                "Driver Phone",
                "Warehouse",
                "Subsidiary",
                "Purchase Date",
                "Delivery Date",
                "Status",
                "Item Code",
                "Item Name",
                "Item Description",
                "HSN/SAC Code",
                "Lot Number",
                "Quantity",
                "UOM",
                "Rate",
                "Tax Rate %",
                "Tax Amount",
                "Line Total",
                "Work Category",
                "Line Warehouse",
                "Remarks",
                "Created Date",
            ];

            const csvContent = headers.join(",") + "\n";
            const filename = `purchase_orders_${new Date().toISOString().split("T")[0]}.csv`;

            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

            res.status(StatusCodes.OK).send(csvContent);
            return;
        }

        const headers = Object.keys(csvData[0]);
        const csvContent = [
            headers.join(","),
            ...csvData.map((row) =>
                headers
                    .map((header) => {
                        const value = row[header];
                        // Escape commas and quotes in CSV
                        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value;
                    })
                    .join(",")
            ),
        ].join("\n");

        // Set headers for file download
        const filename = `purchase_orders_${new Date().toISOString().split("T")[0]}.csv`;
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

        res.status(StatusCodes.OK).send(csvContent);
    }),
};

export default PurchaseOrderController;