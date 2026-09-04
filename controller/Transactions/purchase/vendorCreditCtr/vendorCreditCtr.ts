import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import sequelize from "../../../../dbconfig/dbconfig";
import { CustomRequest } from "../../../../typeRequest/customReq";
import { findCompanyForUser } from "../../../../utils/findCompanyForUser";
import VendorCreditHeader from "../../../../modals/Transactions/purchase/vendorCredit/vendorCreditHeader";
import VendorCreditBillApply from "../../../../modals/Transactions/purchase/vendorCredit/vendorCreditBillApply";
import VendorRefundHeader from "../../../../modals/Transactions/purchase/vendorRefund/vendorRefundHeader";
import { PurchaseInvoiceHeader } from "../../../../modals/Transactions/purchase/purchaseInvoice";
import VendorCreditLine from "../../../../modals/Transactions/purchase/vendorCredit/vendorCreditLine";
import { PurchaseReturnHeader, PurchaseReturnLine } from "../../../../modals/Transactions/purchase/purchaseReturn";
import PurchaseReturnFulfillmentLine from "../../../../modals/Transactions/purchase/purchaseReturn/purchaseReturnFulfillmentLine";
import PurchaseReturnFulfillmentHeader from "../../../../modals/Transactions/purchase/purchaseReturn/purchaseReturnFulfillmentHeader";
import ItemMaster from "../../../../modals/masters/items/itemMaster";
import VendorDetails from "../../../../modals/masters/vendorDetails/vendorDetails";
import { GLImpactService } from "../../../../utils/glImpactService";

export const VendorCreditController = {
    createVendorCredit: asyncHandler(async (req: CustomRequest, res: Response) => {
        const transaction = await sequelize.transaction();
        try {
            let header = req.body.header;
            let lineItems = req.body.lineItems;

            if (typeof header === "string") header = JSON.parse(header);
            if (typeof lineItems === "string") lineItems = JSON.parse(lineItems);

            if (!header || !Array.isArray(lineItems) || lineItems.length === 0) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Header and at least one line item are required for vendor credit");
            }

            const company = await findCompanyForUser(req.user);
            const companyId = company?.id;
            const user_id = req.user?.id;

            if (!companyId || !user_id) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User authentication required");
            }

            const vendorId = Number(header.vendorId);
            if (!vendorId) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("vendorId is required");
            }

            const creditNoteNumber = String(header.creditNoteNumber || `VC-${Date.now()}`).trim();
            const creditDate = header.creditDate ? new Date(header.creditDate) : new Date();

            let totalSubtotal = 0;
            let totalDiscount = 0;
            let totalTax = 0;
            let totalHeaderAmount = 0;
            const preparedLines: any[] = [];

            for (let index = 0; index < lineItems.length; index++) {
                const line = lineItems[index];
                const creditQty = Number(line.creditQty);
                const unitPrice = Number(line.unitPrice);

                if (!line.itemId) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`itemId is required in line ${index + 1}`);
                }
                if (!creditQty || creditQty <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`creditQty must be greater than zero in line ${index + 1}`);
                }
                if (unitPrice < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`unitPrice cannot be negative in line ${index + 1}`);
                }

                const purchaseReturnLineId = line.purchaseReturnLineId ? Number(line.purchaseReturnLineId) : null;

                if (purchaseReturnLineId) {
                    // Validate credit quantity against physically fulfilled quantity
                    const fulfillmentLines = await PurchaseReturnFulfillmentLine.findAll({
                        where: { purchaseReturnLineId },
                        include: [{
                            model: PurchaseReturnFulfillmentHeader,
                            as: "fulfillmentHeader",
                            where: { status: { [Op.ne]: "CANCELLED" } }
                        }],
                        transaction
                    });

                    const totalFulfilledQty = fulfillmentLines.reduce((sum, f) => sum + Number(f.fulfilledQty || 0), 0);

                    const existingCredits = await VendorCreditLine.findAll({
                        where: { purchaseReturnLineId },
                        include: [{
                            model: VendorCreditHeader,
                            as: "creditHeader",
                            where: { status: { [Op.ne]: "CANCELLED" } }
                        }],
                        transaction
                    });

                    const previouslyCreditedQty = existingCredits.reduce((sum, c) => sum + Number(c.creditQty || 0), 0);
                    const remainingCreditableQty = totalFulfilledQty - previouslyCreditedQty;

                    if (creditQty > remainingCreditableQty) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(
                            `Cannot credit ${creditQty} units for item. Max creditable quantity based on physical return fulfillment is ${remainingCreditableQty} (Fulfilled: ${totalFulfilledQty}, Previously Credited: ${previouslyCreditedQty}).`
                        );
                    }
                }

                const grossLineAmount = Number((creditQty * unitPrice).toFixed(2));
                const discountPercent = line.discountPercent !== undefined && line.discountPercent !== null ? Number(line.discountPercent) : 0;
                let discountAmount = line.discountAmount !== undefined && line.discountAmount !== null ? Number(line.discountAmount) : 0;
                if (discountPercent > 0 && discountAmount === 0) {
                    discountAmount = Number(((grossLineAmount * discountPercent) / 100).toFixed(2));
                }

                const taxableLineAmount = Math.max(0, Number((grossLineAmount - discountAmount).toFixed(2)));
                const taxPercent = line.taxPercent !== undefined && line.taxPercent !== null ? Number(line.taxPercent) : 0;
                let taxAmount = line.taxAmount !== undefined && line.taxAmount !== null ? Number(line.taxAmount) : 0;
                if (taxPercent > 0 && taxAmount === 0) {
                    taxAmount = Number(((taxableLineAmount * taxPercent) / 100).toFixed(2));
                }

                const lineTotal = line.totalAmount !== undefined && line.totalAmount !== null && Number(line.totalAmount) > 0
                    ? Number(Number(line.totalAmount).toFixed(2))
                    : Number((taxableLineAmount + taxAmount).toFixed(2));

                totalSubtotal += grossLineAmount;
                totalDiscount += discountAmount;
                totalTax += taxAmount;
                totalHeaderAmount += lineTotal;

                preparedLines.push({
                    purchaseReturnLineId,
                    itemId: Number(line.itemId),
                    creditQty,
                    unitPrice,
                    discountPercent,
                    discountAmount,
                    taxPercent,
                    taxAmount,
                    totalAmount: lineTotal,
                    remarks: line.remarks || null
                });
            }

            const finalSubtotal = totalSubtotal > 0 ? totalSubtotal : Number(header.subtotal || 0);
            const finalDiscount = totalDiscount > 0 ? totalDiscount : Number(header.discountAmount || header.discount_amount || 0);
            const finalTax = totalTax > 0 ? totalTax : Number(header.taxAmount || header.tax_amount || 0);
            const finalTotal = totalHeaderAmount > 0 ? totalHeaderAmount : Number(header.totalAmount || header.total_amount || header.amount || (finalSubtotal - finalDiscount + finalTax) || 0);

            const vendorCreditHeader = await VendorCreditHeader.create({
                companyId,
                creditNoteNumber,
                vendorId,
                purchaseReturnHeaderId: header.purchaseReturnHeaderId ? Number(header.purchaseReturnHeaderId) : null,
                fulfillmentHeaderId: header.fulfillmentHeaderId ? Number(header.fulfillmentHeaderId) : null,
                purchaseInvoiceHeaderId: header.purchaseInvoiceHeaderId ? Number(header.purchaseInvoiceHeaderId) : null,
                creditDate,
                subtotal: Number(finalSubtotal.toFixed(2)),
                discountAmount: Number(finalDiscount.toFixed(2)),
                taxAmount: Number(finalTax.toFixed(2)),
                totalAmount: Number(finalTotal.toFixed(2)),
                status: "POSTED",
                remarks: header.remarks || null,
                user_id
            }, { transaction });

            const createdLines: any[] = [];
            for (const linePayload of preparedLines) {
                const line = await VendorCreditLine.create({
                    ...linePayload,
                    creditHeaderId: vendorCreditHeader.id
                }, { transaction });
                createdLines.push(line);
            }

            // Post Vendor Credit GL Entry (DR Accounts Payable, CR Purchase Return Clearing)
            await GLImpactService.processVendorCreditPosting(
                vendorCreditHeader.id,
                companyId,
                user_id,
                undefined,
                undefined,
                undefined,
                transaction
            );

            // Update parent PurchaseReturnHeader status to RETURNED if fully credited
            if (vendorCreditHeader.purchaseReturnHeaderId) {
                const parentReturn = await PurchaseReturnHeader.findOne({
                    where: { id: vendorCreditHeader.purchaseReturnHeaderId, companyId },
                    transaction
                });
                if (parentReturn) {
                    const allParentLines = await PurchaseReturnLine.findAll({
                        where: { returnHeaderId: parentReturn.id },
                        transaction
                    });
                    let totalAuthorized = 0;
                    let totalCredited = 0;

                    for (const pLine of allParentLines) {
                        totalAuthorized += Number(pLine.returnQty || 0);
                        const cLinesForPLine = await VendorCreditLine.findAll({
                            where: { purchaseReturnLineId: pLine.id },
                            include: [{
                                model: VendorCreditHeader,
                                as: "creditHeader",
                                where: { status: { [Op.ne]: "CANCELLED" } }
                            }],
                            transaction
                        });
                        totalCredited += cLinesForPLine.reduce((s, c) => s + Number(c.creditQty || 0), 0);
                    }

                    if (totalCredited >= totalAuthorized && totalAuthorized > 0) {
                        await parentReturn.update({ status: "RETURNED" }, { transaction });
                    }
                }
            }

            await transaction.commit();

            res.status(StatusCodes.CREATED).json({
                success: true,
                message: "Vendor credit created and posted to GL successfully",
                result: {
                    header: vendorCreditHeader,
                    lineItems: createdLines
                }
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }),

    getAllVendorCredits: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;

        if (!companyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const { page = 1, limit = 10, vendorId, returnHeaderId } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const whereClause: any = { companyId };

        if (vendorId) whereClause.vendorId = Number(vendorId);
        if (returnHeaderId) whereClause.purchaseReturnHeaderId = Number(returnHeaderId);

        const total = await VendorCreditHeader.count({ where: whereClause });
        const credits = await VendorCreditHeader.findAll({
            where: whereClause,
            include: [
                { model: VendorDetails, as: "vendor", attributes: ["id", "company_name"] },
                { model: PurchaseReturnHeader, as: "purchaseReturnHeader", attributes: ["id", "returnNumber"] },
                {
                    model: VendorCreditLine,
                    as: "creditLines",
                    include: [{ model: ItemMaster, as: "item", attributes: ["id", "item_code", "item_name"] }]
                }
            ],
            offset,
            limit: Number(limit),
            order: [["createdAt", "DESC"]]
        });

        const formattedCredits = credits.map((c: any) => {
            const row = c.toJSON();
            const vendorName = row.vendor?.company_name || "";
            if (row.vendor) {
                row.vendor.vendor_name = vendorName;
            }
            row.vendor_name = vendorName;
            return row;
        });

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Vendor credits fetched successfully",
            result: formattedCredits,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        });
    }),

    getVendorCreditById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;

        if (!companyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const credit = await VendorCreditHeader.findOne({
            where: { id: Number(id), companyId },
            include: [
                { model: VendorDetails, as: "vendor", attributes: ["id", "company_name"] },
                { model: PurchaseReturnHeader, as: "purchaseReturnHeader" },
                {
                    model: VendorCreditLine,
                    as: "creditLines",
                    include: [{ model: ItemMaster, as: "item" }]
                }
            ]
        });

        if (!credit) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Vendor credit not found");
        }

        const creditJson = credit.toJSON() as any;
        const vendorName = creditJson.vendor?.company_name || "";
        if (creditJson.vendor) {
            creditJson.vendor.vendor_name = vendorName;
        }
        creditJson.vendor_name = vendorName;

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Vendor credit fetched successfully",
            result: creditJson
        });
    }),

    getOpenBillsForVendor: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const { vendorId } = req.params;

        if (!companyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        if (!vendorId || isNaN(Number(vendorId))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid vendorId is required");
        }

        const openBills = await PurchaseInvoiceHeader.findAll({
            where: {
                companyId,
                vendorId: Number(vendorId),
                status: { [Op.notIn]: ["DRAFT", "CANCELLED", "PAID"] },
            },
            order: [["invoiceDate", "ASC"], ["id", "ASC"]],
        });

        const activeOpenBills = openBills.filter((b: any) => {
            const total = Number(b.totalAmount || 0);
            const paid = Number(b.paidAmount || 0);
            const bal = b.balanceAmount !== null && b.balanceAmount !== undefined ? Number(b.balanceAmount) : (total - paid);
            return bal > 0.01;
        }).map((b: any) => {
            const total = Number(b.totalAmount || 0);
            const paid = Number(b.paidAmount || 0);
            const bal = b.balanceAmount !== null && b.balanceAmount !== undefined ? Number(b.balanceAmount) : (total - paid);
            return {
                ...b.toJSON(),
                dueAmount: Number(bal.toFixed(2)),
            };
        });

        res.status(StatusCodes.OK).json({
            success: true,
            result: activeOpenBills,
        });
    }),

    applyVendorCreditToBills: asyncHandler(async (req: CustomRequest, res: Response) => {
        const transaction = await sequelize.transaction();
        try {
            const company = await findCompanyForUser(req.user);
            const companyId = company?.id;
            const user_id = req.user?.id;

            if (!companyId || !user_id) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User authentication required");
            }

            const { vendorCreditId, billApplications, applyDate, remarks } = req.body;

            if (!vendorCreditId || !Array.isArray(billApplications) || billApplications.length === 0) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("vendorCreditId and an array of billApplications are required");
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

            const totalApplyingNow = Number(
                billApplications.reduce((sum: number, b: any) => sum + Number(b.amountToApply || 0), 0).toFixed(2)
            );

            if (totalApplyingNow <= 0) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Total amount to apply must be greater than zero");
            }

            if (totalApplyingNow > availableCredit) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error(
                    `Cannot apply ₹${totalApplyingNow.toFixed(2)}. Available unapplied credit balance is only ₹${availableCredit.toFixed(2)} (Total Credit: ₹${totalCreditAmount.toFixed(2)}, Already Applied: ₹${alreadyApplied.toFixed(2)}, Refunded: ₹${alreadyRefunded.toFixed(2)}).`
                );
            }

            const createdApplies: any[] = [];

            for (const app of billApplications) {
                const billId = Number(app.purchaseInvoiceId);
                const amount = Number(Number(app.amountToApply || 0).toFixed(2));

                if (!billId || amount <= 0) continue;

                const bill = await PurchaseInvoiceHeader.findOne({
                    where: { id: billId, companyId },
                    transaction,
                });

                if (!bill) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`Purchase Bill #${billId} not found`);
                }

                const currentTotal = Number(bill.totalAmount || 0);
                const currentPaid = Number(bill.paidAmount || 0);
                const currentBal = bill.balanceAmount !== null && bill.balanceAmount !== undefined
                    ? Number(bill.balanceAmount)
                    : (currentTotal - currentPaid);

                if (amount > Number((currentBal + 0.01).toFixed(2))) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(
                        `Cannot apply ₹${amount.toFixed(2)} to Bill #${bill.invoiceNumber}. Outstanding due amount is only ₹${currentBal.toFixed(2)}.`
                    );
                }

                const newPaid = Number((currentPaid + amount).toFixed(2));
                const newBal = Math.max(0, Number((currentTotal - newPaid).toFixed(2)));
                const newStatus = newBal <= 0.01 ? "PAID" : "PARTIAL_PAID";

                await bill.update({
                    paidAmount: newPaid,
                    balanceAmount: newBal,
                    status: newStatus,
                }, { transaction });

                const billApply = await VendorCreditBillApply.create({
                    companyId,
                    vendorCreditId: vendorCredit.id,
                    purchaseInvoiceId: bill.id,
                    appliedAmount: amount,
                    applyDate: applyDate ? new Date(applyDate) : new Date(),
                    remarks: remarks || app.remarks || null,
                    user_id,
                }, { transaction });

                createdApplies.push(billApply);
            }

            const newTotalApplied = Number((alreadyApplied + totalApplyingNow).toFixed(2));
            await vendorCredit.update({
                appliedAmount: newTotalApplied,
            }, { transaction });

            await transaction.commit();

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Vendor credit applied to bills successfully",
                result: {
                    vendorCreditId: vendorCredit.id,
                    totalApplied: newTotalApplied,
                    availableCredit: Number((availableCredit - totalApplyingNow).toFixed(2)),
                    createdApplies,
                },
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }),

    getVendorCreditApplications: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const { id } = req.params;

        if (!companyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const billApplies = await VendorCreditBillApply.findAll({
            where: { vendorCreditId: Number(id), companyId },
            include: [{
                model: PurchaseInvoiceHeader,
                as: "purchaseInvoice",
                attributes: ["id", "invoiceNumber", "invoiceDate", "totalAmount", "paidAmount", "balanceAmount", "status"],
            }],
            order: [["id", "DESC"]],
        });

        const refunds = await VendorRefundHeader.findAll({
            where: { vendorCreditId: Number(id), companyId },
            include: [{
                association: "bankAccount",
                attributes: ["id", "account_number", "account_name"],
            }],
            order: [["id", "DESC"]],
        });

        res.status(StatusCodes.OK).json({
            success: true,
            result: {
                billApplies,
                refunds,
            },
        });
    }),

    getOpenCreditsForVendor: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const { vendorId } = req.params;

        if (!companyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        if (!vendorId || isNaN(Number(vendorId))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid vendorId is required");
        }

        const credits = await VendorCreditHeader.findAll({
            where: {
                companyId,
                vendorId: Number(vendorId),
                status: "POSTED",
            },
            include: [
                {
                    model: VendorCreditBillApply,
                    as: "billApplies",
                },
                {
                    model: VendorRefundHeader,
                    as: "refunds",
                    where: { status: { [Op.ne]: "CANCELLED" } },
                    required: false,
                },
            ],
            order: [["creditDate", "ASC"], ["id", "ASC"]],
        });

        const activeCredits = credits.map((c: any) => {
            const total = Number(c.totalAmount || 0);
            const applied = (c.billApplies || []).reduce((sum: number, a: any) => sum + Number(a.appliedAmount || 0), 0);
            const refunded = (c.refunds || []).reduce((sum: number, r: any) => sum + Number(r.refundAmount || 0), 0);
            const available = Number((total - (applied + refunded)).toFixed(2));
            return {
                id: c.id,
                creditNoteNumber: c.creditNoteNumber,
                creditDate: c.creditDate,
                totalAmount: total,
                appliedAmount: applied,
                refundedAmount: refunded,
                availableCredit: available,
                remarks: c.remarks,
            };
        }).filter((c) => c.availableCredit > 0.01);

        res.status(StatusCodes.OK).json({
            success: true,
            result: activeCredits,
        });
    }),

    applyCreditsToBill: asyncHandler(async (req: CustomRequest, res: Response) => {
        const transaction = await sequelize.transaction();
        try {
            const company = await findCompanyForUser(req.user);
            const companyId = company?.id;
            const user_id = req.user?.id;

            if (!companyId || !user_id) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User authentication required");
            }

            const { purchaseInvoiceId, creditApplications, applyDate, remarks } = req.body;

            if (!purchaseInvoiceId || !Array.isArray(creditApplications) || creditApplications.length === 0) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("purchaseInvoiceId and an array of creditApplications are required");
            }

            const bill = await PurchaseInvoiceHeader.findOne({
                where: { id: Number(purchaseInvoiceId), companyId },
                transaction,
            });

            if (!bill) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error(`Purchase Bill #${purchaseInvoiceId} not found`);
            }

            const billTotal = Number(bill.totalAmount || 0);
            const billPaid = Number(bill.paidAmount || 0);
            const billBal = bill.balanceAmount !== null && bill.balanceAmount !== undefined
                ? Number(bill.balanceAmount)
                : (billTotal - billPaid);

            if (billBal <= 0.01) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error(`Purchase Bill #${bill.invoiceNumber} is already fully paid.`);
            }

            const totalApplying = Number(
                creditApplications.reduce((sum: number, c: any) => sum + Number(c.amountToApply || 0), 0).toFixed(2)
            );

            if (totalApplying <= 0) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Total credit amount to apply must be greater than zero");
            }

            if (totalApplying > Number((billBal + 0.01).toFixed(2))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error(
                    `Cannot apply total ₹${totalApplying.toFixed(2)} to Bill #${bill.invoiceNumber}. Outstanding due balance is only ₹${billBal.toFixed(2)}.`
                );
            }

            const createdApplies: any[] = [];

            for (const app of creditApplications) {
                const creditId = Number(app.vendorCreditId);
                const amount = Number(Number(app.amountToApply || 0).toFixed(2));

                if (!creditId || amount <= 0) continue;

                const vendorCredit = await VendorCreditHeader.findOne({
                    where: { id: creditId, companyId },
                    transaction,
                });

                if (!vendorCredit) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`Vendor Credit #${creditId} not found`);
                }

                const totalCreditAmount = Number(vendorCredit.totalAmount || 0);

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

                if (amount > availableCredit) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(
                        `Cannot apply ₹${amount.toFixed(2)} from Credit #${vendorCredit.creditNoteNumber}. Available credit balance is only ₹${availableCredit.toFixed(2)}.`
                    );
                }

                const billApply = await VendorCreditBillApply.create({
                    companyId,
                    vendorCreditId: vendorCredit.id,
                    purchaseInvoiceId: bill.id,
                    appliedAmount: amount,
                    applyDate: applyDate ? new Date(applyDate) : new Date(),
                    remarks: remarks || app.remarks || null,
                    user_id,
                }, { transaction });

                const newTotalApplied = Number((alreadyApplied + amount).toFixed(2));
                await vendorCredit.update({
                    appliedAmount: newTotalApplied,
                }, { transaction });

                createdApplies.push(billApply);
            }

            const newPaid = Number((billPaid + totalApplying).toFixed(2));
            const newBal = Math.max(0, Number((billTotal - newPaid).toFixed(2)));
            const newStatus = newBal <= 0.01 ? "PAID" : "PARTIAL_PAID";

            await bill.update({
                paidAmount: newPaid,
                balanceAmount: newBal,
                status: newStatus,
            }, { transaction });

            await transaction.commit();

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Selected vendor credits applied to bill successfully",
                result: {
                    purchaseInvoiceId: bill.id,
                    billNumber: bill.invoiceNumber,
                    totalApplied: totalApplying,
                    remainingBillBalance: newBal,
                    status: newStatus,
                    createdApplies,
                },
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }),

    updateVendorCredit: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const { id } = req.params;

        if (!companyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const vendorCredit = await VendorCreditHeader.findOne({
            where: { id: Number(id), companyId },
        });

        if (!vendorCredit) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error(`Vendor Credit #${id} not found`);
        }

        if (String(vendorCredit.status).toUpperCase() !== "DRAFT") {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error(`Cannot edit Vendor Credit with status "${vendorCredit.status}". Once approved/posted from DRAFT, records cannot be modified.`);
        }

        let header = req.body.header || req.body;
        if (typeof header === "string") header = JSON.parse(header);

        if (header.remarks !== undefined) vendorCredit.remarks = header.remarks;
        else if (header.reason !== undefined) vendorCredit.remarks = header.reason;
        if (header.status !== undefined && ["DRAFT", "APPROVED", "OPEN", "POSTED"].includes(header.status)) {
            vendorCredit.status = header.status;
        }

        await vendorCredit.save();

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Vendor Credit updated successfully",
            result: vendorCredit,
        });
    }),

    deleteVendorCredit: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const { id } = req.params;

        if (!companyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const vendorCredit = await VendorCreditHeader.findOne({
            where: { id: Number(id), companyId },
        });

        if (!vendorCredit) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error(`Vendor Credit #${id} not found`);
        }

        if (String(vendorCredit.status).toUpperCase() !== "DRAFT") {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error(`Cannot delete Vendor Credit with status "${vendorCredit.status}". Only DRAFT records can be deleted.`);
        }

        await VendorCreditLine.destroy({ where: { creditHeaderId: vendorCredit.id } });
        await vendorCredit.destroy();

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Vendor Credit deleted successfully",
        });
    }),
};
export default VendorCreditController;

