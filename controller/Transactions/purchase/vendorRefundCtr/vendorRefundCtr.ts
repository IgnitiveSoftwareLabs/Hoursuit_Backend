import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import sequelize from "../../../../dbconfig/dbconfig";
import { CustomRequest } from "../../../../typeRequest/customReq";
import { findCompanyForUser } from "../../../../utils/findCompanyForUser";
import VendorRefundHeader from "../../../../modals/Transactions/purchase/vendorRefund/vendorRefundHeader";
import VendorCreditHeader from "../../../../modals/Transactions/purchase/vendorCredit/vendorCreditHeader";
import VendorCreditBillApply from "../../../../modals/Transactions/purchase/vendorCredit/vendorCreditBillApply";
import { PurchaseOrder } from "../../../../modals/Transactions/purchase/purchaseOrder";
import { GRN } from "../../../../modals/Transactions/purchase/GRN";
import { PurchaseInvoiceHeader } from "../../../../modals/Transactions/purchase/purchaseInvoice";
import { PurchaseReturnHeader } from "../../../../modals/Transactions/purchase/purchaseReturn";
import VendorDetails from "../../../../modals/masters/vendorDetails/vendorDetails";
import ChartOfAccountMaster from "../../../../modals/masters/chartOfAccount/chartOfAccount";
import { GLImpactService } from "../../../../utils/glImpactService";
import { generateSequentialDocNumber } from "../../../../utils/documentNumberHelper";
import { normalizeVendorRefundStatus, isVendorRefundEditable } from "../../../../utils/p2pStatus";

export const VendorRefundController = {
    createVendorRefund: asyncHandler(async (req: CustomRequest, res: Response) => {
        const transaction = await sequelize.transaction();
        try {
            const company = await findCompanyForUser(req.user);
            const companyId = company?.id;
            const user_id = req.user?.id;

            if (!companyId || !user_id) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User authentication required");
            }

            const {
                vendorCreditId,
                vendorId,
                bankAccountId,
                refundAmount,
                refundDate,
                currency = "INR",
                paymentMode = "Bank Transfer",
                referenceNumber,
                remarks,
            } = req.body;

            if (!vendorCreditId) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("vendorCreditId is required");
            }

            const amountToRefund = Number(Number(refundAmount || 0).toFixed(2));
            if (amountToRefund <= 0) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("refundAmount must be greater than zero");
            }

            const vendorCredit = await VendorCreditHeader.findOne({
                where: { id: Number(vendorCreditId), companyId },
                transaction,
            });

            if (!vendorCredit) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error(`Vendor Credit #${vendorCreditId} not found`);
            }

            if (vendorCredit.purchaseReturnHeaderId) {
                const ret = await PurchaseReturnHeader.findOne({ where: { id: vendorCredit.purchaseReturnHeaderId, companyId }, transaction });
                if (ret) {
                    if (ret.purchaseOrderHeaderId) {
                        const po = await PurchaseOrder.findOne({ where: { id: ret.purchaseOrderHeaderId, CompanyId: companyId }, transaction });
                        if (po && po.isActive === false) {
                            res.status(StatusCodes.BAD_REQUEST);
                            throw new Error(`Cannot create Vendor Refund for Vendor Credit #${vendorCredit.creditNoteNumber || vendorCredit.id} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
                        }
                    }
                    if (ret.grnHeaderId) {
                        const grn = await GRN.findOne({ where: { id: ret.grnHeaderId, CompanyId: companyId }, transaction });
                        if (grn && grn.purchaseOrderId) {
                            const po = await PurchaseOrder.findOne({ where: { id: grn.purchaseOrderId, CompanyId: companyId }, transaction });
                            if (po && po.isActive === false) {
                                res.status(StatusCodes.BAD_REQUEST);
                                throw new Error(`Cannot create Vendor Refund for Vendor Credit #${vendorCredit.creditNoteNumber || vendorCredit.id} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
                            }
                        }
                    }
                }
            }
            if (vendorCredit.purchaseInvoiceHeaderId) {
                const inv = await PurchaseInvoiceHeader.findOne({ where: { id: vendorCredit.purchaseInvoiceHeaderId, companyId }, transaction });
                if (inv) {
                    if (inv.poHeaderId) {
                        const po = await PurchaseOrder.findOne({ where: { id: inv.poHeaderId, CompanyId: companyId }, transaction });
                        if (po && po.isActive === false) {
                            res.status(StatusCodes.BAD_REQUEST);
                            throw new Error(`Cannot create Vendor Refund for Vendor Credit #${vendorCredit.creditNoteNumber || vendorCredit.id} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
                        }
                    }
                    if (inv.grnHeaderId) {
                        const grn = await GRN.findOne({ where: { id: inv.grnHeaderId, CompanyId: companyId }, transaction });
                        if (grn && grn.purchaseOrderId) {
                            const po = await PurchaseOrder.findOne({ where: { id: grn.purchaseOrderId, CompanyId: companyId }, transaction });
                            if (po && po.isActive === false) {
                                res.status(StatusCodes.BAD_REQUEST);
                                throw new Error(`Cannot create Vendor Refund for Vendor Credit #${vendorCredit.creditNoteNumber || vendorCredit.id} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
                            }
                        }
                    }
                }
            }

            const totalCreditAmount = Number(vendorCredit.totalAmount || 0);

            // Calculate already applied and refunded amounts
            const existingApplies = await VendorCreditBillApply.findAll({
                where: { vendorCreditId: vendorCredit.id, companyId },
                transaction,
            });
            const alreadyApplied = existingApplies.reduce((sum, a) => sum + Number(a.appliedAmount || 0), 0);

            const existingRefunds = await VendorRefundHeader.findAll({
                where: { vendorCreditId: vendorCredit.id, companyId, status: { [Op.ne]: "CANCELLED" } },
                transaction,
            });
            const alreadyRefunded = existingRefunds.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);

            const availableCredit = Number((totalCreditAmount - (alreadyApplied + alreadyRefunded)).toFixed(2));

            if (amountToRefund > availableCredit) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error(
                    `Cannot refund ₹${amountToRefund.toFixed(2)}. Available unapplied credit balance is only ₹${availableCredit.toFixed(2)} (Total Credit: ₹${totalCreditAmount.toFixed(2)}, Already Applied: ₹${alreadyApplied.toFixed(2)}, Refunded: ₹${alreadyRefunded.toFixed(2)}).`
                );
            }

            let refundNumber = String(req.body.refundNumber || "").trim();
            if (!refundNumber || refundNumber.startsWith("VR-NEW") || refundNumber === "To Be Generated" || refundNumber.startsWith("VR-17")) {
                refundNumber = await generateSequentialDocNumber(
                    VendorRefundHeader,
                    "refundNumber",
                    "VR",
                    "companyId",
                    companyId,
                    transaction
                );
            } else {
                const exists = await VendorRefundHeader.findOne({
                    where: { refundNumber, companyId },
                    transaction
                });
                if (exists) {
                    refundNumber = await generateSequentialDocNumber(
                        VendorRefundHeader,
                        "refundNumber",
                        "VR",
                        "companyId",
                        companyId,
                        transaction
                    );
                }
            }

            const status = normalizeVendorRefundStatus(req.body.status, "PROCESSED");

            const vendorRefund = await VendorRefundHeader.create({
                companyId,
                refundNumber,
                vendorCreditId: vendorCredit.id,
                vendorId: vendorId ? Number(vendorId) : vendorCredit.vendorId,
                bankAccountId: bankAccountId ? Number(bankAccountId) : null,
                refundDate: refundDate ? new Date(refundDate) : new Date(),
                refundAmount: amountToRefund,
                currency,
                paymentMode,
                referenceNumber: referenceNumber || null,
                remarks: remarks || null,
                status,
                user_id,
            }, { transaction });

            // Update Vendor Credit refunded amount and status
            const newTotalRefunded = Number((alreadyRefunded + amountToRefund).toFixed(2));
            const totalApplied = Number(vendorCredit.appliedAmount || 0);
            const totalCredit = Number(vendorCredit.totalAmount || 0);
            const newCreditStatus = (totalApplied + newTotalRefunded) >= (totalCredit - 0.01) ? "FULLY_APPLIED" : "PARTIALLY_APPLIED";

            await vendorCredit.update({
                refundedAmount: newTotalRefunded,
                status: newCreditStatus,
            }, { transaction });

            // Post GL Impact for Vendor Refund (DR Bank Account, CR Accounts Payable)
            await GLImpactService.processVendorRefundPosting(
                vendorRefund.id,
                companyId,
                user_id,
                undefined,
                bankAccountId ? Number(bankAccountId) : undefined,
                undefined,
                transaction
            );

            await transaction.commit();

            res.status(StatusCodes.CREATED).json({
                success: true,
                message: "Vendor refund processed and posted to GL successfully",
                result: {
                    vendorRefund,
                    availableRemainingCredit: Number((availableCredit - amountToRefund).toFixed(2)),
                },
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }),

        getAllVendorRefunds: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;

        if (!companyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const {
            page = 1,
            limit = 10,
            search,
            status,
            vendorId,
            vendorCreditId,
            startDate,
            endDate,
            sortBy = "id",
            sortOrder = "DESC",
            option,
        } = req.query;

        const whereClause: any = { companyId };
        if (vendorId) whereClause.vendorId = Number(vendorId);
        if (vendorCreditId) whereClause.vendorCreditId = Number(vendorCreditId);
        if (status && status !== "ALL") whereClause.status = status;

        if (startDate && endDate) {
            const start = new Date(startDate as string);
            const end = new Date(endDate as string);
            end.setHours(23, 59, 59, 999);
            whereClause.refundDate = { [Op.between]: [start, end] };
        } else if (startDate) {
            whereClause.refundDate = { [Op.gte]: new Date(startDate as string) };
        } else if (endDate) {
            const end = new Date(endDate as string);
            end.setHours(23, 59, 59, 999);
            whereClause.refundDate = { [Op.lte]: end };
        }

        if (search) {
            const term = "%" + String(search) + "%";
            whereClause[Op.or] = [
                { refundNumber: { [Op.iLike]: term } },
                { referenceNumber: { [Op.iLike]: term } },
                { remarks: { [Op.iLike]: term } },
                { "$vendor.company_name$": { [Op.iLike]: term } },
                { "$vendorCredit.creditNoteNumber$": { [Op.iLike]: term } },
            ];
        }

        const includes = [
            {
                model: VendorDetails,
                as: "vendor",
                attributes: ["id", "company_name", "entity_id", "email", "phone"],
            },
            {
                model: VendorCreditHeader,
                as: "vendorCredit",
                attributes: ["id", "creditNoteNumber", "totalAmount", "appliedAmount", "refundedAmount"],
            },
            {
                model: ChartOfAccountMaster,
                as: "bankAccount",
                attributes: ["id", "account_number", "account_name"],
            },
        ];

        const isOption = String(option) === "true" || (option as any) === true;
        let validSortBy = String(sortBy || "id");
        if (validSortBy === "vendor_name") validSortBy = "vendorId";
        const validSortOrder = String(sortOrder || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

        if (isOption) {
            const refunds = await VendorRefundHeader.findAll({
                where: whereClause,
                include: includes,
                order: [[validSortBy, validSortOrder]],
            });

            const formattedRows = refunds.map((r: any) => {
                const row = r.toJSON();
                const vendorName = row.vendor?.company_name || "";
                if (row.vendor) row.vendor.vendor_name = vendorName;
                row.vendor_name = vendorName;
                return row;
            });

            res.status(StatusCodes.OK).json({
                success: true,
                result: formattedRows,
                total: formattedRows.length,
            });
            return;
        }

        const take = Math.max(1, Number(limit) || 10);
        const pageNum = Math.max(1, Number(page) || 1);
        const skip = (pageNum - 1) * take;

        const refunds = await VendorRefundHeader.findAndCountAll({
            where: whereClause,
            include: includes,
            order: [[validSortBy, validSortOrder]],
            limit: take,
            offset: skip,
            distinct: true,
        });

        const formattedRows = refunds.rows.map((r: any) => {
            const row = r.toJSON();
            const vendorName = row.vendor?.company_name || "";
            if (row.vendor) row.vendor.vendor_name = vendorName;
            row.vendor_name = vendorName;
            return row;
        });

        res.status(StatusCodes.OK).json({
            success: true,
            result: formattedRows,
            total: refunds.count,
            page: pageNum,
            totalPages: Math.ceil(refunds.count / take),
        });
    }),

    exportVendorRefundsCSV: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;

        if (!companyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const { search, status, vendorId, vendorCreditId, startDate, endDate } = req.query;

        const whereClause: any = { companyId };
        if (vendorId) whereClause.vendorId = Number(vendorId);
        if (vendorCreditId) whereClause.vendorCreditId = Number(vendorCreditId);
        if (status && status !== "ALL") whereClause.status = status;

        if (startDate && endDate) {
            const start = new Date(startDate as string);
            const end = new Date(endDate as string);
            end.setHours(23, 59, 59, 999);
            whereClause.refundDate = { [Op.between]: [start, end] };
        } else if (startDate) {
            whereClause.refundDate = { [Op.gte]: new Date(startDate as string) };
        } else if (endDate) {
            const end = new Date(endDate as string);
            end.setHours(23, 59, 59, 999);
            whereClause.refundDate = { [Op.lte]: end };
        }

        if (search) {
            const term = "%" + String(search) + "%";
            whereClause[Op.or] = [
                { refundNumber: { [Op.iLike]: term } },
                { referenceNumber: { [Op.iLike]: term } },
                { remarks: { [Op.iLike]: term } },
                { "$vendor.company_name$": { [Op.iLike]: term } },
                { "$vendorCredit.creditNoteNumber$": { [Op.iLike]: term } },
            ];
        }

        const refunds = await VendorRefundHeader.findAll({
            where: whereClause,
            include: [
                {
                    model: VendorDetails,
                    as: "vendor",
                    attributes: ["id", "company_name", "entity_id", "email", "phone"],
                },
                {
                    model: VendorCreditHeader,
                    as: "vendorCredit",
                    attributes: ["id", "creditNoteNumber", "totalAmount", "appliedAmount", "refundedAmount"],
                },
                {
                    model: ChartOfAccountMaster,
                    as: "bankAccount",
                    attributes: ["id", "account_number", "account_name"],
                },
            ],
            order: [["id", "DESC"]],
        });

        const escapeCSV = (val: any) => {
            if (val === null || val === undefined) return '""';
            const str = String(val);
            return '"' + str.replace(/"/g, '""') + '"';
        };

        const headers = [
            "Refund Number",
            "Status",
            "Refund Date",
            "Vendor ID",
            "Vendor Name",
            "Vendor Credit Number",
            "Bank Account Name",
            "Bank Account Number",
            "Refund Amount",
            "Currency",
            "Payment Mode",
            "Reference Number",
            "Remarks",
            "Created At",
        ];

        const rows: string[] = [headers.join(",")];

        for (const r of refunds) {
            const refund = r.toJSON() as any;
            const row = [
                escapeCSV(refund.refundNumber),
                escapeCSV(refund.status),
                escapeCSV(refund.refundDate ? new Date(refund.refundDate).toISOString().split("T")[0] : ""),
                escapeCSV(refund.vendor?.entity_id || refund.vendorId),
                escapeCSV(refund.vendor?.company_name || ""),
                escapeCSV(refund.vendorCredit?.creditNoteNumber || refund.vendorCreditId),
                escapeCSV(refund.bankAccount?.account_name || ""),
                escapeCSV(refund.bankAccount?.account_number || ""),
                escapeCSV(refund.refundAmount),
                escapeCSV(refund.currency || "INR"),
                escapeCSV(refund.paymentMode || ""),
                escapeCSV(refund.referenceNumber || ""),
                escapeCSV(refund.remarks || ""),
                escapeCSV(refund.createdAt ? new Date(refund.createdAt).toISOString().split("T")[0] : ""),
            ];
            rows.push(row.join(","));
        }

        const csvContent = rows.join("\r\n");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="Vendor_Refunds_' + Date.now() + '.csv"');
        res.status(StatusCodes.OK).send(csvContent);
    }),

    getVendorRefundById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const { id } = req.params;

        if (!companyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const refund = await VendorRefundHeader.findOne({
            where: { id: Number(id), companyId },
            include: [
                {
                    model: VendorDetails,
                    as: "vendor",
                    attributes: ["id", "company_name", "entity_id", "email", "phone"],
                },
                {
                    model: VendorCreditHeader,
                    as: "vendorCredit",
                },
                {
                    model: ChartOfAccountMaster,
                    as: "bankAccount",
                },
            ],
        });

        if (!refund) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error(`Vendor Refund #${id} not found`);
        }

        const refundJson = refund.toJSON() as any;
        const vendorName = refundJson.vendor?.company_name || "";
        if (refundJson.vendor) {
            refundJson.vendor.vendor_name = vendorName;
        }
        refundJson.vendor_name = vendorName;

        res.status(StatusCodes.OK).json({
            success: true,
            result: refundJson,
        });
    }),

    updateVendorRefund: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const { id } = req.params;

        if (!companyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const refund = await VendorRefundHeader.findOne({
            where: { id: Number(id), companyId },
        });

        if (!refund) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error(`Vendor Refund #${id} not found`);
        }

        if (!isVendorRefundEditable(refund.status)) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error(`Cannot edit Vendor Refund with status "${refund.status}". Only pending approval or draft records can be modified.`);
        }

        const { remarks, referenceNumber } = req.body;
        if (remarks !== undefined) refund.remarks = remarks;
        if (referenceNumber !== undefined) refund.referenceNumber = referenceNumber;

        await refund.save();

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Vendor Refund updated successfully",
            result: refund,
        });
    }),

    deleteVendorRefund: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const { id } = req.params;

        if (!companyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const refund = await VendorRefundHeader.findOne({
            where: { id: Number(id), companyId },
        });

        if (!refund) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error(`Vendor Refund #${id} not found`);
        }

        if (!isVendorRefundEditable(refund.status)) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error(`Cannot delete Vendor Refund with status "${refund.status}". Only pending approval or draft records can be deleted.`);
        }

        await refund.destroy();

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Vendor Refund deleted successfully",
        });
    }),
};

export default VendorRefundController;

