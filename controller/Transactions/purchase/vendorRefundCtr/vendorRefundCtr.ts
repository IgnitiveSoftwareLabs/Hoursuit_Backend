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
import VendorDetails from "../../../../modals/masters/vendorDetails/vendorDetails";
import ChartOfAccountMaster from "../../../../modals/masters/chartOfAccount/chartOfAccount";
import { GLImpactService } from "../../../../utils/glImpactService";

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

            const refundNumber = `VR-${Date.now()}`;

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
                status: "POSTED",
                user_id,
            }, { transaction });

            // Update Vendor Credit refunded amount
            const newTotalRefunded = Number((alreadyRefunded + amountToRefund).toFixed(2));
            await vendorCredit.update({
                refundedAmount: newTotalRefunded,
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

        const { page = 1, limit = 20, vendorId, vendorCreditId } = req.query;

        const whereClause: any = { companyId };
        if (vendorId) whereClause.vendorId = Number(vendorId);
        if (vendorCreditId) whereClause.vendorCreditId = Number(vendorCreditId);

        const refunds = await VendorRefundHeader.findAndCountAll({
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
            limit: Number(limit),
            offset: (Number(page) - 1) * Number(limit),
        });

        const formattedRows = refunds.rows.map((r: any) => {
            const row = r.toJSON();
            const vendorName = row.vendor?.company_name || "";
            if (row.vendor) {
                row.vendor.vendor_name = vendorName;
            }
            row.vendor_name = vendorName;
            return row;
        });

        res.status(StatusCodes.OK).json({
            success: true,
            result: formattedRows,
            count: refunds.count,
        });
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

        if (String(refund.status).toUpperCase() !== "DRAFT") {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error(`Cannot edit Vendor Refund with status "${refund.status}". Only DRAFT records can be modified.`);
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

        if (String(refund.status).toUpperCase() !== "DRAFT") {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error(`Cannot delete Vendor Refund with status "${refund.status}". Only DRAFT records can be deleted.`);
        }

        await refund.destroy();

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Vendor Refund deleted successfully",
        });
    }),
};

export default VendorRefundController;

