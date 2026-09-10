import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import { findCompanyForUser } from "../../../../utils/findCompanyForUser";
import { normalizePurchaseReturnStatus, isPurchaseReturnEditable } from "../../../../utils/p2pStatus";
import { CustomRequest } from "../../../../typeRequest/customReq";
import sequelize from "../../../../dbconfig/dbconfig";
import { PurchaseReturnHeader, PurchaseReturnLine } from "../../../../modals/Transactions/purchase/purchaseReturn";
import PurchaseInvoiceHeader from "../../../../modals/Transactions/purchase/purchaseInvoice/purchaseInvoiceHeader";
import PurchaseOrder from "../../../../modals/Transactions/purchase/purchaseOrder/purchaseOrderHeader";
import { GRN, GRNLine } from "../../../../modals/Transactions/purchase/GRN";
import VendorDetails from "../../../../modals/masters/vendorDetails/vendorDetails";
import ItemMaster from "../../../../modals/masters/items/itemMaster";
import { InventoryService } from "../../../../utils/inventoryService";
import { GLImpactService } from "../../../../utils/glImpactService";
import { generateSequentialDocNumber } from "../../../../utils/documentNumberHelper";

import ChartOfAccountMaster from "../../../../modals/masters/chartOfAccount/chartOfAccount";

const normalizeOptionalId = (value: unknown) => {
    if (value === null || value === undefined || value === "") {
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
            const status = normalizePurchaseReturnStatus(header.status, "PENDING_APPROVAL");

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

            let autoReturnNo = String(header.returnNumber || "").trim();
            if (!autoReturnNo || autoReturnNo.startsWith("PR-NEW") || autoReturnNo === "To Be Generated" || autoReturnNo.startsWith("PR-17")) {
                autoReturnNo = await generateSequentialDocNumber(
                    PurchaseReturnHeader,
                    "returnNumber",
                    "PR",
                    "companyId",
                    companyId,
                    transaction
                );
            } else {
                const exists = await PurchaseReturnHeader.findOne({
                    where: { returnNumber: autoReturnNo, companyId },
                    transaction
                });
                if (exists) {
                    autoReturnNo = await generateSequentialDocNumber(
                        PurchaseReturnHeader,
                        "returnNumber",
                        "PR",
                        "companyId",
                        companyId,
                        transaction
                    );
                }
            }
            headerPayload.returnNumber = autoReturnNo;

            if (!headerPayload.vendorId) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("vendorId is required");
            }
            if (!headerPayload.returnDate || Number.isNaN(headerPayload.returnDate.getTime())) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid returnDate is required");
            }

            if (headerPayload.purchaseOrderHeaderId) {
                const po = await PurchaseOrder.findOne({ where: { id: headerPayload.purchaseOrderHeaderId, CompanyId: companyId }, transaction });
                if (po && po.isActive === false) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`Cannot create Purchase Return for Purchase Order ${po.purchaseNo || po.id} because it is deactivated/inactive.`);
                }
            }
            if (headerPayload.grnHeaderId) {
                const grn = await GRN.findOne({ where: { id: headerPayload.grnHeaderId, CompanyId: companyId }, transaction });
                if (grn && grn.purchaseOrderId) {
                    const po = await PurchaseOrder.findOne({ where: { id: grn.purchaseOrderId, CompanyId: companyId }, transaction });
                    if (po && po.isActive === false) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`Cannot create Purchase Return for GRN ${grn.grnNo} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
                    }
                }
            }
            if (headerPayload.purchaseInvoiceHeaderId) {
                const inv = await PurchaseInvoiceHeader.findOne({ where: { id: headerPayload.purchaseInvoiceHeaderId, companyId }, transaction });
                if (inv) {
                    if (inv.poHeaderId) {
                        const po = await PurchaseOrder.findOne({ where: { id: inv.poHeaderId, CompanyId: companyId }, transaction });
                        if (po && po.isActive === false) {
                            res.status(StatusCodes.BAD_REQUEST);
                            throw new Error(`Cannot create Purchase Return for Bill ${inv.invoiceNumber} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
                        }
                    }
                    if (inv.grnHeaderId) {
                        const grn = await GRN.findOne({ where: { id: inv.grnHeaderId, CompanyId: companyId }, transaction });
                        if (grn && grn.purchaseOrderId) {
                            const po = await PurchaseOrder.findOne({ where: { id: grn.purchaseOrderId, CompanyId: companyId }, transaction });
                            if (po && po.isActive === false) {
                                res.status(StatusCodes.BAD_REQUEST);
                                throw new Error(`Cannot create Purchase Return for Bill ${inv.invoiceNumber} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
                            }
                        }
                    }
                }
            }

            let totalSubtotal = 0;
            let totalDiscount = 0;
            let totalTax = 0;
            let totalAmount = 0;

            const preparedLines: any[] = [];

            for (let index = 0; index < lineItems.length; index++) {
                const lineItem = lineItems[index];
                const returnQty = Number(lineItem.returnQty);
                const rejectedQty = lineItem.rejectedQty !== undefined ? Number(lineItem.rejectedQty) : 0;
                const damagedQty = lineItem.damagedQty !== undefined ? Number(lineItem.damagedQty) : 0;
                const unitPrice = Number(lineItem.unitPrice);

                let resolvedGrnLineId = normalizeOptionalId(lineItem.grnLineId);
                if (resolvedGrnLineId) {
                    const existingGrnLine = await GRNLine.findByPk(resolvedGrnLineId, { transaction });
                    if (existingGrnLine) {
                        const receivedQty = Number((existingGrnLine as any).acceptedQty > 0 ? (existingGrnLine as any).acceptedQty : (existingGrnLine as any).receivedQty || 0);
                        if (receivedQty > 0) {
                            const previousLines = await PurchaseReturnLine.findAll({
                                where: { grnLineId: resolvedGrnLineId },
                                include: [{
                                    model: PurchaseReturnHeader,
                                    as: "purchaseReturnHeader",
                                    where: { status: { [Op.ne]: "CANCELLED" } }
                                }],
                                transaction
                            });

                            const previouslyReturnedQty = previousLines.reduce((sum, l) => sum + Number(l.returnQty || 0), 0);
                            const availableReturnQty = receivedQty - previouslyReturnedQty;

                            if (returnQty > availableReturnQty) {
                                res.status(StatusCodes.BAD_REQUEST);
                                throw new Error(`Cannot return ${returnQty} units for item. Max returnable quantity for GRN line is ${availableReturnQty} (Received: ${receivedQty}, Previously Returned: ${previouslyReturnedQty}).`);
                            }
                        }
                    } else {
                        resolvedGrnLineId = null;
                    }
                }

                if (!lineItem.itemId) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`itemId is required in line item ${index + 1}`);
                }
                if (!returnQty || returnQty <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`returnQty must be greater than zero in line item ${index + 1}`);
                }
                if (unitPrice < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`unitPrice cannot be negative in line item ${index + 1}`);
                }

                const grossLineAmount = Number((returnQty * unitPrice).toFixed(2));
                const discountPercent = lineItem.discountPercent !== undefined && lineItem.discountPercent !== null ? Number(lineItem.discountPercent) : 0;
                let discountAmount = lineItem.discountAmount !== undefined && lineItem.discountAmount !== null ? Number(lineItem.discountAmount) : 0;
                if (discountPercent > 0 && discountAmount === 0) {
                    discountAmount = Number(((grossLineAmount * discountPercent) / 100).toFixed(2));
                }

                const taxableLineAmount = Math.max(0, Number((grossLineAmount - discountAmount).toFixed(2)));
                const taxPercent = lineItem.taxPercent !== undefined && lineItem.taxPercent !== null ? Number(lineItem.taxPercent) : 0;
                let taxAmount = lineItem.taxAmount !== undefined && lineItem.taxAmount !== null ? Number(lineItem.taxAmount) : 0;
                if (taxPercent > 0 && taxAmount === 0) {
                    taxAmount = Number(((taxableLineAmount * taxPercent) / 100).toFixed(2));
                }

                const lineTotal = lineItem.lineTotal !== undefined && lineItem.lineTotal !== null && Number(lineItem.lineTotal) > 0
                    ? Number(Number(lineItem.lineTotal).toFixed(2))
                    : Number((taxableLineAmount + taxAmount).toFixed(2));

                totalSubtotal += grossLineAmount;
                totalDiscount += discountAmount;
                totalTax += taxAmount;
                totalAmount += lineTotal;

                preparedLines.push({
                    grnLineId: resolvedGrnLineId,
                    itemId: Number(lineItem.itemId),
                    batchNo: lineItem.batchNo || null,
                    returnQty,
                    rejectedQty,
                    damagedQty,
                    unitPrice,
                    discountPercent,
                    discountAmount,
                    taxPercent,
                    taxAmount,
                    lineTotal,
                    reason: lineItem.reason || null,
                    remarks: lineItem.remarks || null,
                });
            }

            headerPayload.subtotal = Number(totalSubtotal.toFixed(2));
            headerPayload.discountAmount = Number(totalDiscount.toFixed(2));
            headerPayload.taxAmount = Number(totalTax.toFixed(2));
            headerPayload.totalAmount = Number(totalAmount.toFixed(2));

            const createdHeader = await PurchaseReturnHeader.create(headerPayload, { transaction });
            const createdLineItems: any[] = [];

            for (const linePayload of preparedLines) {
                const createdLine = await PurchaseReturnLine.create({
                    ...linePayload,
                    returnHeaderId: createdHeader.id,
                }, { transaction });
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

        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.max(1, Number(req.query.limit) || 10);
        const offset = (page - 1) * limit;
        const { search, status, vendorId, startDate, endDate } = req.query;
        const option = String(req.query.option) === "true" || (req.query.option as any) === true;

        const whereClause: any = { companyId };

        if (status) {
            whereClause.status = status;
        }

        if (vendorId) {
            whereClause.vendorId = Number(vendorId);
        }

        if (startDate && endDate) {
            whereClause.returnDate = {
                [Op.between]: [new Date(String(startDate)), new Date(String(endDate))]
            };
        } else if (startDate) {
            whereClause.returnDate = { [Op.gte]: new Date(String(startDate)) };
        } else if (endDate) {
            whereClause.returnDate = { [Op.lte]: new Date(String(endDate)) };
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
                { returnNumber: { [Op.like]: `%${searchStr}%` } },
                { reason: { [Op.like]: `%${searchStr}%` } },
                { remarks: { [Op.like]: `%${searchStr}%` } }
            ];

            if (vIds.length > 0) {
                searchOr.push({ vendorId: { [Op.in]: vIds } });
            }

            if (!isNaN(Number(searchStr))) {
                searchOr.push({ id: Number(searchStr) });
            }

            whereClause[Op.or] = searchOr;
        }

        const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy : "createdAt";
        const sortOrder = String(req.query.sortOrder || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

        const sortFieldMap: { [key: string]: any } = {
            id: [["id", sortOrder]],
            returnNumber: [["returnNumber", sortOrder]],
            returnDate: [["returnDate", sortOrder]],
            totalAmount: [["totalAmount", sortOrder]],
            status: [["status", sortOrder]],
            createdAt: [["createdAt", sortOrder]],
            updatedAt: [["updatedAt", sortOrder]],
        };

        const orderClause = sortFieldMap[sortBy] || [["createdAt", "DESC"]];

        const includeConfig = [
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
                attributes: ["id", "company_name", "first_name", "last_name"],
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
                include: [itemIncludeConfig],
            },
        ];

        if (option) {
            const returns = await PurchaseReturnHeader.findAll({
                where: whereClause,
                include: includeConfig,
                order: orderClause,
            });

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Purchase returns fetched successfully",
                result: returns,
                total: returns.length,
            });
            return;
        }

        const total = await PurchaseReturnHeader.count({ where: whereClause });
        const returns = await PurchaseReturnHeader.findAll({
            where: whereClause,
            include: includeConfig,
            offset,
            limit,
            order: orderClause,
        });

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Purchase returns fetched successfully",
            result: returns,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    }),

    exportPurchaseReturnsCSV: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;

        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const { search, status, vendorId, startDate, endDate } = req.query;
        const whereClause: any = { companyId };

        if (status) whereClause.status = status;
        if (vendorId) whereClause.vendorId = Number(vendorId);

        if (startDate && endDate) {
            whereClause.returnDate = {
                [Op.between]: [new Date(String(startDate)), new Date(String(endDate))]
            };
        } else if (startDate) {
            whereClause.returnDate = { [Op.gte]: new Date(String(startDate)) };
        } else if (endDate) {
            whereClause.returnDate = { [Op.lte]: new Date(String(endDate)) };
        }

        if (search) {
            const searchStr = String(search).trim();
            whereClause[Op.or] = [
                { returnNumber: { [Op.like]: `%${searchStr}%` } },
                { reason: { [Op.like]: `%${searchStr}%` } },
                { remarks: { [Op.like]: `%${searchStr}%` } }
            ];
        }

        const returns = await PurchaseReturnHeader.findAll({
            where: whereClause,
            include: [
                { model: PurchaseInvoiceHeader, as: "purchaseInvoiceHeader", attributes: ["id", "invoiceNumber"] },
                { model: PurchaseOrder, as: "purchaseOrderHeader", attributes: ["id", "purchaseNo"] },
                { model: GRN, as: "grnHeader", attributes: ["id", "grnNo"] },
                { model: VendorDetails, as: "vendor" },
                {
                    model: PurchaseReturnLine,
                    as: "purchaseReturnLines",
                    include: [itemIncludeConfig]
                }
            ],
            order: [["createdAt", "DESC"]]
        });

        const formatDateVal = (date: any) => (date ? new Date(date).toISOString().split("T")[0] : "");

        const csvRows: any[] = [];
        returns.forEach((r: any) => {
            const vendorName = r.vendor?.company_name || [r.vendor?.first_name, r.vendor?.last_name].filter(Boolean).join(" ") || "";
            const lines = r.purchaseReturnLines || [];

            if (lines.length > 0) {
                lines.forEach((l: any, idx: number) => {
                    const item = l.item || {};
                    csvRows.push({
                        "Return Internal ID": r.id,
                        "Return Authorization #": r.returnNumber || "",
                        "Return Date": formatDateVal(r.returnDate),
                        "Status": r.status || "",
                        "Vendor Name": vendorName,
                        "PO Reference #": r.purchaseOrderHeader?.purchaseNo || "",
                        "GRN Reference #": r.grnHeader?.grnNo || "",
                        "Bill Reference #": r.purchaseInvoiceHeader?.invoiceNumber || "",
                        "Total Return Amount": Number(r.totalAmount || 0).toFixed(2),
                        "Reason": r.reason || "",
                        "Header Remarks": r.remarks || "",
                        "Created Date": formatDateVal(r.createdAt),
                        "Line #": idx + 1,
                        "Item Code": item.item_code || "",
                        "Item Name": item.item_name || "",
                        "Item Description": l.itemDescription || item.description || "",
                        "Return Quantity": l.returnQty || l.quantity || "",
                        "Unit Price": Number(l.unitPrice || 0).toFixed(2),
                        "Line Total": Number(l.totalAmount || (Number(l.returnQty || 0) * Number(l.unitPrice || 0))).toFixed(2),
                        "Line Reason": l.reason || "",
                        "Line Remarks": l.remarks || ""
                    });
                });
            } else {
                csvRows.push({
                    "Return Internal ID": r.id,
                    "Return Authorization #": r.returnNumber || "",
                    "Return Date": formatDateVal(r.returnDate),
                    "Status": r.status || "",
                    "Vendor Name": vendorName,
                    "PO Reference #": r.purchaseOrderHeader?.purchaseNo || "",
                    "GRN Reference #": r.grnHeader?.grnNo || "",
                    "Bill Reference #": r.purchaseInvoiceHeader?.invoiceNumber || "",
                    "Total Return Amount": Number(r.totalAmount || 0).toFixed(2),
                    "Reason": r.reason || "",
                    "Header Remarks": r.remarks || "",
                    "Created Date": formatDateVal(r.createdAt),
                    "Line #": "",
                    "Item Code": "",
                    "Item Name": "",
                    "Item Description": "",
                    "Return Quantity": "",
                    "Unit Price": "",
                    "Line Total": "",
                    "Line Reason": "",
                    "Line Remarks": ""
                });
            }
        });

        const defaultHeaders = [
            "Return Internal ID", "Return Authorization #", "Return Date", "Status", "Vendor Name",
            "PO Reference #", "GRN Reference #", "Bill Reference #", "Total Return Amount", "Reason",
            "Header Remarks", "Created Date", "Line #", "Item Code", "Item Name", "Item Description",
            "Return Quantity", "Unit Price", "Line Total", "Line Reason", "Line Remarks"
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

        const filename = `purchase_returns_export_${new Date().toISOString().split("T")[0]}.csv`;
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.status(StatusCodes.OK).send(csvContent);
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
                    include: [itemIncludeConfig],
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

            if (!isPurchaseReturnEditable(existingReturn.status)) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error(`Only pending approval or draft Purchase Returns can be edited. Current status is ${existingReturn.status}.`);
            }

            const returnDate = header.returnDate ? new Date(header.returnDate) : existingReturn.returnDate;
            const status = normalizePurchaseReturnStatus(header.status || existingReturn.status, existingReturn.status || "PENDING_APPROVAL");

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
                headerPayload.returnNumber = existingReturn.returnNumber;
            }

            if (!headerPayload.vendorId) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("vendorId is required");
            }
            if (!headerPayload.returnDate || Number.isNaN(headerPayload.returnDate.getTime())) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid returnDate is required");
            }

            const targetPoId = headerPayload.purchaseOrderHeaderId ?? existingReturn.purchaseOrderHeaderId;
            const targetGrnId = headerPayload.grnHeaderId ?? existingReturn.grnHeaderId;
            const targetInvId = headerPayload.purchaseInvoiceHeaderId ?? existingReturn.purchaseInvoiceHeaderId;

            if (targetPoId) {
                const po = await PurchaseOrder.findOne({ where: { id: targetPoId, CompanyId: companyId }, transaction });
                if (po && po.isActive === false) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`Cannot update Purchase Return for Purchase Order ${po.purchaseNo || po.id} because it is deactivated/inactive.`);
                }
            }
            if (targetGrnId) {
                const grn = await GRN.findOne({ where: { id: targetGrnId, CompanyId: companyId }, transaction });
                if (grn && grn.purchaseOrderId) {
                    const po = await PurchaseOrder.findOne({ where: { id: grn.purchaseOrderId, CompanyId: companyId }, transaction });
                    if (po && po.isActive === false) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`Cannot update Purchase Return for GRN ${grn.grnNo} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
                    }
                }
            }
            if (targetInvId) {
                const inv = await PurchaseInvoiceHeader.findOne({ where: { id: targetInvId, companyId }, transaction });
                if (inv) {
                    if (inv.poHeaderId) {
                        const po = await PurchaseOrder.findOne({ where: { id: inv.poHeaderId, CompanyId: companyId }, transaction });
                        if (po && po.isActive === false) {
                            res.status(StatusCodes.BAD_REQUEST);
                            throw new Error(`Cannot update Purchase Return for Bill ${inv.invoiceNumber} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
                        }
                    }
                    if (inv.grnHeaderId) {
                        const grn = await GRN.findOne({ where: { id: inv.grnHeaderId, CompanyId: companyId }, transaction });
                        if (grn && grn.purchaseOrderId) {
                            const po = await PurchaseOrder.findOne({ where: { id: grn.purchaseOrderId, CompanyId: companyId }, transaction });
                            if (po && po.isActive === false) {
                                res.status(StatusCodes.BAD_REQUEST);
                                throw new Error(`Cannot update Purchase Return for Bill ${inv.invoiceNumber} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
                            }
                        }
                    }
                }
            }

            let totalSubtotal = 0;
            let totalDiscount = 0;
            let totalTax = 0;
            let totalAmount = 0;

            const preparedUpdatedLines: any[] = [];
            for (let index = 0; index < lineItems.length; index++) {
                const lineItem = lineItems[index];
                const returnQty = Number(lineItem.returnQty);
                const rejectedQty = lineItem.rejectedQty !== undefined ? Number(lineItem.rejectedQty) : 0;
                const damagedQty = lineItem.damagedQty !== undefined ? Number(lineItem.damagedQty) : 0;
                const unitPrice = Number(lineItem.unitPrice);

                let resolvedGrnLineId = normalizeOptionalId(lineItem.grnLineId);
                if (resolvedGrnLineId) {
                    const existingGrnLine = await GRNLine.findByPk(resolvedGrnLineId, { transaction });
                    if (existingGrnLine) {
                        const receivedQty = Number((existingGrnLine as any).acceptedQty > 0 ? (existingGrnLine as any).acceptedQty : (existingGrnLine as any).receivedQty || 0);
                        if (receivedQty > 0) {
                            const previousLines = await PurchaseReturnLine.findAll({
                                where: { grnLineId: resolvedGrnLineId },
                                include: [{
                                    model: PurchaseReturnHeader,
                                    as: "purchaseReturnHeader",
                                    where: { status: { [Op.ne]: "CANCELLED" } }
                                }],
                                transaction
                            });

                            const previouslyReturnedQty = previousLines
                                .filter(l => l.returnHeaderId !== existingReturn.id)
                                .reduce((sum, l) => sum + Number(l.returnQty || 0), 0);
                            const availableReturnQty = receivedQty - previouslyReturnedQty;

                            if (returnQty > availableReturnQty) {
                                res.status(StatusCodes.BAD_REQUEST);
                                throw new Error(`Cannot return ${returnQty} units for item. Max returnable quantity for GRN line is ${availableReturnQty} (Received: ${receivedQty}, Previously Returned: ${previouslyReturnedQty}).`);
                            }
                        }
                    } else {
                        resolvedGrnLineId = null;
                    }
                }

                if (!lineItem.itemId) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`itemId is required in line item ${index + 1}`);
                }
                if (!returnQty || returnQty <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`returnQty must be greater than zero in line item ${index + 1}`);
                }
                if (unitPrice < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`unitPrice cannot be negative in line item ${index + 1}`);
                }

                const grossLineAmount = Number((returnQty * unitPrice).toFixed(2));
                const discountPercent = lineItem.discountPercent !== undefined && lineItem.discountPercent !== null ? Number(lineItem.discountPercent) : 0;
                let discountAmount = lineItem.discountAmount !== undefined && lineItem.discountAmount !== null ? Number(lineItem.discountAmount) : 0;
                if (discountPercent > 0 && discountAmount === 0) {
                    discountAmount = Number(((grossLineAmount * discountPercent) / 100).toFixed(2));
                }

                const taxableLineAmount = Math.max(0, Number((grossLineAmount - discountAmount).toFixed(2)));
                const taxPercent = lineItem.taxPercent !== undefined && lineItem.taxPercent !== null ? Number(lineItem.taxPercent) : 0;
                let taxAmount = lineItem.taxAmount !== undefined && lineItem.taxAmount !== null ? Number(lineItem.taxAmount) : 0;
                if (taxPercent > 0 && taxAmount === 0) {
                    taxAmount = Number(((taxableLineAmount * taxPercent) / 100).toFixed(2));
                }

                const lineTotal = lineItem.lineTotal !== undefined && lineItem.lineTotal !== null && Number(lineItem.lineTotal) > 0
                    ? Number(Number(lineItem.lineTotal).toFixed(2))
                    : Number((taxableLineAmount + taxAmount).toFixed(2));

                totalSubtotal += grossLineAmount;
                totalDiscount += discountAmount;
                totalTax += taxAmount;
                totalAmount += lineTotal;

                preparedUpdatedLines.push({
                    returnHeaderId: existingReturn.id,
                    grnLineId: resolvedGrnLineId,
                    itemId: Number(lineItem.itemId),
                    batchNo: lineItem.batchNo || null,
                    returnQty,
                    rejectedQty,
                    damagedQty,
                    unitPrice,
                    discountPercent,
                    discountAmount,
                    taxPercent,
                    taxAmount,
                    lineTotal,
                    reason: lineItem.reason || null,
                    remarks: lineItem.remarks || null,
                });
            }

            headerPayload.subtotal = Number(totalSubtotal.toFixed(2));
            headerPayload.discountAmount = Number(totalDiscount.toFixed(2));
            headerPayload.taxAmount = Number(totalTax.toFixed(2));
            headerPayload.totalAmount = Number(totalAmount.toFixed(2));

            await existingReturn.update(headerPayload, { transaction });
            await PurchaseReturnLine.destroy({ where: { returnHeaderId: existingReturn.id }, transaction });

            const updatedLineItems: any[] = [];
            for (const linePayload of preparedUpdatedLines) {
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

        if (normalizedStatus !== "CANCELLED") {
            const targetPoId = purchaseReturn.purchaseOrderHeaderId;
            const targetGrnId = purchaseReturn.grnHeaderId;
            const targetInvId = purchaseReturn.purchaseInvoiceHeaderId;

            if (targetPoId) {
                const po = await PurchaseOrder.findOne({ where: { id: targetPoId, CompanyId: companyId } });
                if (po && po.isActive === false) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`Cannot update status for Purchase Return ${purchaseReturn.returnNumber} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
                }
            }
            if (targetGrnId) {
                const grn = await GRN.findOne({ where: { id: targetGrnId, CompanyId: companyId } });
                if (grn && grn.purchaseOrderId) {
                    const po = await PurchaseOrder.findOne({ where: { id: grn.purchaseOrderId, CompanyId: companyId } });
                    if (po && po.isActive === false) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`Cannot update status for Purchase Return ${purchaseReturn.returnNumber} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
                    }
                }
            }
            if (targetInvId) {
                const inv = await PurchaseInvoiceHeader.findOne({ where: { id: targetInvId, companyId } });
                if (inv) {
                    if (inv.poHeaderId) {
                        const po = await PurchaseOrder.findOne({ where: { id: inv.poHeaderId, CompanyId: companyId } });
                        if (po && po.isActive === false) {
                            res.status(StatusCodes.BAD_REQUEST);
                            throw new Error(`Cannot update status for Purchase Return ${purchaseReturn.returnNumber} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
                        }
                    }
                    if (inv.grnHeaderId) {
                        const grn = await GRN.findOne({ where: { id: inv.grnHeaderId, CompanyId: companyId } });
                        if (grn && grn.purchaseOrderId) {
                            const po = await PurchaseOrder.findOne({ where: { id: grn.purchaseOrderId, CompanyId: companyId } });
                            if (po && po.isActive === false) {
                                res.status(StatusCodes.BAD_REQUEST);
                                throw new Error(`Cannot update status for Purchase Return ${purchaseReturn.returnNumber} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
                            }
                        }
                    }
                }
            }
        }

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
                status: normalizedStatus as any
            }, { transaction: t });
        });

        const updatedReturn = await PurchaseReturnHeader.findOne({
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
                    include: [itemIncludeConfig],
                },
            ],
        });

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Purchase return status updated successfully",
            result: updatedReturn,
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

        if (!isPurchaseReturnEditable(purchaseReturn.status)) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error(`Only pending approval or draft Purchase Returns can be deleted. Current status is ${purchaseReturn.status}.`);
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

