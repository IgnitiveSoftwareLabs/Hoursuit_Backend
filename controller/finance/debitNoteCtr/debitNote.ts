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
import { generateSequentialDocNumber } from "../../../utils/documentNumberHelper";
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
        let document_number = String(headerData.document_number || headerData.debitNoteNumber || headerData.debit_note_number || "").trim();
        if (!document_number || document_number.startsWith("DN-NEW") || document_number === "To Be Generated" || document_number.startsWith("DN-17") || document_number.includes(new Date().getFullYear().toString())) {
            document_number = await generateSequentialDocNumber(
                DebitNoteHeader,
                "document_number",
                "DN",
                "company_id",
                companyId
            );
        } else {
            const existingDocument = await DebitNoteHeader.findOne({
                where: { company_id: companyId, document_number, isActive: true },
            });
            if (existingDocument) {
                document_number = await generateSequentialDocNumber(
                    DebitNoteHeader,
                    "document_number",
                    "DN",
                    "company_id",
                    companyId
                );
            }
        }
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
            where[Op.or] = [
                { document_number: { [Op.iLike]: `%${search}%` } },
                { remarks: { [Op.iLike]: `%${search}%` } },
            ];
        }

        const { rows, count } = await DebitNoteHeader.findAndCountAll({
            where,
            include: [
                { association: "voucherType", attributes: ["id", "code", "name"] },
                { association: "subsidiary", attributes: ["id", "subsidiary_name"] },
                { association: "currency", attributes: ["id", "currency_name", "currency_code"] },
                { association: "vendor" },
                { association: "customer" },
                { association: "lines" },
            ],
            order: [["created_at", "DESC"]],
            offset,
            limit,
            distinct: true,
        });

        res.status(StatusCodes.OK).json({
            message: "Debit notes fetched successfully",
            success: true,
            result: {
                rows,
                count,
                page,
                limit,
                totalPages: Math.ceil(count / limit),
            },
        });
    }),

    getDebitNoteById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const userId = req.user?.id;
        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const id = Number(req.params.id);

        const where: any = { id, isActive: true };
        if (companyId) where.company_id = companyId;

        const debitNote = await DebitNoteHeader.findOne({
            where,
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

        if (!debitNote) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Debit note not found");
        }

        res.status(StatusCodes.OK).json({ message: "Debit note fetched successfully", success: true, result: debitNote });
    }),

    updateDebitNote: asyncHandler(async (req: CustomRequest, res: Response) => {
        const userId = req.user?.id;
        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const id = Number(req.params.id);

        const where: any = { id, isActive: true };
        if (companyId) where.company_id = companyId;

        const debitNote = await DebitNoteHeader.findOne({ where });
        if (!debitNote) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Debit note not found");
        }

        if (debitNote.posting_status === "Posted") {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Cannot update a posted debit note");
        }

        const rawBody = req.body || {};
        const headerData = rawBody.header ? { ...rawBody, ...rawBody.header } : rawBody;

        const rawLines = rawBody.lines || rawBody.lineItems || rawBody.details || headerData.lines;
        let subtotal = Number(debitNote.subtotal);
        let discountAmount = Number(debitNote.discount_amount);
        let taxAmount = Number(debitNote.tax_amount);
        let totalAmount = Number(debitNote.total_amount);

        if (Array.isArray(rawLines)) {
            subtotal = calculateSubtotal(rawLines);
            discountAmount = calculateDiscount(rawLines);
            taxAmount = calculateTax(rawLines);
            totalAmount = calculateGrandTotal({
                subtotal,
                discountAmount,
                taxAmount,
                roundOff: Number(headerData.round_off !== undefined ? headerData.round_off : debitNote.round_off),
            });
        }

        await debitNote.update({
            subsidiary_id: headerData.subsidiary_id !== undefined ? Number(headerData.subsidiary_id) : debitNote.subsidiary_id,
            vendor_id: headerData.vendor_id !== undefined ? (headerData.vendor_id ? Number(headerData.vendor_id) : null) : debitNote.vendor_id,
            customer_id: headerData.customer_id !== undefined ? (headerData.customer_id ? Number(headerData.customer_id) : null) : debitNote.customer_id,
            document_date: headerData.document_date || headerData.debitNoteDate || debitNote.document_date,
            document_status: headerData.document_status || debitNote.document_status,
            currency_id: headerData.currency_id !== undefined ? Number(headerData.currency_id) : debitNote.currency_id,
            exchange_rate: headerData.exchange_rate !== undefined ? Number(headerData.exchange_rate) : debitNote.exchange_rate,
            subtotal: Number(subtotal.toFixed(2)),
            discount_amount: Number(discountAmount.toFixed(2)),
            tax_amount: Number(taxAmount.toFixed(2)),
            round_off: headerData.round_off !== undefined ? Number(headerData.round_off) : debitNote.round_off,
            total_amount: Number(totalAmount.toFixed(2)),
            remarks: headerData.remarks !== undefined ? headerData.remarks : debitNote.remarks,
            updated_by: userId,
        });

        if (Array.isArray(rawLines)) {
            await DebitNoteLine.destroy({ where: { header_id: debitNote.id } });
            if (rawLines.length > 0) {
                await DebitNoteLine.bulkCreate(
                    rawLines.map((line: any) => ({
                        header_id: debitNote.id,
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
        }

        const updated = await DebitNoteHeader.findByPk(debitNote.id, {
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

        res.status(StatusCodes.OK).json({ message: "Debit note updated successfully", success: true, result: updated });
    }),

    deleteDebitNote: asyncHandler(async (req: CustomRequest, res: Response) => {
        const userId = req.user?.id;
        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const id = Number(req.params.id);

        const where: any = { id, isActive: true };
        if (companyId) where.company_id = companyId;

        const debitNote = await DebitNoteHeader.findOne({ where });
        if (!debitNote) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Debit note not found");
        }

        if (debitNote.posting_status === "Posted") {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Cannot delete a posted debit note");
        }

        await debitNote.update({ isActive: false, updated_by: userId });
        await DebitNoteLine.update({ isActive: false, updated_by: userId }, { where: { header_id: id } });

        res.status(StatusCodes.OK).json({ message: "Debit note deleted successfully", success: true });
    }),
};

export default DebitNoteController;
