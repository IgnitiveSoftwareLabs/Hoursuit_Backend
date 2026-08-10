import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
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
import { calculateDiscount, calculateGrandTotal, calculateSubtotal, calculateTax, generateDocumentNumber } from "../../../utils/noteHelpers";
import { postDebitNoteToGL } from "../../../services/accounting/debitNotePosting";

const DebitNoteController = {
    createDebitNote: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { document_number, voucher_type_id, module_type, subsidiary_id, vendor_id, customer_id, reference_document_id, reference_document_type, document_status, document_date, currency_id, exchange_rate, lines, remarks, round_off } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const company = await findCompanyForUser(req.user);
        if (!company) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Unauthorized: Company not found for user");
        }

        const subsidiary = await SubsidiaryMaster.findByPk(subsidiary_id);
        if (!subsidiary) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Invalid subsidiary selected");
        }

        const voucherType = await VoucherTypeMaster.findByPk(voucher_type_id);
        if (!voucherType) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Invalid voucher type selected");
        }

        const currency = await CurrencyMaster.findByPk(currency_id);
        if (!currency) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Invalid currency selected");
        }

        if (module_type === "PURCHASE") {
            if (!vendor_id) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Vendor is required for purchase debit note");
            }
            const vendor = await VendorDetails.findByPk(vendor_id);
            if (!vendor) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Invalid vendor selected");
            }
        } else if (module_type === "SALES") {
            if (!customer_id) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Customer is required for sales debit note");
            }
            const customer = await Customer.findByPk(customer_id);
            if (!customer) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Invalid customer selected");
            }
        } else {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Invalid module type");
        }

        const existingDocument = await DebitNoteHeader.findOne({
            where: { company_id: company.id, document_number, isActive: true },
        });
        if (existingDocument) {
            res.status(StatusCodes.CONFLICT);
            throw new Error("Duplicate document number already exists");
        }

        if (!Array.isArray(lines) || lines.length === 0) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("At least one debit note line is required");
        }

        for (const line of lines) {
            const item = await ItemMaster.findByPk(line.item_id);
            const uom = await UOMMaster.findByPk(line.uom_id);
            if (!item || !uom) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Invalid item or UOM in debit note line");
            }
        }

        const subtotal = calculateSubtotal(lines);
        const discountAmount = calculateDiscount(lines);
        const taxAmount = calculateTax(lines);
        const roundOffValue = Number(round_off || 0);
        const totalAmount = calculateGrandTotal({ subtotal, discountAmount, taxAmount, roundOff: roundOffValue });

        const header = await DebitNoteHeader.create({
            document_number: document_number || generateDocumentNumber("DN", company.id),
            voucher_type_id,
            module_type,
            company_id: company.id,
            subsidiary_id,
            vendor_id: vendor_id ?? null,
            customer_id: customer_id ?? null,
            reference_document_id: reference_document_id ?? null,
            reference_document_type: reference_document_type ?? null,
            posting_status: "NotPosted",
            document_status: document_status || "Draft",
            document_date: document_date || new Date(),
            currency_id,
            exchange_rate: exchange_rate ?? 1,
            subtotal,
            discount_amount: discountAmount,
            tax_amount: taxAmount,
            round_off: roundOffValue,
            total_amount: totalAmount,
            remarks: remarks ?? null,
            created_by: userId,
            updated_by: userId,
            isActive: true,
        });

        await DebitNoteLine.bulkCreate(
            lines.map((line: any) => ({
                header_id: header.id,
                company_id: company.id,
                item_id: line.item_id,
                description: line.description ?? null,
                quantity: Number(line.quantity || 0),
                uom_id: line.uom_id,
                rate: Number(line.rate || 0),
                discount_percentage: Number(line.discount_percentage || 0),
                discount_amount: Number(line.discount_amount || 0),
                tax_code_id: line.tax_code_id ?? null,
                tax_percentage: Number(line.tax_percentage || 0),
                tax_amount: Number(line.tax_amount || 0),
                line_amount: Number(line.line_amount || 0),
                remarks: line.remarks ?? null,
                created_by: userId,
                updated_by: userId,
                isActive: true,
            })) as any
        );

        const result = await DebitNoteHeader.findByPk(header.id, {
            include: [
                { association: "voucherType", attributes: ["id", "code", "name"] },
                { association: "company", attributes: ["id", "name"] },
                { association: "subsidiary", attributes: ["id", "subsidiary_name"] },
                { association: "currency", attributes: ["id", "currency_name", "currency_code"] },
                { association: "vendor", attributes: ["id", "name"] },
                { association: "customer", attributes: ["id", "name"] },
                { association: "lines", include: [{ association: "item", attributes: ["id", "item_name"] }, { association: "uom", attributes: ["id", "uom_name"] }] },
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
        if (!company) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Unauthorized: Company not found for user");
        }

        const page = Number(req.query.page || 1);
        const limit = Number(req.query.limit || 20);
        const offset = (page - 1) * limit;
        const search = String(req.query.search || "").trim();
        const moduleType = req.query.module_type as string | undefined;
        const documentStatus = req.query.document_status as string | undefined;
        const postingStatus = req.query.posting_status as string | undefined;

        const where: any = { company_id: company.id, isActive: true };
        if (moduleType) where.module_type = moduleType;
        if (documentStatus) where.document_status = documentStatus;
        if (postingStatus) where.posting_status = postingStatus;
        if (search) where.document_number = { ["$like"]: `%${search}%` };

        const { count, rows } = await DebitNoteHeader.findAndCountAll({
            where,
            include: [
                { association: "voucherType", attributes: ["id", "code", "name"] },
                { association: "subsidiary", attributes: ["id", "subsidiary_name"] },
                { association: "currency", attributes: ["id", "currency_name", "currency_code"] },
                { association: "vendor", attributes: ["id", "name"] },
                { association: "customer", attributes: ["id", "name"] },
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
        if (!company) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Unauthorized: Company not found for user");
        }

        const header = await DebitNoteHeader.findOne({
            where: { id: Number(id), company_id: company.id, isActive: true },
            include: [
                { association: "voucherType", attributes: ["id", "code", "name"] },
                { association: "company", attributes: ["id", "name"] },
                { association: "subsidiary", attributes: ["id", "subsidiary_name"] },
                { association: "currency", attributes: ["id", "currency_name", "currency_code"] },
                { association: "vendor", attributes: ["id", "name"] },
                { association: "customer", attributes: ["id", "name"] },
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
        const { document_number, voucher_type_id, module_type, subsidiary_id, vendor_id, customer_id, reference_document_id, reference_document_type, document_status, document_date, currency_id, exchange_rate, lines, remarks, round_off } = req.body;
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
        if (!company) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Unauthorized: Company not found for user");
        }

        const header = await DebitNoteHeader.findOne({ where: { id: Number(id), company_id: company.id, isActive: true } });
        if (!header) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Debit note not found");
        }

        if (header.document_status === "Posted" || header.document_status === "Cancelled") {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Cannot modify posted or cancelled debit note");
        }

        if (document_number) {
            const duplicate = await DebitNoteHeader.findOne({ where: { company_id: company.id, document_number, isActive: true } });
            if (duplicate && duplicate.id !== header.id) {
                res.status(StatusCodes.CONFLICT);
                throw new Error("Duplicate document number already exists");
            }
            header.document_number = document_number;
        }

        if (voucher_type_id) header.voucher_type_id = voucher_type_id;
        if (module_type) header.module_type = module_type;
        if (subsidiary_id) header.subsidiary_id = subsidiary_id;
        if (vendor_id !== undefined) header.vendor_id = vendor_id ?? null;
        if (customer_id !== undefined) header.customer_id = customer_id ?? null;
        if (reference_document_id !== undefined) header.reference_document_id = reference_document_id ?? null;
        if (reference_document_type !== undefined) header.reference_document_type = reference_document_type ?? null;
        if (document_status) header.document_status = document_status;
        if (document_date) header.document_date = document_date;
        if (currency_id) header.currency_id = currency_id;
        if (exchange_rate !== undefined) header.exchange_rate = exchange_rate ?? 1;
        if (remarks !== undefined) header.remarks = remarks ?? null;
        if (round_off !== undefined) header.round_off = Number(round_off || 0);

        if (Array.isArray(lines)) {
            const subtotal = calculateSubtotal(lines);
            const discountAmount = calculateDiscount(lines);
            const taxAmount = calculateTax(lines);
            const totalAmount = calculateGrandTotal({ subtotal, discountAmount, taxAmount, roundOff: Number(header.round_off || 0) });
            header.subtotal = subtotal;
            header.discount_amount = discountAmount;
            header.tax_amount = taxAmount;
            header.total_amount = totalAmount;
            await DebitNoteLine.destroy({ where: { header_id: header.id } });
            await DebitNoteLine.bulkCreate(lines.map((line: any) => ({
                header_id: header.id,
                company_id: company.id,
                item_id: line.item_id,
                description: line.description ?? null,
                quantity: Number(line.quantity || 0),
                uom_id: line.uom_id,
                rate: Number(line.rate || 0),
                discount_percentage: Number(line.discount_percentage || 0),
                discount_amount: Number(line.discount_amount || 0),
                tax_code_id: line.tax_code_id ?? null,
                tax_percentage: Number(line.tax_percentage || 0),
                tax_amount: Number(line.tax_amount || 0),
                line_amount: Number(line.line_amount || 0),
                remarks: line.remarks ?? null,
                created_by: userId,
                updated_by: userId,
                isActive: true,
            })) as any);
        }

        header.updated_by = userId;
        await header.save();

        if (header.document_status === "Approved") {
            const lines = await DebitNoteLine.findAll({ where: { header_id: header.id } });
            await postDebitNoteToGL(header, lines);
        }

        const result = await DebitNoteHeader.findByPk(header.id, { include: [{ association: "lines" }] });
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
        if (!company) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Unauthorized: Company not found for user");
        }

        const header = await DebitNoteHeader.findOne({ where: { id: Number(id), company_id: company.id, isActive: true } });
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
