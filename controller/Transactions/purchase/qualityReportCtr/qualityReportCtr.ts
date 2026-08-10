import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import { findCompanyForUser } from "../../../../utils/findCompanyForUser";
import { CustomRequest } from "../../../../typeRequest/customReq";
import sequelize from "../../../../dbconfig/dbconfig";
import { QualityInspectionHeader, QualityInspectionLine } from "../../../../modals/Transactions/purchase/qualityReport";
import PurchaseOrder from "../../../../modals/Transactions/purchase/purchaseOrder/purchaseOrderHeader";
import VendorDetails from "../../../../modals/masters/vendorDetails/vendorDetails";
import { GRN } from "../../../../modals/Transactions/purchase/GRN";

const normalizeOptionalId = (value: unknown) => {
    if (value === null || value === "") {
        return null;
    }
    return Number(value);
};

const QualityReportController = {
    createQualityReport: asyncHandler(async (req: CustomRequest, res: Response) => {
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

            const headerPayload: any = {
                qcNumber: String(header.qcNumber || "").trim(),
                grnHeaderId: Number(header.grnHeaderId),
                poHeaderId: normalizeOptionalId(header.poHeaderId),
                vendorId: normalizeOptionalId(header.vendorId),
                inspectionDate: header.inspectionDate ? new Date(header.inspectionDate) : null,
                inspectedBy: normalizeOptionalId(header.inspectedBy),
                approvedBy: normalizeOptionalId(header.approvedBy),
                overallStatus: header.overallStatus || "PENDING",
                remarks: header.remarks || null,
                companyId,
                user_id,
            };

            if (!headerPayload.qcNumber) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("qcNumber is required");
            }
            if (!headerPayload.grnHeaderId) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("grnHeaderId is required");
            }
            if (!headerPayload.inspectionDate || Number.isNaN(headerPayload.inspectionDate.getTime())) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid inspectionDate is required");
            }

            const preparedLineItems: any[] = [];
            for (let index = 0; index < lineItems.length; index++) {
                const lineItem = lineItems[index];
                const receivedQty = Number(lineItem.receivedQty);
                const inspectedQty = Number(lineItem.inspectedQty);
                const acceptedQty = Number(lineItem.acceptedQty);
                const rejectedQty = lineItem.rejectedQty !== undefined ? Number(lineItem.rejectedQty) : 0;
                const damagedQty = lineItem.damagedQty !== undefined ? Number(lineItem.damagedQty) : 0;
                const holdQty = lineItem.holdQty !== undefined ? Number(lineItem.holdQty) : 0;

                const linePayload: any = {
                    grnLineId: Number(lineItem.grnLineId),
                    itemId: Number(lineItem.itemId),
                    batchNo: lineItem.batchNo || null,
                    receivedQty,
                    inspectedQty,
                    acceptedQty,
                    rejectedQty,
                    damagedQty,
                    holdQty,
                    qcStatus: String(lineItem.qcStatus || "").trim(),
                    rejectionReason: lineItem.rejectionReason || null,
                    remarks: lineItem.remarks || null,
                };

                if (!linePayload.grnLineId) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`grnLineId is required in line item ${index + 1}`);
                }
                if (!linePayload.itemId) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`itemId is required in line item ${index + 1}`);
                }
                if (!linePayload.receivedQty || linePayload.receivedQty <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`receivedQty must be greater than zero in line item ${index + 1}`);
                }
                if (!linePayload.inspectedQty || linePayload.inspectedQty < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`inspectedQty is required in line item ${index + 1}`);
                }
                if (linePayload.acceptedQty < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`acceptedQty cannot be negative in line item ${index + 1}`);
                }
                if (!linePayload.qcStatus) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`qcStatus is required in line item ${index + 1}`);
                }

                preparedLineItems.push(linePayload);
            }

            const createdHeader = await QualityInspectionHeader.create(headerPayload, { transaction });
            const createdLineItems: any[] = [];

            for (const linePayload of preparedLineItems) {
                linePayload.qcHeaderId = createdHeader.id;
                const createdLine = await QualityInspectionLine.create(linePayload, { transaction });
                createdLineItems.push(createdLine);
            }

            await transaction.commit();

            res.status(StatusCodes.CREATED).json({
                success: true,
                message: "Quality report created successfully",
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

    getAllQualityReports: asyncHandler(async (req: CustomRequest, res: Response) => {
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
                { qcNumber: { [Op.like]: `%${search}%` } },
                { remarks: { [Op.like]: `%${search}%` } },
            ];
        }
        if (status) {
            whereClause.overallStatus = status;
        }

        const { rows: reports, count: total } = await QualityInspectionHeader.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: PurchaseOrder,
                    as: "purchaseOrder",
                    attributes: ["id", "purchaseNo"],
                },
                {
                    model: VendorDetails,
                    as: "vendor",
                    attributes: ["id", "vendor_name"],
                    required: false,
                },
                {
                    model: GRN,
                    as: "grnHeader",
                    attributes: ["id", "grnNo"],
                    required: false,
                },
            ],
            offset,
            limit: Number(limit),
            order: [["createdAt", "DESC"]],
        });

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Quality reports fetched successfully",
            result: reports,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }),

    getQualityReportById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;

        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const report = await QualityInspectionHeader.findOne({
            where: { id: Number(id), companyId },
            include: [
                {
                    model: PurchaseOrder,
                    as: "purchaseOrder",
                    attributes: ["id", "purchaseNo"],
                },
                {
                    model: VendorDetails,
                    as: "vendor",
                    attributes: ["id", "vendor_name"],
                    required: false,
                },
                {
                    model: GRN,
                    as: "grnHeader",
                    attributes: ["id", "grnNo"],
                    required: false,
                },
                {
                    model: QualityInspectionLine,
                    as: "lineItems",
                    required: false,
                },
            ],
        });

        if (!report) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Quality report not found");
        }

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Quality report fetched successfully",
            result: report,
        });
    }),

    updateQualityReport: asyncHandler(async (req: CustomRequest, res: Response) => {
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

            const existingReport = await QualityInspectionHeader.findOne({
                where: { id: Number(id), companyId },
                transaction,
            });

            if (!existingReport) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Quality report not found");
            }

            const headerPayload: any = {
                qcNumber: String(header.qcNumber || existingReport.qcNumber).trim(),
                grnHeaderId: Number(header.grnHeaderId || existingReport.grnHeaderId),
                poHeaderId: normalizeOptionalId(header.poHeaderId),
                vendorId: normalizeOptionalId(header.vendorId),
                inspectionDate: header.inspectionDate ? new Date(header.inspectionDate) : existingReport.inspectionDate,
                inspectedBy: normalizeOptionalId(header.inspectedBy),
                approvedBy: normalizeOptionalId(header.approvedBy),
                overallStatus: header.overallStatus || existingReport.overallStatus,
                remarks: header.hasOwnProperty("remarks") ? header.remarks : existingReport.remarks,
                companyId,
                user_id,
            };

            if (!headerPayload.qcNumber) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("qcNumber is required");
            }
            if (!headerPayload.grnHeaderId) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("grnHeaderId is required");
            }
            if (!headerPayload.inspectionDate || Number.isNaN(headerPayload.inspectionDate.getTime())) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid inspectionDate is required");
            }

            await existingReport.update(headerPayload, { transaction });
            await QualityInspectionLine.destroy({ where: { qcHeaderId: existingReport.id }, transaction });

            const updatedLineItems: any[] = [];
            for (let index = 0; index < lineItems.length; index++) {
                const lineItem = lineItems[index];
                const receivedQty = Number(lineItem.receivedQty);
                const inspectedQty = Number(lineItem.inspectedQty);
                const acceptedQty = Number(lineItem.acceptedQty);
                const rejectedQty = lineItem.rejectedQty !== undefined ? Number(lineItem.rejectedQty) : 0;
                const damagedQty = lineItem.damagedQty !== undefined ? Number(lineItem.damagedQty) : 0;
                const holdQty = lineItem.holdQty !== undefined ? Number(lineItem.holdQty) : 0;

                const linePayload: any = {
                    qcHeaderId: existingReport.id,
                    grnLineId: Number(lineItem.grnLineId),
                    itemId: Number(lineItem.itemId),
                    batchNo: lineItem.batchNo || null,
                    receivedQty,
                    inspectedQty,
                    acceptedQty,
                    rejectedQty,
                    damagedQty,
                    holdQty,
                    qcStatus: String(lineItem.qcStatus || "").trim(),
                    rejectionReason: lineItem.rejectionReason || null,
                    remarks: lineItem.remarks || null,
                };

                if (!linePayload.grnLineId) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`grnLineId is required in line item ${index + 1}`);
                }
                if (!linePayload.itemId) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`itemId is required in line item ${index + 1}`);
                }
                if (!linePayload.receivedQty || linePayload.receivedQty <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`receivedQty must be greater than zero in line item ${index + 1}`);
                }
                if (!linePayload.inspectedQty || linePayload.inspectedQty < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`inspectedQty is required in line item ${index + 1}`);
                }
                if (linePayload.acceptedQty < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`acceptedQty cannot be negative in line item ${index + 1}`);
                }
                if (!linePayload.qcStatus) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`qcStatus is required in line item ${index + 1}`);
                }

                const createdLine = await QualityInspectionLine.create(linePayload, { transaction });
                updatedLineItems.push(createdLine);
            }

            await transaction.commit();
            res.status(StatusCodes.OK).json({
                success: true,
                message: "Quality report updated successfully",
                result: {
                    header: existingReport,
                    lineItems: updatedLineItems,
                },
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }),

    updateQualityReportStatus: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { overallStatus } = req.body;

        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;

        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const report = await QualityInspectionHeader.findOne({ where: { id: Number(id), companyId } });
        if (!report) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Quality report not found");
        }
        if (!overallStatus) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("overallStatus is required");
        }

        await report.update({ overallStatus });
        res.status(StatusCodes.OK).json({
            success: true,
            message: "Quality report status updated successfully",
            result: report,
        });
    }),

    deleteQualityReport: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        const user_id = req.user?.id;

        if (!companyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const report = await QualityInspectionHeader.findOne({ where: { id: Number(id), companyId } });
        if (!report) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Quality report not found");
        }

        await QualityInspectionLine.destroy({ where: { qcHeaderId: report.id } });
        await report.destroy();

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Quality report deleted successfully",
            result: null,
        });
    }),
};

export default QualityReportController;
