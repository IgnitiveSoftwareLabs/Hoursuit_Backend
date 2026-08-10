import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import { findCompanyForUser } from "../../../../utils/findCompanyForUser";
import { normalizePurchasePaymentStatus } from "../../../../utils/p2pStatus";
import { CustomRequest } from "../../../../typeRequest/customReq";
import sequelize from "../../../../dbconfig/dbconfig";
import { PurchasePaymentHeader, PurchasePaymentLine } from "../../../../modals/Transactions/purchase/purchasePayment";
import PurchaseInvoiceHeader from "../../../../modals/Transactions/purchase/purchaseInvoice/purchaseInvoiceHeader";
import VendorDetails from "../../../../modals/masters/vendorDetails/vendorDetails";
import PaymentMethod from "../../../../modals/masters/paymentMethod/paymentMethod";
import { GLImpactService } from "../../../../utils/glImpactService";

const normalizeOptionalId = (value: unknown) => {
    if (value === null || value === undefined || value === "") {
        return null;
    }
    return Number(value);
};

const PurchasePaymentController = {
    createPurchasePayment: asyncHandler(async (req: CustomRequest, res: Response) => {
        const transaction = await sequelize.transaction();
        try {
            let header = req.body.header;
            let paymentLines = req.body.paymentLines || req.body.lineItems;

            if (typeof header === "string") {
                header = JSON.parse(header);
            }
            if (typeof paymentLines === "string") {
                paymentLines = JSON.parse(paymentLines);
            }

            if (!header || !Array.isArray(paymentLines) || paymentLines.length === 0) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Header and at least one invoice payment allocation line are required");
            }

            const company = await findCompanyForUser(req.user);
            const companyId = company?.id;
            const user_id = req.user?.id;

            if (!companyId || !user_id) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User authentication required");
            }

            const paymentDate = header.paymentDate ? new Date(header.paymentDate) : null;
            const status = normalizePurchasePaymentStatus(header.status, "DRAFT");

            let calculatedTotal = 0;
            const preparedLines: any[] = [];

            for (let i = 0; i < paymentLines.length; i++) {
                const line = paymentLines[i];
                const purchaseInvoiceHeaderId = Number(line.purchaseInvoiceHeaderId);
                const amountPaid = Number(line.amountPaid);

                if (!purchaseInvoiceHeaderId) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`purchaseInvoiceHeaderId is required in payment line ${i + 1}`);
                }
                if (!amountPaid || amountPaid <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`amountPaid must be greater than zero in payment line ${i + 1}`);
                }

                calculatedTotal += amountPaid;
                preparedLines.push({
                    purchaseInvoiceHeaderId,
                    amountPaid,
                    remarks: line.remarks || null,
                    CompanyId: companyId,
                    user_id,
                });
            }

            const totalAmount = header.totalAmount !== undefined && header.totalAmount !== ""
                ? Number(header.totalAmount)
                : Number(calculatedTotal.toFixed(2));

            const headerPayload: any = {
                paymentNumber: String(header.paymentNumber || "").trim(),
                paymentDate,
                vendorId: Number(header.vendorId),
                paymentMethodId: normalizeOptionalId(header.paymentMethodId),
                bankAccountId: normalizeOptionalId(header.bankAccountId),
                totalAmount,
                currency: header.currency || "INR",
                exchangeRate: header.exchangeRate !== undefined && header.exchangeRate !== "" ? Number(header.exchangeRate) : 1,
                referenceNo: header.referenceNo || null,
                status,
                remarks: header.remarks || null,
                companyId,
                user_id,
            };

            if (!headerPayload.paymentNumber) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("paymentNumber is required");
            }
            if (!headerPayload.vendorId) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("vendorId is required");
            }
            if (!headerPayload.paymentDate || Number.isNaN(headerPayload.paymentDate.getTime())) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid paymentDate is required");
            }

            const createdHeader = await PurchasePaymentHeader.create(headerPayload, { transaction });

            const createdLines: any[] = [];
            for (const linePayload of preparedLines) {
                linePayload.paymentHeaderId = createdHeader.id;
                const createdLine = await PurchasePaymentLine.create(linePayload, { transaction });
                createdLines.push(createdLine);
            }

            await transaction.commit();

            res.status(StatusCodes.CREATED).json({
                success: true,
                message: "Purchase payment created successfully",
                result: {
                    header: createdHeader,
                    paymentLines: createdLines,
                },
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }),

    getAllPurchasePayments: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;

        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const { page = 1, limit = 10, search, status, vendorId } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const whereClause: any = { companyId };

        if (search) {
            whereClause[Op.or] = [
                { paymentNumber: { [Op.like]: `%${search}%` } },
                { referenceNo: { [Op.like]: `%${search}%` } },
                { remarks: { [Op.like]: `%${search}%` } },
            ];
        }
        if (status) {
            whereClause.status = status;
        }
        if (vendorId) {
            whereClause.vendorId = Number(vendorId);
        }

        const { rows: payments, count: total } = await PurchasePaymentHeader.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: VendorDetails,
                    as: "vendor",
                    attributes: ["id", "vendor_name"],
                    required: false,
                },
                {
                    model: PaymentMethod,
                    as: "paymentMethod",
                    attributes: ["id", "name"],
                    required: false,
                },
                {
                    model: PurchasePaymentLine,
                    as: "paymentLines",
                    required: false,
                    include: [
                        {
                            model: PurchaseInvoiceHeader,
                            as: "purchaseInvoiceHeader",
                            attributes: ["id", "invoiceNumber", "totalAmount", "paidAmount", "balanceAmount"],
                        },
                    ],
                },
            ],
            offset,
            limit: Number(limit),
            order: [["createdAt", "DESC"]],
        });

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Purchase payments fetched successfully",
            result: payments,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }),

    getPurchasePaymentById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;

        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const payment = await PurchasePaymentHeader.findOne({
            where: { id: Number(id), companyId },
            include: [
                {
                    model: VendorDetails,
                    as: "vendor",
                    attributes: ["id", "vendor_name"],
                    required: false,
                },
                {
                    model: PaymentMethod,
                    as: "paymentMethod",
                    attributes: ["id", "name"],
                    required: false,
                },
                {
                    model: PurchasePaymentLine,
                    as: "paymentLines",
                    required: false,
                    include: [
                        {
                            model: PurchaseInvoiceHeader,
                            as: "purchaseInvoiceHeader",
                            attributes: ["id", "invoiceNumber", "totalAmount", "paidAmount", "balanceAmount", "status"],
                        },
                    ],
                },
            ],
        });

        if (!payment) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Purchase payment not found");
        }

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Purchase payment fetched successfully",
            result: payment,
        });
    }),

    updatePurchasePayment: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const transaction = await sequelize.transaction();

        try {
            let header = req.body.header;
            let paymentLines = req.body.paymentLines || req.body.lineItems;

            if (typeof header === "string") {
                header = JSON.parse(header);
            }
            if (typeof paymentLines === "string") {
                paymentLines = JSON.parse(paymentLines);
            }

            if (!header || !Array.isArray(paymentLines) || paymentLines.length === 0) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Header and at least one invoice payment allocation line are required");
            }

            const company = await findCompanyForUser(req.user);
            const companyId = company?.id;
            const user_id = req.user?.id;

            if (!companyId || !user_id) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User authentication required");
            }

            const existingPayment = await PurchasePaymentHeader.findOne({
                where: { id: Number(id), companyId },
                transaction,
            });

            if (!existingPayment) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Purchase payment not found");
            }

            if (existingPayment.status === "POSTED") {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Cannot edit a POSTED purchase payment");
            }

            const paymentDate = header.paymentDate ? new Date(header.paymentDate) : existingPayment.paymentDate;
            const status = normalizePurchasePaymentStatus(header.status || existingPayment.status, existingPayment.status || "DRAFT");

            let calculatedTotal = 0;
            const preparedLines: any[] = [];

            for (let i = 0; i < paymentLines.length; i++) {
                const line = paymentLines[i];
                const purchaseInvoiceHeaderId = Number(line.purchaseInvoiceHeaderId);
                const amountPaid = Number(line.amountPaid);

                if (!purchaseInvoiceHeaderId) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`purchaseInvoiceHeaderId is required in payment line ${i + 1}`);
                }
                if (!amountPaid || amountPaid <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`amountPaid must be greater than zero in payment line ${i + 1}`);
                }

                calculatedTotal += amountPaid;
                preparedLines.push({
                    paymentHeaderId: existingPayment.id,
                    purchaseInvoiceHeaderId,
                    amountPaid,
                    remarks: line.remarks || null,
                    CompanyId: companyId,
                    user_id,
                });
            }

            const totalAmount = header.totalAmount !== undefined && header.totalAmount !== ""
                ? Number(header.totalAmount)
                : Number(calculatedTotal.toFixed(2));

            const headerPayload: any = {
                paymentNumber: String(header.paymentNumber || existingPayment.paymentNumber).trim(),
                paymentDate,
                vendorId: Number(header.vendorId || existingPayment.vendorId),
                paymentMethodId: normalizeOptionalId(header.paymentMethodId),
                bankAccountId: normalizeOptionalId(header.bankAccountId),
                totalAmount,
                currency: header.currency || existingPayment.currency,
                exchangeRate: header.exchangeRate !== undefined && header.exchangeRate !== "" ? Number(header.exchangeRate) : existingPayment.exchangeRate,
                referenceNo: header.hasOwnProperty("referenceNo") ? header.referenceNo : existingPayment.referenceNo,
                status,
                remarks: header.hasOwnProperty("remarks") ? header.remarks : existingPayment.remarks,
                companyId,
                user_id,
            };

            await existingPayment.update(headerPayload, { transaction });

            await PurchasePaymentLine.destroy({ where: { paymentHeaderId: existingPayment.id }, transaction });

            const updatedLines: any[] = [];
            for (const linePayload of preparedLines) {
                const createdLine = await PurchasePaymentLine.create(linePayload, { transaction });
                updatedLines.push(createdLine);
            }

            await transaction.commit();

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Purchase payment updated successfully",
                result: {
                    header: existingPayment,
                    paymentLines: updatedLines,
                },
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }),

    updatePurchasePaymentStatus: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { status } = req.body;

        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;

        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const payment = await PurchasePaymentHeader.findOne({
            where: { id: Number(id), companyId },
            include: [
                {
                    model: PurchasePaymentLine,
                    as: "paymentLines",
                },
            ],
        });

        if (!payment) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Purchase payment not found");
        }
        if (!status) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("status is required");
        }

        const previousStatus = payment.status;
        const normalizedStatus = normalizePurchasePaymentStatus(status);

        if (previousStatus === normalizedStatus) {
            res.status(StatusCodes.OK).json({
                success: true,
                message: `Purchase payment status is already set to ${status}`,
                result: payment,
            });
            return;
        }

        if (previousStatus === "POSTED") {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Purchase payment is already POSTED and cannot change status");
        }

        await sequelize.transaction(async (t) => {
            await payment.update({ status: normalizedStatus as "DRAFT" | "POSTED" | "CANCELLED" }, { transaction: t });

            if (normalizedStatus === "POSTED") {
                const paymentLines = (payment as any).paymentLines || [];
                for (const line of paymentLines) {
                    const invoice = await PurchaseInvoiceHeader.findOne({
                        where: { id: line.purchaseInvoiceHeaderId, companyId },
                        transaction: t,
                    });

                    if (invoice) {
                        const currentPaid = Number(invoice.paidAmount || 0);
                        const totalInv = Number(invoice.totalAmount || 0);
                        const newPaid = Number((currentPaid + Number(line.amountPaid || 0)).toFixed(2));
                        const newBalance = Number((totalInv - newPaid).toFixed(2));
                        const newInvoiceStatus = newBalance <= 0 ? "PAID" : "PARTIAL_PAID";

                        await invoice.update({
                            paidAmount: newPaid,
                            balanceAmount: newBalance < 0 ? 0 : newBalance,
                            status: newInvoiceStatus,
                        }, { transaction: t });
                    }
                }

                // Post GL Impact (Debit Accounts Payable, Credit Bank/Cash)
                await GLImpactService.processPurchasePaymentPosting(
                    payment.id,
                    companyId,
                    user_id,
                    undefined,
                    3, // Accounts Payable Vendor Account ID
                    payment.bankAccountId || undefined,
                    t
                );
            }
        });

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Purchase payment status updated successfully",
            result: payment,
        });
    }),

    deletePurchasePayment: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;

        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const payment = await PurchasePaymentHeader.findOne({ where: { id: Number(id), companyId } });
        if (!payment) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Purchase payment not found");
        }

        if (payment.status === "POSTED") {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Cannot delete a POSTED purchase payment");
        }

        await PurchasePaymentLine.destroy({ where: { paymentHeaderId: payment.id } });
        await payment.destroy();

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Purchase payment deleted successfully",
            result: null,
        });
    }),
};

export default PurchasePaymentController;
