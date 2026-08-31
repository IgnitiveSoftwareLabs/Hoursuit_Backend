import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import { PurchaseInvoiceHeader, PurchaseInvoiceLine } from "../../../../modals/Transactions/purchase/purchaseInvoice";
import PurchaseOrder from "../../../../modals/Transactions/purchase/purchaseOrder/purchaseOrderHeader";
// import { PurchaseOrderLine } from "../../../../modals/Transactions/purchase/purchaseOrder";
import VendorDetails from "../../../../modals/masters/vendorDetails/vendorDetails";
import { normalizePurchaseInvoiceStatus } from "../../../../utils/p2pStatus";
import { findCompanyForUser } from "../../../../utils/findCompanyForUser";
import ItemMaster from "../../../../modals/masters/items/itemMaster";
import { GLImpactService } from "../../../../utils/glImpactService";
import { GRN } from "../../../../modals/Transactions/purchase/GRN";
import { CustomRequest } from "../../../../typeRequest/customReq";
import sequelize from "../../../../dbconfig/dbconfig";

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

const calculateLineTotals = (quantity: number, unitPrice: number, discountPercent: number, taxPercent: number) => {
    const baseAmount = quantity * unitPrice;
    const discountAmount = Number(((baseAmount * discountPercent) / 100).toFixed(2));
    const taxable = baseAmount - discountAmount;
    const taxAmount = Number(((taxable * taxPercent) / 100).toFixed(2));
    const lineTotal = Number((taxable + taxAmount).toFixed(2));
    return { discountAmount, taxAmount, lineTotal };
};

const PurchaseInvoiceController = {
    createPurchaseInvoice: asyncHandler(async (req: CustomRequest, res: Response) => {
        const transaction = await sequelize.transaction();

        try {
            let header = req.body.header;
            let lineItems = req.body.lineItems;

            // Parse JSON if sent as string
            if (typeof header === "string") {
                header = JSON.parse(header);
            }

            if (typeof lineItems === "string") {
                lineItems = JSON.parse(lineItems);
            }

            // Validate request
            if (!header || !Array.isArray(lineItems) || lineItems.length === 0) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Header and at least one line item are required");
            }

            // Get company and user
            const company = await findCompanyForUser(req.user);
            const companyId = company?.id;
            const user_id = req.user?.id;

            if (!companyId || !user_id) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User authentication required");
            }

            const invoiceDate = header.invoiceDate ? new Date(header.invoiceDate) : null;
            const dueDate = header.dueDate ? new Date(header.dueDate) : null;

            // New Purchase Invoice always starts as DRAFT
            const status = "DRAFT";

            let invoiceNumber = String(header.invoiceNumber || "").trim();
            if (!invoiceNumber) {
                const count = await PurchaseInvoiceHeader.count({ where: { companyId }, transaction });
                let autoNo = `INV-${String(count + 1).padStart(4, "0")}`;
                const exists = await PurchaseInvoiceHeader.findOne({ where: { invoiceNumber: autoNo, companyId }, transaction });
                if (exists) {
                    autoNo = `INV-${Date.now()}`;
                }
                invoiceNumber = autoNo;
            }

            let vendorInvoiceNumber = String(header.vendorInvoiceNumber || "").trim();
            if (!vendorInvoiceNumber) {
                vendorInvoiceNumber = `VINV-${invoiceNumber}`;
            }

            const invoiceType = String(header.invoiceType || "Standard Bill").trim();

            if (!invoiceDate || Number.isNaN(invoiceDate.getTime())) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid invoiceDate is required");
            }

            let subtotal = 0;
            let taxAmount = 0;
            let discountAmount = 0;

            const calculatedLines: any[] = [];

            for (let index = 0; index < lineItems.length; index++) {
                const lineItem = lineItems[index];
                const quantity = Number(lineItem.quantity);
                const unitPrice = Number(lineItem.unitPrice);

                const discountPercent = lineItem.discountPercent !== undefined && lineItem.discountPercent !== ""
                    ? Number(lineItem.discountPercent)
                    : 0;

                const taxPercent = lineItem.taxPercent !== undefined && lineItem.taxPercent !== ""
                    ? Number(lineItem.taxPercent)
                    : 0;

                const itemId = Number(lineItem.itemId);

                if (Number.isNaN(itemId) || itemId <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`itemId is required in line item ${index + 1}`);
                }

                if (Number.isNaN(quantity) || quantity <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`quantity must be greater than zero in line item ${index + 1}`);
                }

                if (Number.isNaN(unitPrice) || unitPrice < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`unitPrice cannot be negative in line item ${index + 1}`);
                }

                if (Number.isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`discountPercent must be between 0 and 100 in line item ${index + 1}`);
                }

                if (Number.isNaN(taxPercent) || taxPercent < 0 || taxPercent > 100) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`taxPercent must be between 0 and 100 in line item ${index + 1}`);
                }

                const { discountAmount: lineDiscount, taxAmount: lineTax, lineTotal } = calculateLineTotals(
                    quantity,
                    unitPrice,
                    discountPercent,
                    taxPercent
                );

                // Accumulate totals
                subtotal += quantity * unitPrice;
                discountAmount += lineDiscount;
                taxAmount += lineTax;

                // Store calculated line
                calculatedLines.push({
                    poLineId: normalizeOptionalId(lineItem.poLineId),
                    grnLineId: normalizeOptionalId(lineItem.grnLineId),
                    itemId,
                    description: lineItem.description || null,
                    batchNo: lineItem.batchNo || null,
                    quantity,
                    unitPrice,
                    discountPercent,
                    discountAmount: lineDiscount,
                    taxPercent,
                    taxAmount: lineTax,
                    lineTotal,
                    remarks: lineItem.remarks || null,
                });
            }

            // Round calculated values
            subtotal = Number(subtotal.toFixed(2));
            discountAmount = Number(discountAmount.toFixed(2));
            taxAmount = Number(taxAmount.toFixed(2));

            const freightAmount = header.freightAmount !== undefined && header.freightAmount !== ""
                ? Number(header.freightAmount)
                : 0;
            const otherCharges = header.otherCharges !== undefined && header.otherCharges !== ""
                ? Number(header.otherCharges)
                : 0;

            if (Number.isNaN(freightAmount) || freightAmount < 0) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("freightAmount cannot be negative");
            }

            if (Number.isNaN(otherCharges) || otherCharges < 0) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("otherCharges cannot be negative");
            }

            const totalAmount = Number((subtotal - discountAmount + taxAmount + freightAmount + otherCharges).toFixed(2));
            const paidAmount = header.paidAmount !== undefined && header.paidAmount !== ""
                ? Number(header.paidAmount)
                : 0;

            if (Number.isNaN(paidAmount) || paidAmount < 0) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("paidAmount cannot be negative");
            }

            if (paidAmount > totalAmount) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("paidAmount cannot be greater than totalAmount");
            }

            const balanceAmount = Number((totalAmount - paidAmount).toFixed(2));

            const headerPayload: any = {
                invoiceNumber,
                invoiceType,
                vendorInvoiceNumber: vendorInvoiceNumber,
                poHeaderId: normalizeOptionalId(header.poHeaderId),
                grnHeaderId: normalizeOptionalId(header.grnHeaderId),
                vendorId: normalizeOptionalId(header.vendorId),
                invoiceDate,
                dueDate,
                currency: header.currency || "INR",
                exchangeRate: header.exchangeRate !== undefined && header.exchangeRate !== ""
                    ? Number(header.exchangeRate)
                    : 1,
                subtotal,
                taxAmount,
                discountAmount,
                freightAmount,
                otherCharges,
                totalAmount,
                paidAmount,
                balanceAmount,
                status: "DRAFT",
                remarks: header.remarks || null,
                companyId,
                user_id,
            };

            const createdHeader =
                await PurchaseInvoiceHeader.create(
                    headerPayload,
                    { transaction }
                );

            const createdLineItems: any[] = [];

            for (let index = 0; index < calculatedLines.length; index++) {
                const line = calculatedLines[index];
                const linePayload: any = {
                    invoiceHeaderId: createdHeader.id,
                    poLineId: line.poLineId,
                    grnLineId: line.grnLineId,
                    itemId: line.itemId,
                    description: line.description,
                    batchNo: line.batchNo,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                    discountPercent: line.discountPercent,
                    discountAmount: line.discountAmount,
                    taxPercent: line.taxPercent,
                    taxAmount: line.taxAmount,
                    lineTotal: line.lineTotal,
                    remarks: line.remarks,
                    CompanyId: companyId,
                    user_id,
                };

                const createdLine = await PurchaseInvoiceLine.create(linePayload, { transaction });

                createdLineItems.push(createdLine);
            }

            await transaction.commit();

            res.status(StatusCodes.CREATED).json({
                success: true,
                message: "Purchase invoice created successfully",
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

    getAllPurchaseInvoices: asyncHandler(async (req: CustomRequest, res: Response) => {
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
                { invoiceNumber: { [Op.like]: `%${search}%` } },
                { vendorInvoiceNumber: { [Op.like]: `%${search}%` } },
            ];
        }
        if (status) {
            whereClause.status = status;
        }

        const total = await PurchaseInvoiceHeader.count({ where: whereClause });
        const invoices = await PurchaseInvoiceHeader.findAll({
            where: whereClause,
            include: [
                {
                    model: PurchaseOrder,
                    as: "purchaseOrder",
                    attributes: ["id", "purchaseNo"],
                    required: false,
                },
                {
                    model: GRN,
                    as: "grn",
                    attributes: ["id", "grnNo", "purchaseOrderId"],
                    required: false,
                    include: [
                        {
                            model: PurchaseOrder,
                            as: "purchaseOrder",
                            attributes: ["id", "purchaseNo"],
                            required: false,
                        },
                    ],
                },
                {
                    model: VendorDetails,
                    as: "vendor",
                    attributes: ["id", "company_name"],
                    required: false,
                },
                {
                    model: PurchaseInvoiceLine,
                    as: "purchaseInvoiceLines",
                    required: false,
                    include: [itemIncludeConfig],
                },
            ],
            offset,
            limit: Number(limit),
            order: [["createdAt", "DESC"]],
        });

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Purchase invoices fetched successfully",
            result: invoices,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }),

    getPurchaseInvoiceById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;

        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const invoice = await PurchaseInvoiceHeader.findOne({
            where: { id: Number(id), companyId },
            include: [
                {
                    model: PurchaseOrder,
                    as: "purchaseOrder",
                    attributes: ["id", "purchaseNo", "purchaseDate", "deliveryDate", "status"],
                    required: false,
                },
                {
                    model: GRN,
                    as: "grn",
                    attributes: ["id", "grnNo", "grnDate", "status", "purchaseOrderId"],
                    required: false,
                    include: [
                        {
                            model: PurchaseOrder,
                            as: "purchaseOrder",
                            attributes: ["id", "purchaseNo"],
                            required: false,
                        },
                    ],
                },
                {
                    model: VendorDetails,
                    as: "vendor",
                    attributes: ["id", "company_name"],
                    required: false,
                },
                {
                    model: PurchaseInvoiceLine,
                    as: "purchaseInvoiceLines",
                    required: false,
                    include: [itemIncludeConfig],
                },
            ],
        });

        if (!invoice) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Purchase invoice not found");
        }

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Purchase invoice fetched successfully",
            result: invoice,
        });
    }),

    updatePurchaseInvoice: asyncHandler(async (req: CustomRequest, res: Response) => {
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

            const existingInvoice = await PurchaseInvoiceHeader.findOne({
                where: { id: Number(id), companyId },
                transaction,
            });
            if (!existingInvoice) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Purchase invoice not found");
            }

            if (String(existingInvoice.status || "").toUpperCase() !== "DRAFT") {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Cannot update Purchase Invoice. Only DRAFT Purchase Invoices can be updated.");
            }

            const invoiceDate = header.invoiceDate ? new Date(header.invoiceDate) : existingInvoice.invoiceDate;
            const dueDate = header.dueDate !== undefined ? (header.dueDate ? new Date(header.dueDate) : null) : existingInvoice.dueDate;
            const status = normalizePurchaseInvoiceStatus(header.status || existingInvoice.status, existingInvoice.status || "DRAFT");

            const headerPayload: any = {
                invoiceNumber: String(header.invoiceNumber || existingInvoice.invoiceNumber).trim(),
                invoiceType: String(header.invoiceType || existingInvoice.invoiceType).trim(),
                vendorInvoiceNumber: header.hasOwnProperty("vendorInvoiceNumber") ? header.vendorInvoiceNumber : existingInvoice.vendorInvoiceNumber,
                poHeaderId: normalizeOptionalId(header.poHeaderId),
                grnHeaderId: normalizeOptionalId(header.grnHeaderId),
                invoiceDate,
                dueDate,
                currency: header.currency || existingInvoice.currency,
                exchangeRate: header.exchangeRate !== undefined && header.exchangeRate !== "" ? Number(header.exchangeRate) : existingInvoice.exchangeRate,
                // freightAmount: header.freightAmount !== undefined && header.freightAmount !== "" ? Number(header.freightAmount) : existingInvoice.freightAmount,
                // otherCharges: header.otherCharges !== undefined && header.otherCharges !== "" ? Number(header.otherCharges) : existingInvoice.otherCharges,
                status,
                remarks: header.hasOwnProperty("remarks") ? header.remarks : existingInvoice.remarks,
                companyId,
                user_id,
            };

            if (!headerPayload.invoiceNumber) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("invoiceNumber is required");
            }
            if (!headerPayload.invoiceType) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("invoiceType is required");
            }
            if (!headerPayload.invoiceDate || Number.isNaN(headerPayload.invoiceDate.getTime())) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid invoiceDate is required");
            }
            if (!headerPayload.status) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("status is required");
            }

            await existingInvoice.update(headerPayload, { transaction });
            await PurchaseInvoiceLine.destroy({ where: { invoiceHeaderId: existingInvoice.id }, transaction });

            let subtotal = 0;
            let taxAmount = 0;
            let discountAmount = 0;
            const updatedLineItems: any[] = [];

            for (let index = 0; index < lineItems.length; index++) {
                const lineItem = lineItems[index];
                const quantity = Number(lineItem.quantity);
                const unitPrice = Number(lineItem.unitPrice);
                const discountPercent = lineItem.discountPercent !== undefined && lineItem.discountPercent !== "" ? Number(lineItem.discountPercent) : 0;
                const taxPercent = lineItem.taxPercent !== undefined && lineItem.taxPercent !== "" ? Number(lineItem.taxPercent) : 0;
                const { discountAmount: lineDiscount, taxAmount: lineTax, lineTotal } = calculateLineTotals(quantity, unitPrice, discountPercent, taxPercent);

                const linePayload: any = {
                    invoiceHeaderId: existingInvoice.id,
                    poLineId: normalizeOptionalId(lineItem.poLineId),
                    grnLineId: normalizeOptionalId(lineItem.grnLineId),
                    itemId: Number(lineItem.itemId),
                    description: lineItem.description || null,
                    batchNo: lineItem.batchNo || null,
                    quantity,
                    unitPrice,
                    discountPercent,
                    discountAmount: lineDiscount,
                    taxPercent,
                    taxAmount: lineTax,
                    lineTotal,
                    remarks: lineItem.remarks || null,
                    CompanyId: companyId,
                    user_id,
                };

                if (!linePayload.itemId) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`itemId is required in line item ${index + 1}`);
                }
                if (!linePayload.quantity || linePayload.quantity <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`quantity must be greater than zero in line item ${index + 1}`);
                }
                if (linePayload.unitPrice < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`unitPrice cannot be negative in line item ${index + 1}`);
                }

                const createdLine = await PurchaseInvoiceLine.create(linePayload, { transaction });
                updatedLineItems.push(createdLine);
                subtotal += quantity * unitPrice;
                discountAmount += lineDiscount;
                taxAmount += lineTax;
            }

            const totalAmount = Number((subtotal - discountAmount + taxAmount).toFixed(2));
            const paidAmount = header.paidAmount !== undefined && header.paidAmount !== "" ? Number(header.paidAmount) : existingInvoice.paidAmount;
            const balanceAmount = Number((totalAmount - paidAmount).toFixed(2));

            await existingInvoice.update({
                subtotal: Number(subtotal.toFixed(2)),
                taxAmount: Number(taxAmount.toFixed(2)),
                discountAmount: Number(discountAmount.toFixed(2)),
                totalAmount,
                paidAmount,
                balanceAmount,
            }, { transaction });

            await transaction.commit();

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Purchase invoice updated successfully",
                result: {
                    header: existingInvoice,
                    lineItems: updatedLineItems,
                },
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }),

    updatePurchaseInvoiceStatus: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const {
            status,
            voucherTypeId,
            voucher_type_id,
            grniAccountId,
            grni_account_id,
            apAccountId,
            ap_account_id,
            taxAccountId,
            tax_account_id,
        } = req.body;

        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;

        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const invoice = await PurchaseInvoiceHeader.findOne({ where: { id: Number(id), companyId } });
        if (!invoice) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Purchase invoice not found");
        }
        if (!status) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("status is required");
        }

        const previousStatus = invoice.status;
        const normalizedStatus = normalizePurchaseInvoiceStatus(status);

        // Idempotency check: if status unchanged, return early
        if (previousStatus === normalizedStatus) {
            res.status(StatusCodes.OK).json({
                success: true,
                message: `Purchase invoice status is already set to ${status}`,
                result: invoice,
            });
            return;
        }

        // Prevent double posting
        if (previousStatus === "POSTED" && normalizedStatus === "POSTED") {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Purchase invoice is already POSTED");
        }

        const parseOptionalId = (val: unknown) => (val !== undefined && val !== null && val !== "" ? Number(val) : undefined);

        const parsedVoucherTypeId = parseOptionalId(voucherTypeId ?? voucher_type_id);
        const parsedGrniAccountId = parseOptionalId(grniAccountId ?? grni_account_id);
        const parsedApAccountId = parseOptionalId(apAccountId ?? ap_account_id);
        const parsedTaxAccountId = parseOptionalId(taxAccountId ?? tax_account_id);

        // Managed transaction for status update & GL posting
        await sequelize.transaction(async (t) => {
            await invoice.update({
                status: normalizedStatus as "DRAFT" | "POSTED" | "PARTIAL_PAID" | "PAID" | "CANCELLED"
            }, { transaction: t });

            // Post to GL when invoice is marked POSTED
            if (normalizedStatus === "POSTED") {
                await GLImpactService.processPurchaseInvoicePosting(
                    invoice.id,
                    companyId,
                    user_id,
                    parsedVoucherTypeId,
                    parsedGrniAccountId,
                    parsedApAccountId,
                    parsedTaxAccountId,
                    t
                );
            }
        });

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Purchase invoice status updated successfully",
            result: invoice,
        });
    }),

    deletePurchaseInvoice: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;

        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const invoice = await PurchaseInvoiceHeader.findOne({ where: { id: Number(id), companyId } });
        if (!invoice) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Purchase invoice not found");
        }

        if (String(invoice.status || "").toUpperCase() !== "DRAFT") {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Cannot delete Purchase Invoice. Only DRAFT Purchase Invoices can be deleted.");
        }

        await PurchaseInvoiceLine.destroy({ where: { invoiceHeaderId: invoice.id } });
        await invoice.destroy();

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Purchase invoice deleted successfully",
            result: null,
        });
    }),
};

export default PurchaseInvoiceController;