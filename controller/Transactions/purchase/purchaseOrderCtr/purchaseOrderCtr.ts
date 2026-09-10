import { Response } from "express";

import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import PurchaseInvoiceHeader from "../../../../modals/Transactions/purchase/purchaseInvoice/purchaseInvoiceHeader";
import PurchaseInvoiceLine from "../../../../modals/Transactions/purchase/purchaseInvoice/purchaseInvoiceLine";
import ChartOfAccountMaster from "../../../../modals/masters/chartOfAccount/chartOfAccount";
import VendorAddressBook from "../../../../modals/masters/vendorDetails/VendorAddressBook";
import TransportationMode from "../../../../modals/masters/transportMode/transportMode";
import SubsidiaryMaster from "../../../../modals/masters/subsidiaries/subsdiaryMaster";
import DepartmentMaster from "../../../../modals/masters/department/departmentMaster";
import WorkCategory from "../../../../modals/masters/workCategory/workCatMaster";
import CurrencyMaster from "../../../../modals/masters/currency/currencyMaster";
import Vendor from "../../../../modals/masters/vendorDetails/vendorDetails";
import HSNSACMaster from "../../../../modals/masters/HSN-SAC/HSNSACMaster";
import { normalizePurchaseOrderStatus } from "../../../../utils/p2pStatus";
import { findCompanyForUser } from "../../../../utils/findCompanyForUser";
import Warehouse from "../../../../modals/masters/warehouse/warehouse";
import ClassMaster from "../../../../modals/masters/class/classMaster";
import ItemMaster from "../../../../modals/masters/items/itemMaster";
import Customer from "../../../../modals/masters/customer/customer";
import { GRN } from "../../../../modals/Transactions/purchase/GRN";
import { InventoryService } from "../../../../utils/inventoryService";
import { CustomRequest } from "../../../../typeRequest/customReq";
import UOMMaster from "../../../../modals/masters/UOM/UOMMaster";
import User from "../../../../modals/user/user";
import {
    PurchaseOrder,
    PurchaseOrderLine,
} from "../../../../modals/Transactions/purchase/purchaseOrder";
import CityMaster from "../../../../modals/masters/city/city";
import StateCode from "../../../../modals/masters/state/state";
import Godown from "../../../../modals/masters/godown/godown";
import Stack from "../../../../modals/masters/stack/stack";
import sequelize from "../../../../dbconfig/dbconfig";

const formatAddressBookRecord = (addr: any) => {
    if (!addr) return null;
    const cityName = addr.city?.city_name || addr.city_name || "";
    const stateName = addr.state?.state_name || addr.state_name || "";
    const zip = addr.zip || "";
    const cityStateZip = [cityName, stateName, zip].filter(Boolean).join(", ");
    const lines = [
        addr.attention ? `Attn: ${addr.attention}` : "",
        addr.addressee || addr.label || "",
        addr.addr1 || "",
        addr.addr2 || "",
        cityStateZip
    ].filter(Boolean);
    return lines.join("\n");
};

const normalizeOptionalId = (value: unknown) => {
    if (value === null || value === "" || value === undefined || value === "null" || value === "undefined") {
        return null;
    }
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
};

export const isDecimalAllowedForUOM = (uomObjOrName: any): boolean => {
    if (!uomObjOrName) return true;
    if (typeof uomObjOrName === "object" && uomObjOrName.allow_decimals !== undefined && uomObjOrName.allow_decimals !== null) {
        return Boolean(uomObjOrName.allow_decimals);
    }
    const name = String(typeof uomObjOrName === "object" ? uomObjOrName.uom_name || uomObjOrName.name || "" : uomObjOrName).trim().toUpperCase();
    const DISCRETE_UOMS = ["EACH", "EA", "PCS", "PIECE", "PIECES", "BOX", "BOXES", "UNIT", "UNITS", "PAIR", "PAIRS", "SET", "SETS", "NOS", "NUMBER", "NUMBERS", "BAG", "BAGS", "PACK", "PACKS", "CARTON", "CARTONS", "DRUM", "DRUMS", "BOTTLE", "BOTTLES", "CAN", "CANS", "ROLL", "ROLLS", "BARREL", "BARRELS"];
    return !DISCRETE_UOMS.includes(name);
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

            let autoPurchaseNo = String(header.purchaseNo || "").trim();
            if (!autoPurchaseNo) {
                const poCount = await PurchaseOrder.count({ where: { CompanyId }, transaction });
                autoPurchaseNo = `PO-${String(poCount + 1).padStart(4, "0")}`;
            }

            let vendor_address_id = normalizeOptionalId(header.vendor_address_id);
            let billing_address = header.billing_address ? String(header.billing_address).trim() : null;
            const vendor_id = normalizeOptionalId(header.vendor_id);

            // Auto-resolve billing address from vendor's address book or vendor master if not explicitly provided
            if (!billing_address && (vendor_address_id || vendor_id)) {
                if (vendor_address_id) {
                    const addr = await VendorAddressBook.findByPk(vendor_address_id, {
                        include: [
                            { model: CityMaster, as: "city", attributes: ["id", "city_name"], required: false },
                            { model: StateCode, as: "state", attributes: ["id", "state_name"], required: false }
                        ],
                        transaction
                    });
                    if (addr) {
                        billing_address = formatAddressBookRecord(addr);
                    }
                }

                if (!billing_address && vendor_id) {
                    const defaultAddr = await VendorAddressBook.findOne({
                        where: { vendor_id, default_billing: true },
                        include: [
                            { model: CityMaster, as: "city", attributes: ["id", "city_name"], required: false },
                            { model: StateCode, as: "state", attributes: ["id", "state_name"], required: false }
                        ],
                        transaction
                    }) || await VendorAddressBook.findOne({
                        where: { vendor_id },
                        include: [
                            { model: CityMaster, as: "city", attributes: ["id", "city_name"], required: false },
                            { model: StateCode, as: "state", attributes: ["id", "state_name"], required: false }
                        ],
                        transaction
                    });

                    if (defaultAddr) {
                        vendor_address_id = defaultAddr.id;
                        billing_address = formatAddressBookRecord(defaultAddr);
                    } else {
                        const vendorObj = await Vendor.findByPk(vendor_id, { transaction });
                        if (vendorObj && vendorObj.address) {
                            billing_address = vendorObj.address;
                        }
                    }
                }
            }

            const headerPayload: any = {
                purchaseNo: autoPurchaseNo,
                vendor_id,
                purchaseDate: header.purchaseDate ? new Date(header.purchaseDate) : null,
                deliveryDate: header.deliveryDate ? new Date(header.deliveryDate) : null,
                deliveredDate: header.deliveredDate ? new Date(header.deliveredDate) : null,
                shipped_from: header.shipped_from || null,
                shipped_to: header.shipped_to || null,
                city_id: normalizeOptionalId(header.city_id),
                work_order_no: header.work_order_no ? String(header.work_order_no).trim() : null,
                transportation_mode_id: normalizeOptionalId(header.transportation_mode_id),
                vehicleNumber: header.vehicleNumber || null,
                transporterName: header.transporterName || null,
                driverName: header.driverName || null,
                driverPhone: header.driverPhone || null,
                warehouse_id: normalizeOptionalId(header.warehouse_id),
                godown_id: normalizeOptionalId(header.godown_id),
                stack_id: normalizeOptionalId(header.stack_id),
                subsidiary_id: normalizeOptionalId(header.subsidiary_id),
                currency_id: normalizeOptionalId(header.currency_id),
                vendor_address_id,
                billing_address,
                class_id: normalizeOptionalId(header.class_id),
                department_id: normalizeOptionalId(header.department_id),
                status: normalizePurchaseOrderStatus(header.status, "PENDING_APPROVAL"),
                isActive: header.isActive !== undefined ? Boolean(header.isActive) : true,
                remarks: header.remarks || null,
                CompanyId,
                user_id,
            };
            if (!headerPayload.purchaseNo) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("purchaseNo is required");
            }
            if (!headerPayload.vendor_id) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("vendor is required");
            }
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
                throw new Error("city is required");
            }
            if (!headerPayload.subsidiary_id) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("subsidiary is required");
            }

            // Validate and prepare all line items before creating header
            const preparedLineItems = [];
            for (let index = 0; index < lineItems.length; index++) {
                const lineItem = lineItems[index];
                const quantity = Number(lineItem.quantity);
                const rate = lineItem.rate !== undefined && lineItem.rate !== "" ? Number(lineItem.rate) : null;
                const discountPercent = lineItem.discount_percent !== undefined && lineItem.discount_percent !== ""
                    ? Number(lineItem.discount_percent)
                    : (lineItem.discountPercent !== undefined && lineItem.discountPercent !== "" ? Number(lineItem.discountPercent) : 0);

                const taxRate =
                    lineItem.tax_rate !== undefined && lineItem.tax_rate !== ""
                        ? Number(lineItem.tax_rate)
                        : 0;

                const grossAmount = rate !== null ? quantity * rate : 0;
                const discountAmount = lineItem.discount_amount !== undefined && lineItem.discount_amount !== ""
                    ? Number(lineItem.discount_amount)
                    : Number(((grossAmount * discountPercent) / 100).toFixed(2));

                const taxableAmount = grossAmount - discountAmount;
                const subtotal = lineItem.subtotal !== undefined && lineItem.subtotal !== ""
                    ? Number(lineItem.subtotal)
                    : Number(grossAmount.toFixed(2));
                const amount =
                    lineItem.amount !== undefined && lineItem.amount !== ""
                        ? Number(lineItem.amount)
                        : grossAmount;
                const taxAmount = Number(((taxableAmount * taxRate) / 100).toFixed(2));
                const lineTotal =
                    lineItem.line_total !== undefined && lineItem.line_total !== ""
                        ? Number(lineItem.line_total)
                        : Number((taxableAmount + taxAmount).toFixed(2));

                const linePayload: any = {
                    item_id: Number(lineItem.item_id),
                    hsn_sac_id: normalizeOptionalId(lineItem.hsn_sac_id),
                    work_category_id: normalizeOptionalId(lineItem.work_category_id),
                    work_order_no: lineItem.work_order_no ? String(lineItem.work_order_no).trim() : null,
                    lot_number: lineItem.lot_number || null,
                    quantity,
                    uom_id: Number(lineItem.uom_id),
                    rate,
                    amount,
                    discount_percent: discountPercent,
                    discount_amount: discountAmount,
                    subtotal,
                    indian_tax_nature: lineItem.indian_tax_nature || lineItem.ndian_tax_nature || null,
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
                    throw new Error(`item is required in line item ${index + 1}`);
                }
                if (!linePayload.quantity || linePayload.quantity <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`quantity must be greater than zero in line item ${index + 1}`);
                }
                if (!linePayload.uom_id) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`uom is required in line item ${index + 1}`);
                }

                if (linePayload.uom_id) {
                    const uomObj = await UOMMaster.findByPk(linePayload.uom_id, { transaction });
                    if (uomObj && !isDecimalAllowedForUOM(uomObj) && (linePayload.quantity % 1 !== 0)) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`Quantity for UOM '${uomObj.uom_name}' must be a whole number (no decimals allowed) in line item ${index + 1}`);
                    }
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

            if (headerPayload.status === "APPROVED") {
                await InventoryService.syncPurchaseOrderStatus(createdHeader.id, CompanyId, transaction);
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

    // Fetch all purchase orders with pagination, sorting, advanced search, filtering, and pagination bypass option
    getAllPurchaseOrder: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const CompanyId = company?.id;
        const user_id = req.user?.id;

        if (!CompanyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const option = req.query.option === "true";
        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 10);
        const offset = (page - 1) * limit;
        const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

        const whereClause: any = {
            CompanyId,
        };

        // Active / Inactive filter
        if (req.query.isActive !== undefined && req.query.isActive !== "" && req.query.isActive !== "all") {
            whereClause.isActive = String(req.query.isActive).toLowerCase() === "true";
        } else if (req.query.showInactives !== undefined && req.query.showInactives !== "") {
            const showInactivesBool = String(req.query.showInactives).toLowerCase() === "true";
            if (!showInactivesBool) {
                whereClause.isActive = true;
            }
        }

        // Status filter
        if (req.query.status && req.query.status !== "" && req.query.status !== "ALL") {
            const statusVal = String(req.query.status).trim();
            if (statusVal === "PENDING_APPROVAL" || statusVal === "DRAFT") {
                whereClause.status = { [Op.in]: ["PENDING_APPROVAL", "DRAFT"] };
            } else if (statusVal === "PARTIALLY_RECEIVED" || statusVal === "PARTIAL_RECEIVED") {
                whereClause.status = { [Op.in]: ["PARTIALLY_RECEIVED", "PARTIAL_RECEIVED"] };
            } else if (statusVal === "CLOSED" || statusVal === "COMPLETED") {
                whereClause.status = { [Op.in]: ["CLOSED", "COMPLETED"] };
            } else {
                whereClause.status = statusVal;
            }
        }

        // Vendor filter
        const vendorId = req.query.vendorId || req.query.vendor_id;
        if (vendorId && vendorId !== "" && vendorId !== "ALL") {
            whereClause.vendor_id = Number(vendorId);
        }

        // Subsidiary filter
        const subsidiaryId = req.query.subsidiaryId || req.query.subsidiary_id;
        if (subsidiaryId && subsidiaryId !== "" && subsidiaryId !== "ALL") {
            whereClause.subsidiary_id = Number(subsidiaryId);
        }

        // Department filter
        const departmentId = req.query.departmentId || req.query.department_id;
        if (departmentId && departmentId !== "" && departmentId !== "ALL") {
            whereClause.department_id = Number(departmentId);
        }

        // Class filter
        const classId = req.query.classId || req.query.class_id;
        if (classId && classId !== "" && classId !== "ALL") {
            whereClause.class_id = Number(classId);
        }

        // Warehouse filter
        const warehouseId = req.query.warehouseId || req.query.warehouse_id;
        if (warehouseId && warehouseId !== "" && warehouseId !== "ALL") {
            whereClause.warehouse_id = Number(warehouseId);
        }

        // City / Location filter
        const cityId = req.query.cityId || req.query.city_id;
        if (cityId && cityId !== "" && cityId !== "ALL") {
            whereClause.city_id = Number(cityId);
        }

        // Date range filter on purchaseDate
        const fromDate = req.query.startDate || req.query.fromDate || req.query.start_date;
        const toDate = req.query.endDate || req.query.toDate || req.query.end_date;
        if (fromDate && toDate) {
            const start = new Date(fromDate as string);
            start.setHours(0, 0, 0, 0);
            const end = new Date(toDate as string);
            end.setHours(23, 59, 59, 999);
            whereClause.purchaseDate = {
                [Op.between]: [start, end],
            };
        } else if (fromDate) {
            const start = new Date(fromDate as string);
            start.setHours(0, 0, 0, 0);
            whereClause.purchaseDate = {
                [Op.gte]: start,
            };
        } else if (toDate) {
            const end = new Date(toDate as string);
            end.setHours(23, 59, 59, 999);
            whereClause.purchaseDate = {
                [Op.lte]: end,
            };
        }

        // Search condition
        if (search) {
            const matchingVendors = await Vendor.findAll({
                where: {
                    company_id: CompanyId,
                    [Op.or]: [
                        { company_name: { [Op.like]: `%${search}%` } },
                        { first_name: { [Op.like]: `%${search}%` } },
                        { last_name: { [Op.like]: `%${search}%` } },
                    ],
                },
                attributes: ["id"],
            });
            const vendorIds = matchingVendors.map((v: any) => v.id);

            const searchConditions: any[] = [
                { purchaseNo: { [Op.like]: `%${search}%` } },
                { work_order_no: { [Op.like]: `%${search}%` } },
                { remarks: { [Op.like]: `%${search}%` } },
            ];

            if (vendorIds.length > 0) {
                searchConditions.push({ vendor_id: { [Op.in]: vendorIds } });
            }

            if (!isNaN(Number(search))) {
                searchConditions.push({ id: Number(search) });
            }

            whereClause[Op.or] = searchConditions;
        }

        // Sort configuration
        const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy : "createdAt";
        const sortOrder = String(req.query.sortOrder || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

        const sortFieldMap: { [key: string]: any } = {
            id: [["id", sortOrder]],
            purchaseNo: [["purchaseNo", sortOrder]],
            purchaseDate: [["purchaseDate", sortOrder]],
            deliveryDate: [["deliveryDate", sortOrder]],
            status: [["status", sortOrder]],
            createdAt: [["createdAt", sortOrder]],
            updatedAt: [["updatedAt", sortOrder]],
        };

        const orderClause = sortFieldMap[sortBy] || [["createdAt", "DESC"]];

        const poIncludes = [
            {
                model: CityMaster,
                as: "city",
                attributes: ["id", "city_name"],
            },
            {
                model: Vendor,
                as: "vendor",
                attributes: ["id", "company_name", "first_name", "last_name", "salutation", "currency_id"],
                include: [
                    { association: "addressBook", include: ["city", "state"] },
                    { association: "currency" }
                ]
            },
            {
                model: CurrencyMaster,
                as: "currency",
                attributes: ["id", "currency_name", "currency_code", "currency_symbol"],
                required: false,
            },
            {
                model: VendorAddressBook,
                as: "vendorAddress",
                include: ["city", "state"],
                required: false,
            },
            {
                model: TransportationMode,
                as: "transportationMode",
                attributes: ["id", "mode_name"],
            },
            {
                model: Warehouse,
                as: "warehouse",
                attributes: ["id", "name"],
            },
            {
                model: Godown,
                as: "godown",
                attributes: ["id", "name"],
                required: false,
            },
            {
                model: Stack,
                as: "stack",
                attributes: ["id", "name"],
                required: false,
            },
            {
                model: SubsidiaryMaster,
                as: "subsidiary",
                attributes: ["id", "subsidiary_name"],
            },
            {
                model: ClassMaster,
                as: "class",
                required: false,
            },
            {
                model: DepartmentMaster,
                as: "department",
                required: false,
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
        ];

        // Bypass pagination if option is true
        if (option) {
            const purchaseOrders = await PurchaseOrder.findAll({
                where: whereClause,
                include: poIncludes,
                order: orderClause,
            });

            res.status(StatusCodes.OK).json({
                message: "Purchase orders fetched successfully",
                success: true,
                result: purchaseOrders,
                total: purchaseOrders.length,
            });
            return;
        }

        // Standard paginated response
        const total = await PurchaseOrder.count({ where: whereClause });
        const purchaseOrders = await PurchaseOrder.findAll({
            where: whereClause,
            include: poIncludes,
            offset,
            limit,
            order: orderClause,
        });

        res.status(StatusCodes.OK).json({
            message: "Purchase orders fetched successfully",
            success: true,
            result: purchaseOrders,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
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
                {
                    model: Vendor,
                    as: "vendor",
                    attributes: ["id", "company_name", "first_name", "last_name", "salutation", "currency_id"],
                    include: [
                        { association: "addressBook", include: ["city", "state"] },
                        { association: "currency" }
                    ]
                },
                {
                    model: VendorAddressBook,
                    as: "vendorAddress",
                    include: ["city", "state"],
                    required: false,
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
                    attributes: ["id", "name"],
                },
                {
                    model: SubsidiaryMaster,
                    as: "subsidiary",
                    attributes: ["id", "subsidiary_name"],
                },
                {
                    model: CurrencyMaster,
                    as: "currency",
                    required: false,
                },
                {
                    model: ClassMaster,
                    as: "class",
                    required: false,
                },
                {
                    model: DepartmentMaster,
                    as: "department",
                    required: false,
                },
                {
                    model: Godown,
                    as: "godown",
                    attributes: ["id", "name"],
                    required: false,
                },
                {
                    model: Stack,
                    as: "stack",
                    attributes: ["id", "name"],
                    required: false,
                },
                {
                    model: PurchaseOrderLine,
                    as: "purchaseOrderLines",
                    required: false,
                    include: [
                        itemIncludeConfig,
                        { model: HSNSACMaster, as: "hsnSac", attributes: ["id", "code", "taxPercentage"] },
                        { model: UOMMaster, as: "uom", attributes: ["id", "uom_name"] },
                        {
                            model: WorkCategory,
                            as: "workCategory",
                            attributes: ["id", "work_category_name"],
                        },
                    ],
                },
            ],
        });

        if (!purchaseOrder) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Purchase order not found");
        }

        let poResult: any = purchaseOrder.toJSON ? purchaseOrder.toJSON() : purchaseOrder;
        try {
            const summary = await InventoryService.getPurchaseOrderReceiptSummary(Number(id), CompanyId);

            const lineIds = Array.isArray(poResult.purchaseOrderLines)
                ? poResult.purchaseOrderLines.map((l: any) => Number(l.id)).filter(Boolean)
                : [];

            let billedLines: any[] = [];
            if (lineIds.length > 0) {
                billedLines = await PurchaseInvoiceLine.findAll({
                    where: {
                        poLineId: { [Op.in]: lineIds },
                    },
                    include: [{
                        model: PurchaseInvoiceHeader,
                        as: "invoiceHeader",
                        where: { status: { [Op.ne]: "CANCELLED" } },
                        required: true,
                    }],
                });
            }

            if (Array.isArray(poResult.purchaseOrderLines)) {
                poResult.purchaseOrderLines = poResult.purchaseOrderLines.map((line: any) => {
                    const lineSum = summary.lineSummaries.find((s: any) => Number(s.purchaseOrderLineId) === Number(line.id));
                    const receivedQty = lineSum?.previouslyReceivedQty ?? 0;
                    const acceptedQty = lineSum?.previouslyAcceptedQty ?? 0;
                    const lineBilledQty = billedLines
                        .filter((bl: any) => Number(bl.poLineId) === Number(line.id))
                        .reduce((sum, bl) => sum + Number(bl.quantity || 0), 0);
                    const recQtyForBilling = acceptedQty > 0 ? acceptedQty : receivedQty;
                    const unbilledQty = Math.max(0, recQtyForBilling - lineBilledQty);
                    const isFullyBilled = recQtyForBilling > 0 && unbilledQty <= 0;

                    return {
                        ...line,
                        receivedQuantity: receivedQty,
                        acceptedQuantity: acceptedQty,
                        rejectedQuantity: lineSum?.previouslyRejectedQty ?? 0,
                        remainingQuantity: lineSum?.remainingQty ?? Number(line.quantity || 0),
                        billedQuantity: lineBilledQty,
                        unbilledQuantity: unbilledQty,
                        isFullyReceived: lineSum?.isFullyReceived ?? false,
                        isFullyBilled,
                    };
                });
            }

            const totalBilledQty = Array.isArray(poResult.purchaseOrderLines)
                ? poResult.purchaseOrderLines.reduce((sum: number, l: any) => sum + Number(l.billedQuantity || 0), 0)
                : 0;
            const totalUnbilledQty = Array.isArray(poResult.purchaseOrderLines)
                ? poResult.purchaseOrderLines.reduce((sum: number, l: any) => sum + Number(l.unbilledQuantity || 0), 0)
                : 0;
            const totalRecForBilling = Array.isArray(poResult.purchaseOrderLines)
                ? poResult.purchaseOrderLines.reduce((sum: number, l: any) => sum + Number(l.acceptedQuantity > 0 ? l.acceptedQuantity : l.receivedQuantity || 0), 0)
                : 0;
            const isFullyBilled = totalRecForBilling > 0 && totalUnbilledQty <= 0;

            poResult.receiptSummary = {
                totalOrderedQty: summary.totalOrderedQty,
                totalReceivedQty: summary.totalReceivedQty,
                totalRemainingQty: summary.totalRemainingQty,
                totalBilledQty,
                totalUnbilledQty,
                isFullyReceived: summary.isFullyReceived,
                isFullyBilled,
            };
        } catch (e) {
            console.error("Error calculating PO receipt summary:", e);
        }

        res.status(StatusCodes.OK).json({
            message: "Purchase order fetched successfully",
            success: true,
            result: poResult,
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

            const currentStatus = String(existingPurchaseOrder.status || "").toUpperCase();
            if (currentStatus !== "PENDING_APPROVAL" && currentStatus !== "DRAFT") {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Cannot update Purchase Order. Only Purchase Orders in 'Pending Approval' status can be edited.");
            }

            let vendor_address_id = normalizeOptionalId(header.vendor_address_id ?? header.vendorAddressId);
            let billing_address = header.billing_address ? String(header.billing_address).trim() : null;
            const vendor_id = normalizeOptionalId(header.vendor_id ?? header.vendorId ?? existingPurchaseOrder.vendor_id);

            // Auto-resolve billing address from vendor's address book or vendor master if not explicitly provided
            if (!billing_address && (vendor_address_id || vendor_id)) {
                if (vendor_address_id) {
                    const addr = await VendorAddressBook.findByPk(vendor_address_id, {
                        include: [
                            { model: CityMaster, as: "city", attributes: ["id", "city_name"], required: false },
                            { model: StateCode, as: "state", attributes: ["id", "state_name"], required: false }
                        ],
                        transaction
                    });
                    if (addr) {
                        billing_address = formatAddressBookRecord(addr);
                    }
                }

                if (!billing_address && vendor_id) {
                    const defaultAddr = await VendorAddressBook.findOne({
                        where: { vendor_id, default_billing: true },
                        include: [
                            { model: CityMaster, as: "city", attributes: ["id", "city_name"], required: false },
                            { model: StateCode, as: "state", attributes: ["id", "state_name"], required: false }
                        ],
                        transaction
                    }) || await VendorAddressBook.findOne({
                        where: { vendor_id },
                        include: [
                            { model: CityMaster, as: "city", attributes: ["id", "city_name"], required: false },
                            { model: StateCode, as: "state", attributes: ["id", "state_name"], required: false }
                        ],
                        transaction
                    });

                    if (defaultAddr) {
                        vendor_address_id = defaultAddr.id;
                        billing_address = formatAddressBookRecord(defaultAddr);
                    } else {
                        const vendorObj = await Vendor.findByPk(vendor_id, { transaction });
                        if (vendorObj && vendorObj.address) {
                            billing_address = vendorObj.address;
                        }
                    }
                }
            }

            const headerPayload: any = {
                purchaseNo: String(header.purchaseNo || "").trim(),
                vendor_id,
                purchaseDate: header.purchaseDate ? new Date(header.purchaseDate) : null,
                deliveryDate: header.deliveryDate ? new Date(header.deliveryDate) : null,
                deliveredDate: header.deliveredDate ? new Date(header.deliveredDate) : null,
                shipped_from: header.shipped_from || null,
                shipped_to: header.shipped_to || null,
                city_id: normalizeOptionalId(header.city_id),
                work_order_no: header.work_order_no ? String(header.work_order_no).trim() : null,
                transportation_mode_id: normalizeOptionalId(header.transportation_mode_id),
                vehicleNumber: header.vehicleNumber || null,
                transporterName: header.transporterName || null,
                driverName: header.driverName || null,
                driverPhone: header.driverPhone || null,
                warehouse_id: normalizeOptionalId(header.warehouse_id),
                godown_id: normalizeOptionalId(header.godown_id),
                stack_id: normalizeOptionalId(header.stack_id),
                subsidiary_id: normalizeOptionalId(header.subsidiary_id),
                currency_id: normalizeOptionalId(header.currency_id),
                vendor_address_id,
                billing_address,
                class_id: normalizeOptionalId(header.class_id),
                department_id: normalizeOptionalId(header.department_id),
                status: normalizePurchaseOrderStatus(header.status || existingPurchaseOrder.status, existingPurchaseOrder.status || "PENDING_APPROVAL"),
                isActive: header.isActive !== undefined ? Boolean(header.isActive) : existingPurchaseOrder.isActive,
                remarks: header.remarks || null,
                CompanyId,
                user_id,
            };

            // Validation similar to create
            if (!headerPayload.purchaseNo) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("purchaseNo is required");
            }
            if (!headerPayload.vendor_id) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("vendor is required");
            }
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
                throw new Error("city is required");
            }
            if (!headerPayload.subsidiary_id) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("subsidiary is required");
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
                const discountPercent = lineItem.discount_percent !== undefined && lineItem.discount_percent !== ""
                    ? Number(lineItem.discount_percent)
                    : (lineItem.discountPercent !== undefined && lineItem.discountPercent !== "" ? Number(lineItem.discountPercent) : 0);

                const taxRate =
                    lineItem.tax_rate !== undefined && lineItem.tax_rate !== ""
                        ? Number(lineItem.tax_rate)
                        : 0;

                const grossAmount = rate !== null ? quantity * rate : 0;
                const discountAmount = lineItem.discount_amount !== undefined && lineItem.discount_amount !== ""
                    ? Number(lineItem.discount_amount)
                    : Number(((grossAmount * discountPercent) / 100).toFixed(2));

                const taxableAmount = grossAmount - discountAmount;
                const subtotal = lineItem.subtotal !== undefined && lineItem.subtotal !== ""
                    ? Number(lineItem.subtotal)
                    : Number(grossAmount.toFixed(2));
                const amount =
                    lineItem.amount !== undefined && lineItem.amount !== ""
                        ? Number(lineItem.amount)
                        : grossAmount;
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
                    work_order_no: lineItem.work_order_no ? String(lineItem.work_order_no).trim() : null,
                    lot_number: lineItem.lot_number || null,
                    quantity,
                    uom_id: Number(lineItem.uom_id),
                    rate,
                    amount,
                    discount_percent: discountPercent,
                    discount_amount: discountAmount,
                    subtotal,
                    indian_tax_nature: lineItem.indian_tax_nature || lineItem.ndian_tax_nature || null,
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
                    throw new Error("item is required in each line item");
                }
                if (!linePayload.uom_id) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error("uom is required in each line item");
                }

                if (linePayload.uom_id) {
                    const uomObj = await UOMMaster.findByPk(linePayload.uom_id, { transaction });
                    if (uomObj && !isDecimalAllowedForUOM(uomObj) && (linePayload.quantity % 1 !== 0)) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`Quantity for UOM '${uomObj.uom_name}' must be a whole number (no decimals allowed).`);
                    }
                }
                if (!linePayload.uom_id) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error("uom is required in each line item");
                }
                if (linePayload.rate !== null && linePayload.rate !== undefined && linePayload.rate < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error("rate cannot be negative in each line item");
                }

                const createdLine = await PurchaseOrderLine.create(linePayload, { transaction });
                updatedLineItems.push(createdLine);
            }

            if (headerPayload.status === "APPROVED") {
                await InventoryService.syncPurchaseOrderStatus(existingPurchaseOrder.id, CompanyId, transaction);
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

    // Update only the status or active state of a purchase order
    updateStatusOfPurchaseOrder: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { status, isActive } = req.body;

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

        const updatePayload: any = {};
        let targetStatus: string | null = null;

        if (status) {
            const currentStatus = normalizePurchaseOrderStatus(purchaseOrder.status, "PENDING_APPROVAL");
            if (currentStatus !== "PENDING_APPROVAL") {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Cannot change status. Once a Purchase Order is approved, its status cannot be manually changed.");
            }

            targetStatus = normalizePurchaseOrderStatus(status);
            const allowedManualStatuses = ["PENDING_APPROVAL", "APPROVED", "REJECTED"];
            if (!allowedManualStatuses.includes(targetStatus)) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error(`Invalid status '${status}'. Manual status updates can only be set to 'Pending Approval', 'Approved', or 'Rejected'.`);
            }

            updatePayload.status = targetStatus;
        }

        if (isActive !== undefined) {
            updatePayload.isActive = Boolean(isActive);
        }

        if (Object.keys(updatePayload).length === 0) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Status or isActive is required");
        }

        await purchaseOrder.update(updatePayload);

        // If updated to APPROVED, trigger sync to evaluate any existing downstream transactions
        if (targetStatus === "APPROVED") {
            await InventoryService.syncPurchaseOrderStatus(purchaseOrder.id, CompanyId);
            await purchaseOrder.reload();
        }

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Purchase order updated successfully",
            result: purchaseOrder,
        });
    }),

    // Toggle active/inactive status of a purchase order
    toggleActivePurchaseOrder: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { isActive } = req.body;

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

        const nextActiveState = isActive !== undefined ? Boolean(isActive) : !purchaseOrder.isActive;
        await purchaseOrder.update({ isActive: nextActiveState });

        res.status(StatusCodes.OK).json({
            success: true,
            message: `Purchase order ${nextActiveState ? "activated" : "deactivated"} successfully`,
            result: purchaseOrder,
        });
    }),

    // Bulk toggle active/inactive status of purchase orders
    bulkToggleActivePurchaseOrder: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { ids, isActive } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("An array of purchase order IDs is required");
        }

        if (typeof isActive !== "boolean") {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("isActive (boolean) is required");
        }

        const company = await findCompanyForUser(req.user);
        const CompanyId = company?.id;
        const user_id = req.user?.id;

        if (!CompanyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const [affectedCount] = await PurchaseOrder.update(
            { isActive },
            {
                where: {
                    id: { [Op.in]: ids.map(Number) },
                    CompanyId,
                },
            }
        );

        res.status(StatusCodes.OK).json({
            success: true,
            message: `${affectedCount} Purchase Order(s) ${isActive ? "activated" : "deactivated"} successfully`,
            affectedCount,
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

        // Check if GRN header exists for this PO
        const linkedGRN = await GRN.findOne({
            where: {
                purchaseOrderId: purchaseOrder.id
            } as any
        });

        if (linkedGRN) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Cannot delete Purchase Order because a Goods Receipt Note (GRN) has already been created against it.");
        }

        // Check if Purchase Invoice header exists for this PO
        const linkedInvoice = await PurchaseInvoiceHeader.findOne({
            where: {
                poHeaderId: purchaseOrder.id
            } as any
        });

        if (linkedInvoice) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Cannot delete Purchase Order because a Vendor Bill has already been created against it.");
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

    // Export purchase orders and line items to CSV based on filters
    exportPurchaseOrdersCSV: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const CompanyId = company?.id;
        const user_id = req.user?.id;

        if (!CompanyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

        const whereClause: any = {
            CompanyId,
        };

        // Active / Inactive filter
        if (req.query.isActive !== undefined && req.query.isActive !== "" && req.query.isActive !== "all") {
            whereClause.isActive = String(req.query.isActive).toLowerCase() === "true";
        } else if (req.query.showInactives !== undefined && req.query.showInactives !== "") {
            const showInactivesBool = String(req.query.showInactives).toLowerCase() === "true";
            if (!showInactivesBool) {
                whereClause.isActive = true;
            }
        }

        // Status filter
        if (req.query.status && req.query.status !== "" && req.query.status !== "ALL") {
            const statusVal = String(req.query.status).trim();
            if (statusVal === "PENDING_APPROVAL" || statusVal === "DRAFT") {
                whereClause.status = { [Op.in]: ["PENDING_APPROVAL", "DRAFT"] };
            } else if (statusVal === "PARTIALLY_RECEIVED" || statusVal === "PARTIAL_RECEIVED") {
                whereClause.status = { [Op.in]: ["PARTIALLY_RECEIVED", "PARTIAL_RECEIVED"] };
            } else if (statusVal === "CLOSED" || statusVal === "COMPLETED") {
                whereClause.status = { [Op.in]: ["CLOSED", "COMPLETED"] };
            } else {
                whereClause.status = statusVal;
            }
        }

        // Vendor filter
        const vendorId = req.query.vendorId || req.query.vendor_id;
        if (vendorId && vendorId !== "" && vendorId !== "ALL") {
            whereClause.vendor_id = Number(vendorId);
        }

        // Subsidiary filter
        const subsidiaryId = req.query.subsidiaryId || req.query.subsidiary_id;
        if (subsidiaryId && subsidiaryId !== "" && subsidiaryId !== "ALL") {
            whereClause.subsidiary_id = Number(subsidiaryId);
        }

        // Department filter
        const departmentId = req.query.departmentId || req.query.department_id;
        if (departmentId && departmentId !== "" && departmentId !== "ALL") {
            whereClause.department_id = Number(departmentId);
        }

        // Class filter
        const classId = req.query.classId || req.query.class_id;
        if (classId && classId !== "" && classId !== "ALL") {
            whereClause.class_id = Number(classId);
        }

        // Warehouse filter
        const warehouseId = req.query.warehouseId || req.query.warehouse_id;
        if (warehouseId && warehouseId !== "" && warehouseId !== "ALL") {
            whereClause.warehouse_id = Number(warehouseId);
        }

        // City / Location filter
        const cityId = req.query.cityId || req.query.city_id;
        if (cityId && cityId !== "" && cityId !== "ALL") {
            whereClause.city_id = Number(cityId);
        }

        // Date range filter on purchaseDate
        const fromDate = req.query.startDate || req.query.fromDate || req.query.start_date;
        const toDate = req.query.endDate || req.query.toDate || req.query.end_date;
        if (fromDate && toDate) {
            const start = new Date(fromDate as string);
            start.setHours(0, 0, 0, 0);
            const end = new Date(toDate as string);
            end.setHours(23, 59, 59, 999);
            whereClause.purchaseDate = {
                [Op.between]: [start, end],
            };
        } else if (fromDate) {
            const start = new Date(fromDate as string);
            start.setHours(0, 0, 0, 0);
            whereClause.purchaseDate = {
                [Op.gte]: start,
            };
        } else if (toDate) {
            const end = new Date(toDate as string);
            end.setHours(23, 59, 59, 999);
            whereClause.purchaseDate = {
                [Op.lte]: end,
            };
        }

        // Search condition
        if (search) {
            const matchingVendors = await Vendor.findAll({
                where: {
                    company_id: CompanyId,
                    [Op.or]: [
                        { company_name: { [Op.like]: `%${search}%` } },
                        { first_name: { [Op.like]: `%${search}%` } },
                        { last_name: { [Op.like]: `%${search}%` } },
                    ],
                },
                attributes: ["id"],
            });
            const vendorIds = matchingVendors.map((v: any) => v.id);

            const searchConditions: any[] = [
                { purchaseNo: { [Op.like]: `%${search}%` } },
                { work_order_no: { [Op.like]: `%${search}%` } },
                { remarks: { [Op.like]: `%${search}%` } },
            ];

            if (vendorIds.length > 0) {
                searchConditions.push({ vendor_id: { [Op.in]: vendorIds } });
            }

            if (!isNaN(Number(search))) {
                searchConditions.push({ id: Number(search) });
            }

            whereClause[Op.or] = searchConditions;
        }

        // Sort configuration
        const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy : "createdAt";
        const sortOrder = String(req.query.sortOrder || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

        const sortFieldMap: { [key: string]: any } = {
            id: [["id", sortOrder]],
            purchaseNo: [["purchaseNo", sortOrder]],
            purchaseDate: [["purchaseDate", sortOrder]],
            deliveryDate: [["deliveryDate", sortOrder]],
            status: [["status", sortOrder]],
            createdAt: [["createdAt", sortOrder]],
            updatedAt: [["updatedAt", sortOrder]],
        };

        const orderClause = sortFieldMap[sortBy] || [["createdAt", "DESC"]];

        const poIncludes = [
            {
                model: CityMaster,
                as: "city",
                attributes: ["id", "city_name"],
                required: false,
            },
            {
                model: Vendor,
                as: "vendor",
                attributes: ["id", "entity_id", "company_name", "first_name", "last_name", "salutation", "email", "phone"],
                include: [
                    { association: "addressBook", include: ["city", "state"] },
                    { association: "currency" }
                ],
                required: false,
            },
            {
                model: CurrencyMaster,
                as: "currency",
                attributes: ["id", "currency_name", "currency_code", "currency_symbol"],
                required: false,
            },
            {
                model: VendorAddressBook,
                as: "vendorAddress",
                include: ["city", "state"],
                required: false,
            },
            {
                model: SubsidiaryMaster,
                as: "subsidiary",
                attributes: ["id", "subsidiary_name"],
                required: false,
            },
            {
                model: ClassMaster,
                as: "class",
                required: false,
            },
            {
                model: DepartmentMaster,
                as: "department",
                required: false,
            },
            {
                model: User,
                as: "user",
                attributes: ["id", "FirstName", "LastName", "Email"],
                required: false,
            },
            {
                model: PurchaseOrderLine,
                as: "purchaseOrderLines",
                required: false,
                include: [
                    {
                        model: ItemMaster,
                        as: "item",
                        attributes: ["id", "item_code", "item_name", "item_desc"],
                    },
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
        ];

        const purchaseOrders = await PurchaseOrder.findAll({
            where: whereClause,
            include: poIncludes,
            order: orderClause,
        });

        // Helper function for human-readable status labels
        const getStatusText = (status?: string | null): string => {
            const s = String(status || "").toUpperCase().replace(/\s+/g, "_");
            switch (s) {
                case "PENDING_APPROVAL":
                case "DRAFT":
                    return "Pending Approval";
                case "APPROVED":
                    return "Approved";
                case "REJECTED":
                    return "Rejected";
                case "PENDING_RECEIPT":
                    return "Pending Receipt";
                case "PARTIALLY_RECEIVED":
                case "PARTIAL_RECEIVED":
                    return "Partially Received";
                case "RECEIVED":
                    return "Received";
                case "PENDING_BILLING":
                    return "Pending Billing";
                case "PARTIALLY_BILLED":
                case "PARTIAL_BILLED":
                    return "Partially Billed";
                case "FULLY_BILLED":
                    return "Fully Billed";
                case "CLOSED":
                case "COMPLETED":
                    return "Closed";
                case "CANCELLED":
                    return "Cancelled";
                default:
                    return status ? String(status).replace(/_/g, " ") : "Pending Approval";
            }
        };

        const formatDateVal = (dateVal: any) => {
            if (!dateVal) return "";
            try {
                return new Date(dateVal).toISOString().split("T")[0];
            } catch {
                return String(dateVal);
            }
        };

        const csvRows: any[] = [];

        purchaseOrders.forEach((po: any) => {
            const poLines = po.purchaseOrderLines || po.line_items || po.lineItems || [];
            
            const vendorCode = po.vendor?.entity_id || "";
            const vendorName = po.vendor?.company_name ||
                [po.vendor?.salutation, po.vendor?.first_name, po.vendor?.last_name].filter(Boolean).join(" ") ||
                (po.vendor_id ? `Vendor #${po.vendor_id}` : "");

            const currencyName = po.currency?.currency_name || po.currency?.currency_code || po.vendor?.currency?.currency_code || "INR";
            const billingAddressStr = po.billing_address || formatAddressBookRecord(po.vendorAddress) || "";
            const createdByName = [po.user?.FirstName, po.user?.LastName].filter(Boolean).join(" ") || po.user?.Email || "";

            const poSubtotal = poLines.reduce((acc: number, l: any) => acc + Number(l.subtotal || l.amount || (Number(l.rate || 0) * Number(l.quantity || 0))), 0);
            const poDiscountTotal = poLines.reduce((acc: number, l: any) => acc + Number(l.discount_amount || 0), 0);
            const poTaxTotal = poLines.reduce((acc: number, l: any) => acc + Number(l.tax_amount || 0), 0);
            const poTotalAmount = poLines.reduce((acc: number, l: any) => acc + Number(l.line_total || 0), 0);

            if (poLines.length > 0) {
                poLines.forEach((line: any, idx: number) => {
                    csvRows.push({
                        "PO Internal ID": po.id,
                        "PO #": po.purchaseNo || "",
                        "Date": formatDateVal(po.purchaseDate),
                        "Receive By Date": formatDateVal(po.deliveryDate),
                        "Status": getStatusText(po.status),
                        "Vendor Code": vendorCode,
                        "Vendor Name": vendorName,
                        "Vendor Email": po.vendor?.email || "",
                        "Vendor Phone": po.vendor?.phone || "",
                        "Subsidiary": po.subsidiary?.subsidiary_name || "",
                        "Location": po.city?.city_name || "",
                        "Class": po.class?.class_name || po.class?.name || "",
                        "Department": po.department?.department_name || po.department?.name || "",
                        "Currency": currencyName,
                        "Billing Address": billingAddressStr,
                        "Active": po.isActive !== false ? "Active" : "Inactive",
                        "PO Total Lines": poLines.length,
                        "PO Subtotal": poSubtotal.toFixed(2),
                        "PO Discount Total": poDiscountTotal.toFixed(2),
                        "PO Tax Total": poTaxTotal.toFixed(2),
                        "PO Total Amount": poTotalAmount.toFixed(2),
                        "Header Remarks": po.remarks || "",
                        "Created By": createdByName,
                        "Created Date": formatDateVal(po.createdAt),
                        "Last Updated Date": formatDateVal(po.updatedAt),
                        // Line item columns
                        "Line #": idx + 1,
                        "Item Code": line.item?.item_code || "",
                        "Item Name": line.item?.item_name || "",
                        "Item Description": line.item?.item_desc || "",
                        "Quantity": Number(line.quantity || 0),
                        "UOM": line.uom?.uom_name || "",
                        "Rate": Number(line.rate || 0).toFixed(2),
                        "Amount": Number(line.amount || 0).toFixed(2),
                        "Discount %": Number(line.discount_percent || 0),
                        "Discount Amount": Number(line.discount_amount || 0).toFixed(2),
                        "Subtotal": Number(line.subtotal || 0).toFixed(2),
                        "Tax Rate %": Number(line.tax_rate || 0),
                        "Tax Amount": Number(line.tax_amount || 0).toFixed(2),
                        "Line Total": Number(line.line_total || 0).toFixed(2),
                        "HSN/SAC Code": line.hsnSac?.code || "",
                        "Tax Nature": line.indian_tax_nature || "",
                        "Work Category": line.workCategory?.work_category_name || "",
                        "Lot Number": line.lot_number || "",
                        "Line Status": line.status || "",
                        "Line Remarks": line.remarks || "",
                    });
                });
            } else {
                csvRows.push({
                    "PO Internal ID": po.id,
                    "PO #": po.purchaseNo || "",
                    "Date": formatDateVal(po.purchaseDate),
                    "Receive By Date": formatDateVal(po.deliveryDate),
                    "Status": getStatusText(po.status),
                    "Vendor Code": vendorCode,
                    "Vendor Name": vendorName,
                    "Vendor Email": po.vendor?.email || "",
                    "Vendor Phone": po.vendor?.phone || "",
                    "Subsidiary": po.subsidiary?.subsidiary_name || "",
                    "Location": po.city?.city_name || "",
                    "Class": po.class?.class_name || po.class?.name || "",
                    "Department": po.department?.department_name || po.department?.name || "",
                    "Currency": currencyName,
                    "Billing Address": billingAddressStr,
                    "Active": po.isActive !== false ? "Active" : "Inactive",
                    "PO Total Lines": 0,
                    "PO Subtotal": "0.00",
                    "PO Discount Total": "0.00",
                    "PO Tax Total": "0.00",
                    "PO Total Amount": "0.00",
                    "Header Remarks": po.remarks || "",
                    "Created By": createdByName,
                    "Created Date": formatDateVal(po.createdAt),
                    "Last Updated Date": formatDateVal(po.updatedAt),
                    // Line item columns (empty)
                    "Line #": "",
                    "Item Code": "",
                    "Item Name": "",
                    "Item Description": "",
                    "Quantity": "",
                    "UOM": "",
                    "Rate": "",
                    "Amount": "",
                    "Discount %": "",
                    "Discount Amount": "",
                    "Subtotal": "",
                    "Tax Rate %": "",
                    "Tax Amount": "",
                    "Line Total": "",
                    "HSN/SAC Code": "",
                    "Tax Nature": "",
                    "Work Category": "",
                    "Lot Number": "",
                    "Line Status": "",
                    "Line Remarks": "",
                });
            }
        });

        const defaultHeaders = [
            "PO Internal ID",
            "PO #",
            "Date",
            "Receive By Date",
            "Status",
            "Vendor Code",
            "Vendor Name",
            "Vendor Email",
            "Vendor Phone",
            "Subsidiary",
            "Location",
            "Class",
            "Department",
            "Currency",
            "Billing Address",
            "Active",
            "PO Total Lines",
            "PO Subtotal",
            "PO Discount Total",
            "PO Tax Total",
            "PO Total Amount",
            "Header Remarks",
            "Created By",
            "Created Date",
            "Last Updated Date",
            "Line #",
            "Item Code",
            "Item Name",
            "Item Description",
            "Quantity",
            "UOM",
            "Rate",
            "Amount",
            "Discount %",
            "Discount Amount",
            "Subtotal",
            "Tax Rate %",
            "Tax Amount",
            "Line Total",
            "HSN/SAC Code",
            "Tax Nature",
            "Work Category",
            "Lot Number",
            "Line Status",
            "Line Remarks",
        ];

        const headers = csvRows.length > 0 ? Object.keys(csvRows[0]) : defaultHeaders;

        const csvContent = [
            headers.join(","),
            ...csvRows.map((row) =>
                headers
                    .map((header) => {
                        const value = row[header] !== undefined && row[header] !== null ? String(row[header]) : "";
                        // Escape commas, quotes, and newlines in CSV
                        if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value;
                    })
                    .join(",")
            ),
        ].join("\n");

        const filename = `purchase_orders_export_${new Date().toISOString().split("T")[0]}.csv`;
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

        res.status(StatusCodes.OK).send(csvContent);
    }),
};

export default PurchaseOrderController;