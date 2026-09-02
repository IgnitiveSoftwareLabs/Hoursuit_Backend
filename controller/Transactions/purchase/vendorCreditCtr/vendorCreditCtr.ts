import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import sequelize from "../../../../dbconfig/dbconfig";
import { CustomRequest } from "../../../../typeRequest/customReq";
import { findCompanyForUser } from "../../../../utils/findCompanyForUser";
import VendorCreditHeader from "../../../../modals/Transactions/purchase/vendorCredit/vendorCreditHeader";
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

            const vendorCreditHeader = await VendorCreditHeader.create({
                companyId,
                creditNoteNumber,
                vendorId,
                purchaseReturnHeaderId: header.purchaseReturnHeaderId ? Number(header.purchaseReturnHeaderId) : null,
                fulfillmentHeaderId: header.fulfillmentHeaderId ? Number(header.fulfillmentHeaderId) : null,
                purchaseInvoiceHeaderId: header.purchaseInvoiceHeaderId ? Number(header.purchaseInvoiceHeaderId) : null,
                creditDate,
                subtotal: Number(totalSubtotal.toFixed(2)),
                discountAmount: Number(totalDiscount.toFixed(2)),
                taxAmount: Number(totalTax.toFixed(2)),
                totalAmount: Number(totalHeaderAmount.toFixed(2)),
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

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Vendor credits fetched successfully",
            result: credits,
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

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Vendor credit fetched successfully",
            result: credit
        });
    })
};

export default VendorCreditController;
