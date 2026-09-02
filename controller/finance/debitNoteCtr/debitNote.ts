import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";
import { CustomRequest } from "../../../typeRequest/customReq";
import { findCompanyForUser } from "../../../utils/findCompanyForUser";
import DebitNoteHeader from "../../../modals/finance/debitNoteHeader";
import DebitNoteLine from "../../../modals/finance/debitNoteLine";
import SubsidiaryMaster from "../../../modals/masters/subsidiaries/subsdiaryMaster";
import VoucherTypeMaster from "../../../modals/finance/voucherType";
import CurrencyMaster from "../../../modals/masters/currency/currencyMaster";
import ItemMaster from "../../../modals/masters/items/itemMaster";
import UOMMaster from "../../../modals/masters/UOM/UOMMaster";
import VendorDetails from "../../../modals/masters/vendorDetails/vendorDetails";
import Customer from "../../../modals/masters/customer/customer";
import PurchaseReturnHeader from "../../../modals/Transactions/purchase/purchaseReturn/purchaseReturnHeader";
import { calculateDiscount, calculateGrandTotal, calculateSubtotal, calculateTax, generateDocumentNumber } from "../../../utils/noteHelpers";
import { postDebitNoteToGL } from "../../../services/accounting/debitNotePosting";

const DebitNoteController = {
    createDebitNote: asyncHandler(async (req: CustomRequest, res: Response) => {
        const rawBody = req.body || {};
        const headerData = rawBody.header ? { ...rawBody, ...rawBody.header } : rawBody;
        const userId = req.user?.id || headerData.user_id || 1;

        const company = await findCompanyForUser(req.user);
        const companyId = company?.id || headerData.company_id || 1;

        // 1. Resolve Subsidiary
        let subsidiary_id = headerData.subsidiary_id || headerData.subsidiaryId;
        let subsidiary = null;
        if (subsidiary_id) {
            subsidiary = await SubsidiaryMaster.findByPk(Number(subsidiary_id));
        }
        if (!subsidiary && companyId) {
            subsidiary = await SubsidiaryMaster.findOne({ where: { CompanyId: companyId, isActive: true } as any });
        }
        if (!subsidiary) {
            subsidiary = await SubsidiaryMaster.findOne();
        }
        if (!subsidiary) {
            subsidiary = await SubsidiaryMaster.create({
                subsidiary_name: "Primary Subsidiary",
                currency_id: 1,
                CompanyId: companyId,
                user_id: Number(userId),
                isActive: true
            } as any);
        }
        subsidiary_id = subsidiary.id;

        // 2. Resolve Voucher Type
        let voucher_type_id = headerData.voucher_type_id || headerData.voucherTypeId;
        let voucherType = voucher_type_id ? await VoucherTypeMaster.findByPk(Number(voucher_type_id)) : null;
        if (!voucherType && companyId) {
            voucherType = await VoucherTypeMaster.findOne({
                where: { CompanyId: companyId, code: "DN", isActive: true } as any
            }) || await VoucherTypeMaster.findOne({ where: { CompanyId: companyId } as any });
        }
        if (!voucherType) {
            voucherType = await VoucherTypeMaster.findOne({ where: { code: "DN" } as any }) || await VoucherTypeMaster.findOne();
        }
        if (!voucherType) {
            voucherType = await VoucherTypeMaster.create({
                code: "DN",
                name: "Debit Note Voucher",
                description: "Debit Note / Vendor Credit Voucher",
                CompanyId: companyId,
                user_id: Number(userId),
                isActive: true,
            } as any);
        }
        voucher_type_id = voucherType.id;

        // 3. Resolve Currency
        let currency_id = headerData.currency_id || headerData.currencyId;
        let currency = currency_id ? await CurrencyMaster.findByPk(Number(currency_id)) : null;
        if (!currency) {
            currency = await CurrencyMaster.findOne({ where: { currency_code: "INR" } as any }) 
                    || await CurrencyMaster.findOne();
        }
        if (!currency) {
            currency = await CurrencyMaster.create({
                currency_code: "INR",
                currency_name: "Indian Rupee",
                currency_symbol: "₹",
                country_name: "India",
                decimal_places: 2,
                isActive: true
            } as any);
        }
        currency_id = currency.id;

        // 4. Resolve Vendor / Customer & Module Type
        const vendor_id = headerData.vendor_id || headerData.vendorId || null;
        const customer_id = headerData.customer_id || headerData.customerId || null;
        const module_type = headerData.module_type || (customer_id ? "SALES" : "PURCHASE");

        // 5. Document Number & Dates
        const document_number = String(headerData.document_number || headerData.debitNoteNumber || headerData.debit_note_number || generateDocumentNumber("DN", companyId)).trim();
        const document_date = headerData.document_date || headerData.debitNoteDate || headerData.debit_note_date || new Date();
        const document_status = headerData.document_status || (headerData.status === "APPROVED" ? "Approved" : "Draft");
        const remarks = headerData.remarks || headerData.reason || null;
        const exchange_rate = Number(headerData.exchange_rate || 1);
        const round_off = Number(headerData.round_off || 0);

        // 6. Calculate Financial Totals
        const rawLines = rawBody.lines || rawBody.lineItems || rawBody.details || headerData.lines || [];
        let subtotal = 0;
        let discountAmount = 0;
        let taxAmount = 0;
        let totalAmount = 0;

        if (Array.isArray(rawLines) && rawLines.length > 0) {
            subtotal = calculateSubtotal(rawLines);
            discountAmount = calculateDiscount(rawLines);
            taxAmount = calculateTax(rawLines);
            totalAmount = calculateGrandTotal({ subtotal, discountAmount, taxAmount, roundOff: round_off });
        } else {
            subtotal = Number(headerData.subtotal !== undefined ? headerData.subtotal : (headerData.amount || headerData.total_amount || 0));
            discountAmount = Number(headerData.discount_amount !== undefined ? headerData.discount_amount : (headerData.discountAmount || 0));
            taxAmount = Number(headerData.tax_amount !== undefined ? headerData.tax_amount : (headerData.taxAmount || 0));
            totalAmount = Number(headerData.total_amount !== undefined ? headerData.total_amount : (headerData.amount || (subtotal - discountAmount + taxAmount)));
        }

        // Check for duplicate document number
        const existingDocument = await DebitNoteHeader.findOne({
            where: { company_id: companyId, document_number, isActive: true },
        });
        if (existingDocument) {
            res.status(StatusCodes.CONFLICT);
            throw new Error(`Debit Note #${document_number} already exists`);
        }

        // 7. Create DebitNoteHeader
        const header = await DebitNoteHeader.create({
            document_number,
            voucher_type_id,
            module_type,
            company_id: companyId,
            subsidiary_id,
            vendor_id: vendor_id ? Number(vendor_id) : null,
            customer_id: customer_id ? Number(customer_id) : null,
            reference_document_id: headerData.reference_document_id ? Number(headerData.reference_document_id) : (headerData.purchaseInvoiceHeaderId ? Number(headerData.purchaseInvoiceHeaderId) : null),
            reference_document_type: headerData.reference_document_type || (headerData.purchaseInvoiceHeaderId ? "PurchaseInvoice" : null),
            posting_status: "NotPosted",
            document_status,
            document_date,
            currency_id,
            exchange_rate,
            subtotal: Number(subtotal.toFixed(2)),
            discount_amount: Number(discountAmount.toFixed(2)),
            tax_amount: Number(taxAmount.toFixed(2)),
            round_off,
            total_amount: Number(totalAmount.toFixed(2)),
            remarks,
            created_by: userId,
            updated_by: userId,
            isActive: true,
        });

        // 8. Create lines if any
        if (Array.isArray(rawLines) && rawLines.length > 0) {
            await DebitNoteLine.bulkCreate(
                rawLines.map((line: any) => ({
                    header_id: header.id,
                    company_id: companyId,
                    item_id: Number(line.item_id || line.itemId),
                    description: line.description ?? null,
                    quantity: Number(line.quantity || line.qty || 1),
                    uom_id: Number(line.uom_id || line.uomId || 1),
                    rate: Number(line.rate || line.unitPrice || 0),
                    discount_percentage: Number(line.discount_percentage || line.discountPercent || 0),
                    discount_amount: Number(line.discount_amount || line.discountAmount || 0),
                    tax_code_id: line.tax_code_id ? Number(line.tax_code_id) : null,
                    tax_percentage: Number(line.tax_percentage || line.taxPercent || 0),
                    tax_amount: Number(line.tax_amount || line.taxAmount || 0),
                    line_amount: Number(line.line_amount || line.totalAmount || 0),
                    remarks: line.remarks ?? null,
                    created_by: userId,
                    updated_by: userId,
                    isActive: true,
                })) as any
            );
        }

        // 9. Post GL if approved
        if (document_status === "Approved" || document_status === "Posted") {
            const createdLines = await DebitNoteLine.findAll({ where: { header_id: header.id } });
            await postDebitNoteToGL(header, createdLines);
        }

        const result = await DebitNoteHeader.findByPk(header.id, {
            include: [
                { association: "voucherType", attributes: ["id", "code", "name"] },
                { association: "company", attributes: ["id", "name"] },
                { association: "subsidiary", attributes: ["id", "subsidiary_name"] },
                { association: "currency", attributes: ["id", "currency_name", "currency_code"] },
                { association: "vendor" },
                { association: "customer" },
                { association: "lines" },
            ],
        });

        res.status(StatusCodes.CREATED).json({ message: "Debit note created successfully", success: true, result });
    }),

    getDebitNotes: asyncHandler(async (req: CustomRequest, res: Response) => {
        const userId = req.user?.id;
        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;

        const page = Number(req.query.page || 1);
        const limit = Number(req.query.limit || 50);
        const offset = (page - 1) * limit;
        const search = String(req.query.search || "").trim();
        const moduleType = req.query.module_type as string | undefined;
        const documentStatus = req.query.document_status as string | undefined;
        const postingStatus = req.query.posting_status as string | undefined;

        const where: any = { isActive: true };
        if (companyId) where.company_id = companyId;
        if (moduleType) where.module_type = moduleType;
        if (documentStatus) where.document_status = documentStatus;
        if (postingStatus) where.posting_status = postingStatus;
        if (search) {
            where.document_number = { [Op.like]: `%${search}%` };
        }

        const { count, rows } = await DebitNoteHeader.findAndCountAll({
            where,
            include: [
                { association: "voucherType", attributes: ["id", "code", "name"] },
                { association: "subsidiary", attributes: ["id", "subsidiary_name"] },
                { association: "currency", attributes: ["id", "currency_name", "currency_code"] },
                { association: "vendor" },
                { association: "customer" },
            ],
            limit,
            offset,
            order: [["document_date", "DESC"], ["id", "DESC"]],
        });

        res.status(StatusCodes.OK).json({ message: "Debit notes fetched successfully", success: true, result: { rows, count, page, limit, totalPages: Math.ceil(count / limit) } });
    }),

    getDebitNoteById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid debit note ID is required");
        }
        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;

        const whereHeader: any = { id: Number(id), isActive: true };
        if (companyId) whereHeader.company_id = companyId;

        const header = await DebitNoteHeader.findOne({
            where: whereHeader,
            include: [
                { association: "voucherType", attributes: ["id", "code", "name"] },
                { association: "company", attributes: ["id", "name"] },
                { association: "subsidiary", attributes: ["id", "subsidiary_name"] },
                { association: "currency", attributes: ["id", "currency_name", "currency_code"] },
                { association: "vendor" },
                { association: "customer" },
                { association: "lines", include: [{ association: "item", attributes: ["id", "item_name"] }, { association: "uom", attributes: ["id", "uom_name"] }] },
            ],
        });

        if (!header) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Debit note not found");
        }

        res.status(StatusCodes.OK).json({ message: "Debit note fetched successfully", success: true, result: header });
    }),

    updateDebitNote: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const rawBody = req.body || {};
        const headerData = rawBody.header ? { ...rawBody, ...rawBody.header } : rawBody;
        const userId = req.user?.id || headerData.user_id || 1;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid debit note ID is required");
        }
        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const company = await findCompanyForUser(req.user);
        const companyId = company?.id || headerData.company_id;

        const whereHeader: any = { id: Number(id), isActive: true };
        if (companyId) whereHeader.company_id = companyId;

        const header = await DebitNoteHeader.findOne({ where: whereHeader });
        if (!header) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Debit note not found");
        }

        if (header.document_status === "Posted" || header.document_status === "Cancelled") {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Cannot modify posted or cancelled debit note");
        }

        const docNumber = headerData.document_number || headerData.debitNoteNumber || headerData.debit_note_number;
        if (docNumber && docNumber !== header.document_number) {
            const duplicate = await DebitNoteHeader.findOne({ 
                where: { 
                    company_id: header.company_id, 
                    document_number: docNumber, 
                    isActive: true,
                    id: { [Op.ne]: header.id }
                } 
            });
            if (duplicate) {
                res.status(StatusCodes.CONFLICT);
                throw new Error("Duplicate document number already exists");
            }
            header.document_number = docNumber;
        }

        const subId = headerData.subsidiary_id || headerData.subsidiaryId;
        if (subId) header.subsidiary_id = Number(subId);

        const vId = headerData.vendor_id || headerData.vendorId;
        if (vId !== undefined) header.vendor_id = vId ? Number(vId) : null;

        const cId = headerData.customer_id || headerData.customerId;
        if (cId !== undefined) header.customer_id = cId ? Number(cId) : null;

        const refDocId = headerData.reference_document_id || headerData.purchaseInvoiceHeaderId;
        if (refDocId !== undefined) header.reference_document_id = refDocId ? Number(refDocId) : null;

        if (headerData.document_date || headerData.debitNoteDate) {
            header.document_date = headerData.document_date || headerData.debitNoteDate;
        }
        if (headerData.currency_id || headerData.currencyId) {
            header.currency_id = Number(headerData.currency_id || headerData.currencyId);
        }
        if (headerData.remarks !== undefined || headerData.reason !== undefined) {
            header.remarks = headerData.remarks || headerData.reason || null;
        }
        if (headerData.status || headerData.document_status) {
            header.document_status = headerData.document_status || (headerData.status === "APPROVED" ? "Approved" : "Draft");
        }

        const rawLines = rawBody.lines || rawBody.lineItems || rawBody.details || headerData.lines;
        if (Array.isArray(rawLines) && rawLines.length > 0) {
            const subtotal = calculateSubtotal(rawLines);
            const discountAmount = calculateDiscount(rawLines);
            const taxAmount = calculateTax(rawLines);
            const totalAmount = calculateGrandTotal({ subtotal, discountAmount, taxAmount, roundOff: Number(header.round_off || 0) });
            header.subtotal = Number(subtotal.toFixed(2));
            header.discount_amount = Number(discountAmount.toFixed(2));
            header.tax_amount = Number(taxAmount.toFixed(2));
            header.total_amount = Number(totalAmount.toFixed(2));

            await DebitNoteLine.destroy({ where: { header_id: header.id } });
            await DebitNoteLine.bulkCreate(rawLines.map((line: any) => ({
                header_id: header.id,
                company_id: header.company_id,
                item_id: Number(line.item_id || line.itemId),
                description: line.description ?? null,
                quantity: Number(line.quantity || line.qty || 1),
                uom_id: Number(line.uom_id || line.uomId || 1),
                rate: Number(line.rate || line.unitPrice || 0),
                discount_percentage: Number(line.discount_percentage || line.discountPercent || 0),
                discount_amount: Number(line.discount_amount || line.discountAmount || 0),
                tax_code_id: line.tax_code_id ? Number(line.tax_code_id) : null,
                tax_percentage: Number(line.tax_percentage || line.taxPercent || 0),
                tax_amount: Number(line.tax_amount || line.taxAmount || 0),
                line_amount: Number(line.line_amount || line.totalAmount || 0),
                remarks: line.remarks ?? null,
                created_by: userId,
                updated_by: userId,
                isActive: true,
            })) as any);
        } else {
            if (headerData.subtotal !== undefined) header.subtotal = Number(headerData.subtotal);
            if (headerData.discount_amount !== undefined || headerData.discountAmount !== undefined) {
                header.discount_amount = Number(headerData.discount_amount !== undefined ? headerData.discount_amount : headerData.discountAmount);
            }
            if (headerData.tax_amount !== undefined || headerData.taxAmount !== undefined) {
                header.tax_amount = Number(headerData.tax_amount !== undefined ? headerData.tax_amount : headerData.taxAmount);
            }
            if (headerData.total_amount !== undefined || headerData.amount !== undefined) {
                header.total_amount = Number(headerData.total_amount !== undefined ? headerData.total_amount : headerData.amount);
            }
        }

        header.updated_by = userId;
        await header.save();

        if (header.document_status === "Approved" || header.document_status === "Posted") {
            const lines = await DebitNoteLine.findAll({ where: { header_id: header.id } });
            await postDebitNoteToGL(header, lines);
        }

        const result = await DebitNoteHeader.findByPk(header.id, { 
            include: [
                { association: "voucherType", attributes: ["id", "code", "name"] },
                { association: "subsidiary", attributes: ["id", "subsidiary_name"] },
                { association: "currency", attributes: ["id", "currency_name", "currency_code"] },
                { association: "vendor" },
                { association: "customer" },
                { association: "lines" }
            ] 
        });
        res.status(StatusCodes.OK).json({ message: "Debit note updated successfully", success: true, result });
    }),

    deleteDebitNote: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid debit note ID is required");
        }
        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;

        const whereHeader: any = { id: Number(id), isActive: true };
        if (companyId) whereHeader.company_id = companyId;

        const header = await DebitNoteHeader.findOne({ where: whereHeader });
        if (!header) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Debit note not found");
        }

        header.isActive = false;
        header.document_status = "Cancelled";
        header.updated_by = userId;
        await header.save();

        res.status(StatusCodes.OK).json({ message: "Debit note deleted successfully", success: true, result: null });
    }),
};

export default DebitNoteController;
