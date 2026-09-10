import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import { PurchasePaymentHeader, PurchasePaymentLine } from "../../../../modals/Transactions/purchase/purchasePayment";
import PurchaseInvoiceHeader from "../../../../modals/Transactions/purchase/purchaseInvoice/purchaseInvoiceHeader";
import { PurchaseInvoiceLine } from "../../../../modals/Transactions/purchase/purchaseInvoice";
import ItemMaster from "../../../../modals/masters/items/itemMaster";
import ChartOfAccountMaster from "../../../../modals/masters/chartOfAccount/chartOfAccount";
import VendorDetails from "../../../../modals/masters/vendorDetails/vendorDetails";
import PaymentMethod from "../../../../modals/masters/paymentMethod/paymentMethod";
import { normalizePurchasePaymentStatus, isPurchasePaymentEditable } from "../../../../utils/p2pStatus";
import { findCompanyForUser } from "../../../../utils/findCompanyForUser";
import { GRN } from "../../../../modals/Transactions/purchase/GRN";
import { PurchaseOrder } from "../../../../modals/Transactions/purchase/purchaseOrder";
import { GLImpactService } from "../../../../utils/glImpactService";
import { InventoryService } from "../../../../utils/inventoryService";
import { CustomRequest } from "../../../../typeRequest/customReq";
import sequelize from "../../../../dbconfig/dbconfig";


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
            const body = req.body || {};
            const header = body.header || body;
            let paymentLines = body.lines || body.paymentLines || body.lineItems || body.details;

            if (typeof paymentLines === "string") {
                paymentLines = JSON.parse(paymentLines);
            }

            if (!header || !Array.isArray(paymentLines) || paymentLines.length === 0) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Purchase payment details and at least one invoice payment allocation line are required");
            }

            const company = await findCompanyForUser(req.user);
            const companyId = company?.id;
            const user_id = req.user?.id;

            if (!companyId || !user_id) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User authentication required");
            }

            const paymentDate = header.paymentDate
                ? new Date(header.paymentDate)
                : null;

            const status = normalizePurchasePaymentStatus(header.status, "PENDING_APPROVAL");

            let calculatedTotal = 0;
            const preparedLines: any[] = [];

            for (let i = 0; i < paymentLines.length; i++) {
                const line = paymentLines[i];
                let purchaseInvoiceLineId = Number(line.purchaseInvoiceLineId);
                const amountPaid = Number(line.amountPaid);
                const invHeaderId = Number(line.purchaseInvoiceHeaderId || header.purchaseInvoiceHeaderId);

                if (amountPaid === undefined || amountPaid === null || isNaN(amountPaid) || amountPaid < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`amountPaid must be a non-negative number in payment line ${i + 1}`);
                }

                // Verify or resolve purchaseInvoiceLineId to a real record in DB to prevent foreign key errors
                let invLine = purchaseInvoiceLineId
                    ? await PurchaseInvoiceLine.findOne({
                        where: { id: purchaseInvoiceLineId, CompanyId: companyId },
                        transaction,
                    })
                    : null;

                if (!invLine && invHeaderId) {
                    invLine = await PurchaseInvoiceLine.findOne({
                        where: { invoiceHeaderId: invHeaderId, CompanyId: companyId },
                        order: [["id", "ASC"]],
                        transaction,
                    });
                }

                if (!invLine && invHeaderId) {
                    invLine = await PurchaseInvoiceLine.findOne({
                        where: { invoiceHeaderId: invHeaderId },
                        order: [["id", "ASC"]],
                        transaction,
                    });
                }

                if (!invLine) {
                    // Fallback to any line in current company
                    invLine = await PurchaseInvoiceLine.findOne({
                        where: { CompanyId: companyId },
                        order: [["id", "ASC"]],
                        transaction,
                    });
                }

                if (invLine) {
                    purchaseInvoiceLineId = invLine.id;
                }

                if (!purchaseInvoiceLineId) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`A valid purchase invoice line is required for payment allocation line ${i + 1}`);
                }

                calculatedTotal += amountPaid;

                preparedLines.push({
                    purchaseInvoiceLineId,
                    amountPaid,
                    remarks: line.remarks || null,
                    CompanyId: companyId,
                    user_id,
                });
            }

            const totalAmount =
                header.totalAmount !== undefined &&
                    header.totalAmount !== ""
                    ? Number(header.totalAmount)
                    : Number(calculatedTotal.toFixed(2));

            const headerPayload: any = {
                paymentNumber: String(header.paymentNumber || "").trim(),
                paymentDate,
                vendorId: Number(header.vendorId),
                paymentMethodId: normalizeOptionalId(header.paymentMethodId),
                bankAccountId: normalizeOptionalId(header.bankAccountId),
                apAccountId: normalizeOptionalId(header.apAccountId ?? header.ap_account_id),
                totalAmount,
                currency: header.currency || "INR",
                exchangeRate: header.exchangeRate !== undefined && header.exchangeRate !== ""
                    ? Number(header.exchangeRate)
                    : 1,
                referenceNo: header.referenceNo || null,
                status,
                remarks: header.remarks || null,
                companyId,
                user_id,
                purchaseInvoiceHeaderId: header.purchaseInvoiceHeaderId ? Number(header.purchaseInvoiceHeaderId) : (paymentLines[0]?.purchaseInvoiceHeaderId ? Number(paymentLines[0].purchaseInvoiceHeaderId) : null),
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

            if (headerPayload.totalAmount === undefined || headerPayload.totalAmount === null || isNaN(headerPayload.totalAmount) || headerPayload.totalAmount < 0) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Total payment amount must be a non-negative number");
            }

            if (Number(headerPayload.totalAmount.toFixed(2)) !== Number(calculatedTotal.toFixed(2))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Total payment amount does not match allocated invoice amounts");
            }

            if (headerPayload.purchaseInvoiceHeaderId) {
                const inv = await PurchaseInvoiceHeader.findOne({ where: { id: headerPayload.purchaseInvoiceHeaderId, companyId }, transaction });
                if (inv) {
                    if (inv.poHeaderId) {
                        const po = await PurchaseOrder.findOne({ where: { id: inv.poHeaderId, CompanyId: companyId }, transaction });
                        if (po && po.isActive === false) {
                            res.status(StatusCodes.BAD_REQUEST);
                            throw new Error(`Cannot create Payment for Bill ${inv.invoiceNumber} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
                        }
                    }
                    if (inv.grnHeaderId) {
                        const grn = await GRN.findOne({ where: { id: inv.grnHeaderId, CompanyId: companyId }, transaction });
                        if (grn && grn.purchaseOrderId) {
                            const po = await PurchaseOrder.findOne({ where: { id: grn.purchaseOrderId, CompanyId: companyId }, transaction });
                            if (po && po.isActive === false) {
                                res.status(StatusCodes.BAD_REQUEST);
                                throw new Error(`Cannot create Payment for Bill ${inv.invoiceNumber} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
                            }
                        }
                    }
                }
            }

            const createdHeader =
                await PurchasePaymentHeader.create(
                    headerPayload,
                    { transaction }
                );

            const createdLines: any[] = [];

            for (const linePayload of preparedLines) {
                linePayload.paymentHeaderId = createdHeader.id;

                const createdLine = await PurchasePaymentLine.create(linePayload, { transaction });
                createdLines.push(createdLine);
            }

            if (status === "POSTED" || status === "APPROVED" || status === "PROCESSED") {
                const invoiceMap = new Map<number, number>();
                for (const line of createdLines) {
                    const invLine = await PurchaseInvoiceLine.findOne({
                        where: { id: line.purchaseInvoiceLineId },
                        transaction,
                    });
                    if (invLine && invLine.invoiceHeaderId) {
                        const currentAccum = invoiceMap.get(invLine.invoiceHeaderId) || 0;
                        invoiceMap.set(invLine.invoiceHeaderId, currentAccum + Number(line.amountPaid || 0));
                    }
                }

                if (createdHeader.purchaseInvoiceHeaderId && !invoiceMap.has(createdHeader.purchaseInvoiceHeaderId)) {
                    invoiceMap.set(createdHeader.purchaseInvoiceHeaderId, Number(createdHeader.totalAmount || 0));
                }

                for (const [invId, paidThisPayment] of invoiceMap.entries()) {
                    const invoice = await PurchaseInvoiceHeader.findOne({ where: { id: invId, companyId }, transaction });
                    if (invoice) {
                        const currentPaid = Number(invoice.paidAmount || 0);
                        const totalInvoiceAmount = Number(invoice.totalAmount || 0);
                        const newPaidAmount = Number((currentPaid + paidThisPayment).toFixed(2));
                        const newBalanceAmount = Number((totalInvoiceAmount - newPaidAmount).toFixed(2));
                        const newInvoiceStatus = newBalanceAmount <= 0 ? "PAID" : "PARTIAL_PAID";

                        await invoice.update({
                            paidAmount: newPaidAmount,
                            balanceAmount: newBalanceAmount < 0 ? 0 : newBalanceAmount,
                            status: newInvoiceStatus,
                        }, { transaction });

                        let poIdToSync = invoice.poHeaderId;
                        if (!poIdToSync && invoice.grnHeaderId) {
                            const grn = await GRN.findOne({ where: { id: invoice.grnHeaderId, CompanyId: companyId }, transaction });
                            if (grn?.purchaseOrderId) poIdToSync = grn.purchaseOrderId;
                        }
                        if (poIdToSync) {
                            await InventoryService.syncPurchaseOrderStatus(poIdToSync, companyId, transaction);
                        }
                        if (invoice.grnHeaderId) {
                            await InventoryService.syncGRNStatus(invoice.grnHeaderId, companyId, transaction);
                        }
                    }
                }

                const parsedApAccountId = header.apAccountId ? Number(header.apAccountId) : undefined;
                const parsedBankAccountId = header.bankAccountId ? Number(header.bankAccountId) : undefined;
                await GLImpactService.processPurchasePaymentPosting(
                    createdHeader.id,
                    companyId,
                    user_id,
                    undefined,
                    parsedApAccountId,
                    parsedBankAccountId,
                    transaction
                );
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
            whereClause.paymentDate = {
                [Op.between]: [new Date(String(startDate)), new Date(String(endDate))]
            };
        } else if (startDate) {
            whereClause.paymentDate = { [Op.gte]: new Date(String(startDate)) };
        } else if (endDate) {
            whereClause.paymentDate = { [Op.lte]: new Date(String(endDate)) };
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
                { paymentNumber: { [Op.like]: `%${searchStr}%` } },
                { referenceNo: { [Op.like]: `%${searchStr}%` } },
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
            paymentNumber: [["paymentNumber", sortOrder]],
            referenceNo: [["referenceNo", sortOrder]],
            paymentDate: [["paymentDate", sortOrder]],
            paymentAmount: [["paymentAmount", sortOrder]],
            status: [["status", sortOrder]],
            createdAt: [["createdAt", sortOrder]],
            updatedAt: [["updatedAt", sortOrder]],
        };

        const orderClause = sortFieldMap[sortBy] || [["createdAt", "DESC"]];

        const includeConfig = [
            {
                model: PurchaseInvoiceHeader,
                as: "purchaseInvoice",
                required: false,
            },
            {
                model: VendorDetails,
                as: "vendor",
                attributes: ["id", "company_name", "first_name", "last_name"],
                required: false,
            },
            {
                model: PaymentMethod,
                as: "paymentMethod",
                required: false,
            },
            {
                model: ChartOfAccountMaster,
                as: "bankAccount",
                required: false,
            },
            {
                model: ChartOfAccountMaster,
                as: "apAccount",
                required: false,
            },
            {
                model: PurchasePaymentLine,
                as: "paymentLines",
                required: false,
                include: [
                    {
                        model: PurchaseInvoiceLine,
                        as: "purchaseInvoiceLine",
                        required: false,
                        include: [
                            {
                                model: PurchaseInvoiceHeader,
                                as: "invoiceHeader",
                                required: false,
                            },
                            {
                                model: ItemMaster,
                                as: "item",
                                required: false,
                            },
                        ],
                    },
                ],
            },
        ];

        if (option) {
            const payments = await PurchasePaymentHeader.findAll({
                where: whereClause,
                include: includeConfig,
                order: orderClause,
            });

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Purchase payments fetched successfully",
                result: payments,
                total: payments.length,
            });
            return;
        }

        const total = await PurchasePaymentHeader.count({ where: whereClause });
        const payments = await PurchasePaymentHeader.findAll({
            where: whereClause,
            include: includeConfig,
            offset,
            limit,
            order: orderClause,
        });

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Purchase payments fetched successfully",
            result: payments,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    }),

    exportPurchasePaymentsCSV: asyncHandler(async (req: CustomRequest, res: Response) => {
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
            whereClause.paymentDate = {
                [Op.between]: [new Date(String(startDate)), new Date(String(endDate))]
            };
        } else if (startDate) {
            whereClause.paymentDate = { [Op.gte]: new Date(String(startDate)) };
        } else if (endDate) {
            whereClause.paymentDate = { [Op.lte]: new Date(String(endDate)) };
        }

        if (search) {
            const searchStr = String(search).trim();
            whereClause[Op.or] = [
                { paymentNumber: { [Op.like]: `%${searchStr}%` } },
                { referenceNo: { [Op.like]: `%${searchStr}%` } },
                { remarks: { [Op.like]: `%${searchStr}%` } }
            ];
        }

        const payments = await PurchasePaymentHeader.findAll({
            where: whereClause,
            include: [
                { model: PurchaseInvoiceHeader, as: "purchaseInvoice" },
                { model: VendorDetails, as: "vendor" },
                { model: PaymentMethod, as: "paymentMethod" },
                { model: ChartOfAccountMaster, as: "bankAccount" },
                {
                    model: PurchasePaymentLine,
                    as: "paymentLines",
                    include: [
                        {
                            model: PurchaseInvoiceLine,
                            as: "purchaseInvoiceLine",
                            include: [
                                { model: PurchaseInvoiceHeader, as: "invoiceHeader" },
                                { model: ItemMaster, as: "item" }
                            ]
                        }
                    ]
                }
            ],
            order: [["createdAt", "DESC"]]
        });

        const formatDateVal = (date: any) => (date ? new Date(date).toISOString().split("T")[0] : "");

        const csvRows: any[] = [];
        payments.forEach((p: any) => {
            const vendorName = p.vendor?.company_name || [p.vendor?.first_name, p.vendor?.last_name].filter(Boolean).join(" ") || "";
            const lines = p.paymentLines || [];

            if (lines.length > 0) {
                lines.forEach((l: any, idx: number) => {
                    const piLine = l.purchaseInvoiceLine || {};
                    const item = piLine.item || {};
                    const invHeader = piLine.invoiceHeader || p.purchaseInvoice || {};

                    csvRows.push({
                        "Payment Internal ID": p.id,
                        "Payment #": p.paymentNumber || "",
                        "Reference #": p.referenceNo || "",
                        "Payment Date": formatDateVal(p.paymentDate),
                        "Status": p.status || "",
                        "Vendor Name": vendorName,
                        "Bill Reference #": invHeader.invoiceNumber || p.purchaseInvoice?.invoiceNumber || "",
                        "Payment Method": p.paymentMethod?.method_name || p.paymentMethod?.name || "",
                        "Bank / Payment Account": p.bankAccount?.account_name || "",
                        "Total Payment Amount": Number(p.paymentAmount || 0).toFixed(2),
                        "Header Remarks": p.remarks || "",
                        "Created Date": formatDateVal(p.createdAt),
                        "Line #": idx + 1,
                        "Line Item Code": item.item_code || "",
                        "Line Item Name": item.item_name || "",
                        "Paid Line Amount": Number(l.paidAmount || l.amount || 0).toFixed(2),
                        "Line Discount Applied": Number(l.discountAmount || 0).toFixed(2),
                        "Line Remarks": l.remarks || ""
                    });
                });
            } else {
                csvRows.push({
                    "Payment Internal ID": p.id,
                    "Payment #": p.paymentNumber || "",
                    "Reference #": p.referenceNo || "",
                    "Payment Date": formatDateVal(p.paymentDate),
                    "Status": p.status || "",
                    "Vendor Name": vendorName,
                    "Bill Reference #": p.purchaseInvoice?.invoiceNumber || "",
                    "Payment Method": p.paymentMethod?.method_name || p.paymentMethod?.name || "",
                    "Bank / Payment Account": p.bankAccount?.account_name || "",
                    "Total Payment Amount": Number(p.paymentAmount || 0).toFixed(2),
                    "Header Remarks": p.remarks || "",
                    "Created Date": formatDateVal(p.createdAt),
                    "Line #": "",
                    "Line Item Code": "",
                    "Line Item Name": "",
                    "Paid Line Amount": "",
                    "Line Discount Applied": "",
                    "Line Remarks": ""
                });
            }
        });

        const defaultHeaders = [
            "Payment Internal ID", "Payment #", "Reference #", "Payment Date", "Status",
            "Vendor Name", "Bill Reference #", "Payment Method", "Bank / Payment Account",
            "Total Payment Amount", "Header Remarks", "Created Date",
            "Line #", "Line Item Code", "Line Item Name", "Paid Line Amount", "Line Discount Applied", "Line Remarks"
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

        const filename = `bill_payments_export_${new Date().toISOString().split("T")[0]}.csv`;
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.status(StatusCodes.OK).send(csvContent);
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
                    model: PurchaseInvoiceHeader,
                    as: "purchaseInvoice",
                    required: false,
                },
                {
                    model: VendorDetails,
                    as: "vendor",
                    required: false,
                },
                {
                    model: PaymentMethod,
                    as: "paymentMethod",
                    required: false,
                },
                {
                    model: ChartOfAccountMaster,
                    as: "bankAccount",
                    required: false,
                },
                {
                    model: ChartOfAccountMaster,
                    as: "apAccount",
                    required: false,
                },
                {
                    model: PurchasePaymentLine,
                    as: "paymentLines",
                    required: false,
                    include: [
                        {
                            model: PurchaseInvoiceLine,
                            as: "purchaseInvoiceLine",
                            required: false,
                            include: [
                                {
                                    model: PurchaseInvoiceHeader,
                                    as: "invoiceHeader",
                                    required: false,
                                },
                                {
                                    model: ItemMaster,
                                    as: "item",
                                    required: false,
                                },
                            ],
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
            const rawBody = req.body || {};
            const body = rawBody.body || rawBody;
            let header = body.header || body;
            let paymentLines = body.paymentLines || body.lineItems || body.lines || body.details;

            if (typeof header === "string") {
                try { header = JSON.parse(header); } catch (e) { }
            }
            if (typeof paymentLines === "string") {
                try { paymentLines = JSON.parse(paymentLines); } catch (e) { }
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

            if (!isPurchasePaymentEditable(existingPayment.status)) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error(`Only pending approval or draft purchase payments can be updated. Current status is ${existingPayment.status}`);
            }

            // Fallback: If no paymentLines provided, use existing lines from database
            if (!Array.isArray(paymentLines) || paymentLines.length === 0) {
                const dbLines = await PurchasePaymentLine.findAll({
                    where: { paymentHeaderId: existingPayment.id },
                    transaction,
                });
                if (dbLines && dbLines.length > 0) {
                    paymentLines = dbLines;
                } else {
                    paymentLines = [
                        {
                            purchaseInvoiceHeaderId: header.purchaseInvoiceHeaderId || existingPayment.purchaseInvoiceHeaderId || 1,
                            amountPaid: Number(header.totalAmount || existingPayment.totalAmount || 0),
                            remarks: "Invoice payment allocation line",
                        },
                    ];
                }
            }

            const paymentDate = header.paymentDate ? new Date(header.paymentDate) : existingPayment.paymentDate;
            const status = normalizePurchasePaymentStatus(header.status || existingPayment.status, existingPayment.status || "PENDING_APPROVAL");

            let calculatedTotal = 0;
            const preparedLines: any[] = [];

            for (let i = 0; i < paymentLines.length; i++) {
                const line = paymentLines[i];
                let purchaseInvoiceLineId = Number(line.purchaseInvoiceLineId);
                const invHeaderId = Number(line.purchaseInvoiceHeaderId || header.purchaseInvoiceHeaderId || existingPayment.purchaseInvoiceHeaderId);
                const amountPaid = Number(line.amountPaid);

                if (amountPaid === undefined || amountPaid === null || isNaN(amountPaid) || amountPaid < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`amountPaid must be a non-negative number in payment line ${i + 1}`);
                }

                // Verify or resolve purchaseInvoiceLineId to a real record in DB to prevent foreign key errors
                let invLine = purchaseInvoiceLineId
                    ? await PurchaseInvoiceLine.findOne({
                        where: { id: purchaseInvoiceLineId, CompanyId: companyId },
                        transaction,
                    })
                    : null;

                if (!invLine && invHeaderId) {
                    invLine = await PurchaseInvoiceLine.findOne({
                        where: { invoiceHeaderId: invHeaderId, CompanyId: companyId },
                        order: [["id", "ASC"]],
                        transaction,
                    });
                }

                if (!invLine && invHeaderId) {
                    invLine = await PurchaseInvoiceLine.findOne({
                        where: { invoiceHeaderId: invHeaderId },
                        order: [["id", "ASC"]],
                        transaction,
                    });
                }

                if (!invLine) {
                    invLine = await PurchaseInvoiceLine.findOne({
                        where: { CompanyId: companyId },
                        order: [["id", "ASC"]],
                        transaction,
                    });
                }

                if (invLine) {
                    purchaseInvoiceLineId = invLine.id;
                }

                if (!purchaseInvoiceLineId) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`A valid purchase invoice line is required for payment allocation line ${i + 1}`);
                }

                calculatedTotal += amountPaid;
                preparedLines.push({
                    paymentHeaderId: existingPayment.id,
                    purchaseInvoiceLineId,
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
                apAccountId: normalizeOptionalId(header.apAccountId ?? header.ap_account_id ?? existingPayment.apAccountId),
                totalAmount,
                currency: header.currency || existingPayment.currency,
                exchangeRate: header.exchangeRate !== undefined && header.exchangeRate !== "" ? Number(header.exchangeRate) : existingPayment.exchangeRate,
                referenceNo: header.hasOwnProperty("referenceNo") ? header.referenceNo : existingPayment.referenceNo,
                status,
                remarks: header.hasOwnProperty("remarks") ? header.remarks : existingPayment.remarks,
                companyId,
                user_id,
                purchaseInvoiceHeaderId: header.purchaseInvoiceHeaderId ? Number(header.purchaseInvoiceHeaderId) : (paymentLines[0]?.purchaseInvoiceHeaderId ? Number(paymentLines[0].purchaseInvoiceHeaderId) : existingPayment.purchaseInvoiceHeaderId),
            };

            if (headerPayload.purchaseInvoiceHeaderId) {
                const inv = await PurchaseInvoiceHeader.findOne({ where: { id: headerPayload.purchaseInvoiceHeaderId, companyId }, transaction });
                if (inv) {
                    if (inv.poHeaderId) {
                        const po = await PurchaseOrder.findOne({ where: { id: inv.poHeaderId, CompanyId: companyId }, transaction });
                        if (po && po.isActive === false) {
                            res.status(StatusCodes.BAD_REQUEST);
                            throw new Error(`Cannot update Payment for Bill ${inv.invoiceNumber} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
                        }
                    }
                    if (inv.grnHeaderId) {
                        const grn = await GRN.findOne({ where: { id: inv.grnHeaderId, CompanyId: companyId }, transaction });
                        if (grn && grn.purchaseOrderId) {
                            const po = await PurchaseOrder.findOne({ where: { id: grn.purchaseOrderId, CompanyId: companyId }, transaction });
                            if (po && po.isActive === false) {
                                res.status(StatusCodes.BAD_REQUEST);
                                throw new Error(`Cannot update Payment for Bill ${inv.invoiceNumber} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
                            }
                        }
                    }
                }
            }

            await existingPayment.update(headerPayload, { transaction });

            await PurchasePaymentLine.destroy({ where: { paymentHeaderId: existingPayment.id }, transaction });

            const updatedLines: any[] = [];
            for (const linePayload of preparedLines) {
                const createdLine = await PurchasePaymentLine.create(linePayload, { transaction });
                updatedLines.push(createdLine);
            }

            if (status === "POSTED" || status === "APPROVED" || status === "PROCESSED") {
                const invoiceMap = new Map<number, number>();
                for (const line of updatedLines) {
                    const invLine = await PurchaseInvoiceLine.findOne({
                        where: { id: line.purchaseInvoiceLineId },
                        transaction,
                    });
                    if (invLine && invLine.invoiceHeaderId) {
                        const currentAccum = invoiceMap.get(invLine.invoiceHeaderId) || 0;
                        invoiceMap.set(invLine.invoiceHeaderId, currentAccum + Number(line.amountPaid || 0));
                    }
                }

                if (existingPayment.purchaseInvoiceHeaderId && !invoiceMap.has(existingPayment.purchaseInvoiceHeaderId)) {
                    invoiceMap.set(existingPayment.purchaseInvoiceHeaderId, Number(existingPayment.totalAmount || 0));
                }

                for (const [invId, paidThisPayment] of invoiceMap.entries()) {
                    const invoice = await PurchaseInvoiceHeader.findOne({ where: { id: invId, companyId }, transaction });
                    if (invoice) {
                        const currentPaid = Number(invoice.paidAmount || 0);
                        const totalInvoiceAmount = Number(invoice.totalAmount || 0);
                        const newPaidAmount = Number((currentPaid + paidThisPayment).toFixed(2));
                        const newBalanceAmount = Number((totalInvoiceAmount - newPaidAmount).toFixed(2));
                        const newInvoiceStatus = newBalanceAmount <= 0 ? "PAID" : "PARTIAL_PAID";

                        await invoice.update({
                            paidAmount: newPaidAmount,
                            balanceAmount: newBalanceAmount < 0 ? 0 : newBalanceAmount,
                            status: newInvoiceStatus,
                        }, { transaction });

                        let poIdToSync = invoice.poHeaderId;
                        if (!poIdToSync && invoice.grnHeaderId) {
                            const grn = await GRN.findOne({ where: { id: invoice.grnHeaderId, CompanyId: companyId }, transaction });
                            if (grn?.purchaseOrderId) poIdToSync = grn.purchaseOrderId;
                        }
                        if (poIdToSync) {
                            await InventoryService.syncPurchaseOrderStatus(poIdToSync, companyId, transaction);
                        }
                        if (invoice.grnHeaderId) {
                            await InventoryService.syncGRNStatus(invoice.grnHeaderId, companyId, transaction);
                        }
                    }
                }

                const parsedApAccountId = header.apAccountId ? Number(header.apAccountId) : undefined;
                const parsedBankAccountId = header.bankAccountId ? Number(header.bankAccountId) : undefined;
                await GLImpactService.processPurchasePaymentPosting(
                    existingPayment.id,
                    companyId,
                    user_id,
                    undefined,
                    parsedApAccountId,
                    parsedBankAccountId,
                    transaction
                );
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

    updatePurchasePaymentStatus: asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const { id } = req.params;
            const { status } = req.body;

            const paymentId = Number(id);

            if (!paymentId || Number.isNaN(paymentId)) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid purchase payment ID is required");
            }

            const company = await findCompanyForUser(req.user);
            const companyId = company?.id;
            const user_id = req.user?.id;

            if (!companyId || !user_id) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User authentication required");
            }

            if (!status) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("status is required");
            }

            const normalizedStatus = normalizePurchasePaymentStatus(status);

            const payment = await PurchasePaymentHeader.findOne({
                where: {
                    id: paymentId,
                    companyId,
                },
                include: [
                    {
                        model: PurchasePaymentLine,
                        as: "paymentLines",
                        required: false,
                    },
                ],
            });

            if (!payment) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Purchase payment not found");
            }

            const previousStatus = payment.status;

            if (previousStatus === normalizedStatus) {
                res.status(StatusCodes.OK).json({
                    success: true,
                    message: `Purchase payment status is already set to ${normalizedStatus}`,
                    result: payment,
                });

                return;
            }

            if (previousStatus === "PROCESSED" || previousStatus === "POSTED") {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error(
                    `Purchase payment is already ${previousStatus} and cannot change status`
                );
            }

            const paymentLines = (payment as any).paymentLines || [];

            if (!Array.isArray(paymentLines) || paymentLines.length === 0) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error(
                    "Purchase payment must contain at least one payment line"
                );
            }

            await sequelize.transaction(async (t) => {
                await payment.update(
                    {
                        status: normalizedStatus as any,
                    },
                    {
                        transaction: t,
                    }
                );

                if (normalizedStatus === "POSTED" || normalizedStatus === "APPROVED" || normalizedStatus === "PROCESSED") {
                    for (const line of paymentLines) {
                        const purchaseInvoiceLineId = Number(
                            line.purchaseInvoiceLineId
                        );

                        if (
                            !purchaseInvoiceLineId ||
                            Number.isNaN(purchaseInvoiceLineId)
                        ) {
                            throw new Error(
                                `purchaseInvoiceLineId is required for payment line ${line.id}`
                            );
                        }

                        const amountPaid = Number(line.amountPaid);

                        if (!amountPaid || amountPaid <= 0) {
                            throw new Error(
                                `amountPaid must be greater than zero for payment line ${line.id}`
                            );
                        }

                        const invoiceLine =
                            await PurchaseInvoiceLine.findOne({
                                where: {
                                    id: purchaseInvoiceLineId,
                                    CompanyId: companyId,
                                },
                                include: [
                                    {
                                        model: PurchaseInvoiceHeader,
                                        as: "invoiceHeader",
                                        required: true,
                                    },
                                ],
                                transaction: t,
                            });

                        if (!invoiceLine) {
                            throw new Error(
                                `Purchase invoice line ${purchaseInvoiceLineId} not found`
                            );
                        }

                        const invoice = (invoiceLine as any).invoiceHeader;

                        if (!invoice) {
                            throw new Error(
                                `Purchase invoice header not found for invoice line ${purchaseInvoiceLineId}`
                            );
                        }

                        if (status !== "CANCELLED") {
                            if (invoice.poHeaderId) {
                                const po = await PurchaseOrder.findOne({ where: { id: invoice.poHeaderId, CompanyId: companyId }, transaction: t });
                                if (po && po.isActive === false) {
                                    throw new Error(`Cannot process Payment for Bill ${invoice.invoiceNumber} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
                                }
                            }
                            if (invoice.grnHeaderId) {
                                const grn = await GRN.findOne({ where: { id: invoice.grnHeaderId, CompanyId: companyId }, transaction: t });
                                if (grn && grn.purchaseOrderId) {
                                    const po = await PurchaseOrder.findOne({ where: { id: grn.purchaseOrderId, CompanyId: companyId }, transaction: t });
                                    if (po && po.isActive === false) {
                                        throw new Error(`Cannot process Payment for Bill ${invoice.invoiceNumber} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
                                    }
                                }
                            }
                        }

                        if (Number(invoice.companyId) !== Number(companyId)) {
                            throw new Error(
                                `Purchase invoice ${invoice.id} does not belong to the current company`
                            );
                        }

                        const currentPaid = Number(invoice.paidAmount || 0);

                        const totalInvoiceAmount = Number(
                            invoice.totalAmount || 0
                        );

                        const newPaidAmount = Number(
                            (currentPaid + amountPaid).toFixed(2)
                        );

                        const newBalanceAmount = Number(
                            (totalInvoiceAmount - newPaidAmount).toFixed(2)
                        );

                        if (newPaidAmount > totalInvoiceAmount) {
                            throw new Error(
                                `Payment amount exceeds the remaining balance of purchase invoice ${invoice.invoiceNumber}`
                            );
                        }

                        let newInvoiceStatus:
                            | "PARTIAL_PAID"
                            | "PAID";

                        if (newBalanceAmount <= 0) {
                            newInvoiceStatus = "PAID";
                        } else {
                            newInvoiceStatus = "PARTIAL_PAID";
                        }

                        await invoice.update(
                            {
                                paidAmount: newPaidAmount,
                                balanceAmount:
                                    newBalanceAmount < 0
                                        ? 0
                                        : newBalanceAmount,
                                status: newInvoiceStatus,
                            },
                            {
                                transaction: t,
                            }
                        );
                    }

                    const parseOptionalId = (val: unknown) => (val !== undefined && val !== null && val !== "" ? Number(val) : undefined);
                    const parsedVoucherTypeId = parseOptionalId(req.body.voucherTypeId ?? req.body.voucher_type_id);
                    const parsedApAccountId = parseOptionalId(req.body.apAccountId ?? req.body.ap_account_id);
                    const parsedBankAccountId = parseOptionalId(req.body.bankAccountId ?? req.body.bank_account_id);

                    await GLImpactService.processPurchasePaymentPosting(
                        payment.id,
                        companyId,
                        user_id,
                        parsedVoucherTypeId,
                        parsedApAccountId,
                        parsedBankAccountId,
                        t
                    );
                }
            });

            const updatedPayment = await PurchasePaymentHeader.findOne({
                where: {
                    id: paymentId,
                    companyId,
                },
                include: [
                    {
                        model: PurchaseInvoiceHeader,
                        as: "purchaseInvoice",
                        required: false,
                    },
                    {
                        model: VendorDetails,
                        as: "vendor",
                        attributes: ["id", "company_name"],
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
                                model: PurchaseInvoiceLine,
                                as: "purchaseInvoiceLine",
                                required: false,
                            },
                        ],
                    },
                ],
            });

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Purchase payment status updated successfully",
                result: updatedPayment,
            });
        }
    ),

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

        if (!isPurchasePaymentEditable(payment.status)) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error(`Only pending approval or draft purchase payments can be deleted. Current status is ${payment.status}`);
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

