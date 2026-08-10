import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import { GRN, GRNLine } from "../../../../modals/Transactions/purchase/GRN";
import { findCompanyForUser } from "../../../../utils/findCompanyForUser";
import Warehouse from "../../../../modals/masters/warehouse/warehouse";
import { InventoryService } from "../../../../utils/inventoryService";
import ItemMaster from "../../../../modals/masters/items/itemMaster";
import { GLImpactService } from "../../../../utils/glImpactService";
import { CustomRequest } from "../../../../typeRequest/customReq";
import { normalizeGRNStatus } from "../../../../utils/p2pStatus";
import { 
    PurchaseOrder, 
    PurchaseOrderLine 
} from "../../../../modals/Transactions/purchase/purchaseOrder";
import Godown from "../../../../modals/masters/godown/godown";
import Stack from "../../../../modals/masters/stack/stack";
import sequelize from "../../../../dbconfig/dbconfig";

const normalizeOptionalId = (value: unknown) => {
    if (value === null || value === "") {
        return null;
    }
    return Number(value);
};

const GRNController = {
    createGRN: asyncHandler(async (req: CustomRequest, res: Response) => {
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
            const CompanyId = company?.id;
            const user_id = req.user?.id;

            if (!CompanyId || !user_id) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User authentication required");
            }

            const headerPayload: any = {
                grnNo: String(header.grnNo || "").trim(),
                purchaseOrderId: normalizeOptionalId(header.purchaseOrderId),
                warehouseId: Number(header.warehouseId),
                godownId: normalizeOptionalId(header.godownId) ? Number(header.godownId) : null,
                stackId: normalizeOptionalId(header.stackId) ? Number(header.stackId) : null,
                grnDate: header.grnDate ? new Date(header.grnDate) : null,
                vehicleNo: header.vehicleNo || null,
                driverName: header.driverName || null,
                status: normalizeGRNStatus(header.status, "DRAFT"),
                remarks: header.remarks || null,
                CompanyId,
                user_id,
            };

            console.log("Header Payload:", headerPayload);

            if (!headerPayload.grnNo) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("grnNo is required");
            }
            if (!headerPayload.warehouseId) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("warehouseId is required");
            }
            if (!headerPayload.grnDate || Number.isNaN(headerPayload.grnDate.getTime())) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid grnDate is required");
            }

            const preparedLineItems: any[] = [];
            for (let index = 0; index < lineItems.length; index++) {
                const lineItem = lineItems[index];
                const orderedQty = Number(lineItem.orderedQty);
                const receivedQty = Number(lineItem.receivedQty);
                const acceptedQty =
                    lineItem.acceptedQty !== undefined && lineItem.acceptedQty !== ""
                        ? Number(lineItem.acceptedQty)
                        : 0;
                const rejectedQty =
                    lineItem.rejectedQty !== undefined && lineItem.rejectedQty !== ""
                        ? Number(lineItem.rejectedQty)
                        : 0;

                const linePayload: any = {
                    purchaseOrderLineId: normalizeOptionalId(lineItem.purchaseOrderLineId),
                    itemId: Number(lineItem.itemId),
                    orderedQty,
                    receivedQty,
                    acceptedQty,
                    rejectedQty,
                    batchNo: lineItem.batchNo || null,
                    serialNo: lineItem.serialNo || null,
                    manufacturingDate: lineItem.manufacturingDate ? new Date(lineItem.manufacturingDate) : null,
                    expiryDate: lineItem.expiryDate ? new Date(lineItem.expiryDate) : null,
                    qcRequired: lineItem.qcRequired !== undefined ? Boolean(lineItem.qcRequired) : true,
                    status: lineItem.status || "PENDING",
                    remarks: lineItem.remarks || null,
                    CompanyId,
                    user_id,
                };

                if (!linePayload.itemId) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`itemId is required in line item ${index + 1}`);
                }
                // if (!linePayload.warehouseId) {
                //     res.status(StatusCodes.BAD_REQUEST);
                //     throw new Error(`warehouseId is required in line item ${index + 1}`);
                // }
                if (!linePayload.orderedQty || linePayload.orderedQty <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`orderedQty must be greater than zero in line item ${index + 1}`);
                }
                if (!linePayload.receivedQty || linePayload.receivedQty <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`receivedQty must be greater than zero in line item ${index + 1}`);
                }
                if (linePayload.acceptedQty < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`acceptedQty cannot be negative in line item ${index + 1}`);
                }
                if (linePayload.rejectedQty < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`rejectedQty cannot be negative in line item ${index + 1}`);
                }

                preparedLineItems.push(linePayload);
            }

            const createdHeader = await GRN.create(headerPayload, { transaction });
            const createdLineItems = [];

            for (const linePayload of preparedLineItems) {
                linePayload.grnHeaderId = createdHeader.id;
                const createdLine = await GRNLine.create(linePayload, { transaction });
                createdLineItems.push(createdLine);
            }

            await transaction.commit();

            res.status(StatusCodes.CREATED).json({
                success: true,
                message: "GRN created successfully",
                result: {
                    header: createdHeader,
                    lineItems: createdLineItems,
                },
            });
        } catch (error) {
            console.log(error)
            await transaction.rollback();
            throw error;
        }
    }),

    getAllGRN: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const CompanyId = company?.id;
        const user_id = req.user?.id;

        if (!CompanyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const { page = 1, limit = 10, search } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const whereClause: any = { CompanyId };
        if (search) {
            whereClause[Op.or] = [
                { grnNo: { [Op.like]: `%${search}%` } },
                { vehicleNo: { [Op.like]: `%${search}%` } },
            ];
        }

        const { rows: grns, count: total } = await GRN.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: PurchaseOrder,
                    as: "purchaseOrder",
                    attributes: ["id", "purchaseNo"],
                },
                {
                    model: Warehouse,
                    as: "warehouse",
                    attributes: ["id"],
                },
                {
                    model: GRNLine,
                    as: "lineItems",
                    required: false,
                    include: [
                        {
                            model: ItemMaster,
                            as: "item",
                            attributes: ["id", "item_code", "item_name", "item_desc"],
                        },
                        // {
                        //     model: PurchaseOrderLine,
                        //     as: "purchaseOrderLine",
                        //     attributes: ["id", "quantity", "rate"],
                        // },
                    ],
                },
            ],
            offset,
            limit: Number(limit),
            order: [["createdAt", "DESC"]],
        });

        res.status(StatusCodes.OK).json({
            message: "GRNs fetched successfully",
            success: true,
            result: grns,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }),

    getGRNById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const company = await findCompanyForUser(req.user);
        const CompanyId = company?.id;
        const user_id = req.user?.id;

        if (!CompanyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const grn = await GRN.findOne({
            where: { id: Number(id), CompanyId },
            include: [
                {
                    model: PurchaseOrder,
                    as: "purchaseOrder",
                    attributes: ["id", "purchaseNo"],
                },
                {
                    model: Warehouse,
                    as: "warehouse",
                    attributes: ["id"],
                },
                {
                    model: GRNLine,
                    as: "lineItems",
                    required: false,
                    include: [
                        {
                            model: ItemMaster,
                            as: "item",
                            attributes: ["id", "item_code", "item_name", "item_desc"],
                        },
                        {
                            model: PurchaseOrderLine,
                            as: "purchaseOrderLine",
                            attributes: ["id", "quantity", "rate"],
                        },
                    ],
                },
            ],
        });

        if (!grn) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("GRN not found");
        }

        res.status(StatusCodes.OK).json({
            message: "GRN fetched successfully",
            success: true,
            result: grn,
        });
    }),

    updateGRN: asyncHandler(async (req: CustomRequest, res: Response) => {
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
            const CompanyId = company?.id;
            const user_id = req.user?.id;

            if (!CompanyId || !user_id) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User authentication required");
            }

            const existingGRN = await GRN.findOne({
                where: { id: Number(id), CompanyId },
                transaction,
            });

            if (!existingGRN) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("GRN not found");
            }

            const headerPayload: any = {
                grnNo: String(header.grnNo || existingGRN.grnNo).trim(),
                purchaseOrderId: normalizeOptionalId(header.purchaseOrderId),
                warehouseId: Number(header.warehouseId || existingGRN.warehouseId),
                godownId: normalizeOptionalId(header.godownId) ? Number(header.godownId) : existingGRN.godownId,
                stackId: normalizeOptionalId(header.stackId) ? Number(header.stackId) : existingGRN.stackId,
                grnDate: header.grnDate ? new Date(header.grnDate) : existingGRN.grnDate,
                vehicleNo: header.hasOwnProperty("vehicleNo") ? header.vehicleNo : existingGRN.vehicleNo,
                driverName: header.hasOwnProperty("driverName") ? header.driverName : existingGRN.driverName,
                status: normalizeGRNStatus(header.status || existingGRN.status, existingGRN.status || "DRAFT"),
                remarks: header.hasOwnProperty("remarks") ? header.remarks : existingGRN.remarks,
                CompanyId,
                user_id,
            };

            if (!headerPayload.grnNo) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("grnNo is required");
            }
            if (!headerPayload.warehouseId) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("warehouseId is required");
            }
            if (!headerPayload.grnDate || Number.isNaN(headerPayload.grnDate.getTime())) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid grnDate is required");
            }

            await existingGRN.update(headerPayload, { transaction });

            await GRNLine.destroy({
                where: { grnHeaderId: existingGRN.id },
                transaction,
            });

            const updatedLineItems: any[] = [];
            for (let index = 0; index < lineItems.length; index++) {
                const lineItem = lineItems[index];
                const orderedQty = Number(lineItem.orderedQty);
                const receivedQty = Number(lineItem.receivedQty);
                const acceptedQty =
                    lineItem.acceptedQty !== undefined && lineItem.acceptedQty !== ""
                        ? Number(lineItem.acceptedQty)
                        : 0;
                const rejectedQty =
                    lineItem.rejectedQty !== undefined && lineItem.rejectedQty !== ""
                        ? Number(lineItem.rejectedQty)
                        : 0;

                const linePayload: any = {
                    grnHeaderId: existingGRN.id,
                    purchaseOrderLineId: normalizeOptionalId(lineItem.purchaseOrderLineId),
                    itemId: Number(lineItem.itemId),
                    orderedQty,
                    receivedQty,
                    acceptedQty,
                    rejectedQty,
                    batchNo: lineItem.batchNo || null,
                    serialNo: lineItem.serialNo || null,
                    manufacturingDate: lineItem.manufacturingDate ? new Date(lineItem.manufacturingDate) : null,
                    expiryDate: lineItem.expiryDate ? new Date(lineItem.expiryDate) : null,
                    qcRequired: lineItem.qcRequired !== undefined ? Boolean(lineItem.qcRequired) : true,
                    status: lineItem.status || "PENDING",
                    remarks: lineItem.remarks || null,
                    CompanyId,
                    user_id,
                };

                if (!linePayload.itemId) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`itemId is required in line item ${index + 1}`);
                }
                // if (!linePayload.warehouseId) {
                //     res.status(StatusCodes.BAD_REQUEST);
                //     throw new Error(`warehouseId is required in line item ${index + 1}`);
                // }
                if (!linePayload.orderedQty || linePayload.orderedQty <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`orderedQty must be greater than zero in line item ${index + 1}`);
                }
                if (!linePayload.receivedQty || linePayload.receivedQty <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`receivedQty must be greater than zero in line item ${index + 1}`);
                }
                if (linePayload.acceptedQty < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`acceptedQty cannot be negative in line item ${index + 1}`);
                }
                if (linePayload.rejectedQty < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`rejectedQty cannot be negative in line item ${index + 1}`);
                }

                const createdLine = await GRNLine.create(linePayload, { transaction });
                updatedLineItems.push(createdLine);
            }

            await transaction.commit();

            res.status(StatusCodes.OK).json({
                success: true,
                message: "GRN updated successfully",
                result: {
                    header: existingGRN,
                    lineItems: updatedLineItems,
                },
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }),

    updateStatusOfGRN: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { status } = req.body;

        const company = await findCompanyForUser(req.user);
        const CompanyId = company?.id;
        const user_id = req.user?.id;

        if (!CompanyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const grn = await GRN.findOne({
            where: { id: Number(id), CompanyId },
        });

        if (!grn) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("GRN not found");
        }

        if (!status) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Status is required");
        }

        const previousStatus = grn.status;
        const normalizedStatus = normalizeGRNStatus(status);

        // Idempotency check: if status is unchanged, return current GRN
        if (previousStatus === normalizedStatus) {
            res.status(StatusCodes.OK).json({
                success: true,
                message: "GRN status is already set to " + status,
                result: grn,
            });
            return;
        }

        // Prevent double posting/approval
        const isActiveGRNStatus = (s: string) => ["RECEIVED", "QC_PENDING", "QC_COMPLETED", "COMPLETED"].includes(s);
        if (isActiveGRNStatus(previousStatus) && isActiveGRNStatus(normalizedStatus)) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error(`GRN is already in ${previousStatus} state.`);
        }

        // Managed transaction for status transition, stock, and GL updates
        await sequelize.transaction(async (t) => {
            await grn.update({
                status: normalizedStatus as "DRAFT" | "RECEIVED" | "QC_PENDING" | "QC_COMPLETED" | "COMPLETED" | "CANCELLED"
            }, { transaction: t });

            // If transitioning to a received/complete state from a draft state
            if (isActiveGRNStatus(normalizedStatus) && !isActiveGRNStatus(previousStatus)) {
                await InventoryService.updateStockFromGRN(
                    grn.id,
                    grn.warehouseId,
                    CompanyId,
                    user_id,
                    t
                );
                await GLImpactService.processGRNPosting(
                    "GRN",
                    grn.id,
                    CompanyId,
                    user_id,
                    undefined,
                    2, // Default GRNI Clearing Account ID
                    t
                );
            }

            // If transitioning to CANCELLED from APPROVED/RECEIVED
            if (normalizedStatus === "CANCELLED" && isActiveGRNStatus(previousStatus)) {
                await InventoryService.reverseStockFromGRN(
                    grn.id,
                    grn.warehouseId,
                    CompanyId,
                    user_id,
                    t
                );
            }
        });

        res.status(StatusCodes.OK).json({
            success: true,
            message: "GRN status updated successfully",
            result: grn,
        });
    }),

    deleteGRN: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;

        const company = await findCompanyForUser(req.user);
        const CompanyId = company?.id;
        const user_id = req.user?.id;

        if (!CompanyId || !user_id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const grn = await GRN.findOne({
            where: { id: Number(id), CompanyId },
        });

        if (!grn) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("GRN not found");
        }

        await GRNLine.destroy({ where: { grnHeaderId: grn.id } });
        await grn.destroy();

        res.status(StatusCodes.OK).json({
            success: true,
            message: "GRN deleted successfully",
            result: null,
        });
    }),

    exportGRNCSV: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const CompanyId = company?.id;
        const { fromDate, toDate, status, purchaseOrderId, warehouseId } = req.query;

        if (!CompanyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const whereClause: any = { CompanyId };

        const convertDateFormat = (dateStr: string): string => {
            if (dateStr.includes("/")) {
                const parts = dateStr.split("/");
                if (parts.length === 3) {
                    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
                }
            }
            return dateStr;
        };

        if (fromDate || toDate) {
            const dateConditions: any = {};
            if (fromDate) {
                dateConditions[Op.gte] = convertDateFormat(fromDate as string);
            }
            if (toDate) {
                dateConditions[Op.lte] = convertDateFormat(toDate as string);
            }
            whereClause.grnDate = dateConditions;
        }

        if (status) {
            whereClause.status = status;
        }
        if (purchaseOrderId) {
            whereClause.purchaseOrderId = Number(purchaseOrderId);
        }
        if (warehouseId) {
            whereClause.warehouseId = Number(warehouseId);
        }

        const grns = await GRN.findAll({
            where: whereClause,
            include: [
                {
                    model: PurchaseOrder,
                    as: "purchaseOrder",
                    attributes: ["id", "purchaseNo"],
                },
                {
                    model: Warehouse,
                    as: "warehouse",
                    attributes: ["id", "warehouse_name"],
                },
                {
                    model: GRNLine,
                    as: "lineItems",
                    required: false,
                    include: [
                        {
                            model: ItemMaster,
                            as: "item",
                            attributes: ["id", "item_code", "item_name", "item_desc"],
                        },
                        {
                            model: PurchaseOrderLine,
                            as: "purchaseOrderLine",
                            attributes: ["id", "quantity", "rate"],
                        },
                        {
                            model: Warehouse,
                            as: "warehouse",
                            attributes: ["id", "warehouse_name"],
                        },
                        {
                            model: Godown,
                            as: "godown",
                            attributes: ["id", "godown_name"],
                        },
                        {
                            model: Stack,
                            as: "stackDetail",
                            attributes: ["id", "stack_name"],
                        },
                    ],
                },
            ],
            order: [["createdAt", "DESC"]],
        });

        const csvData: any[] = [];
        grns.forEach((grn: any) => {
            if (grn.lineItems && grn.lineItems.length > 0) {
                grn.lineItems.forEach((lineItem: any) => {
                    csvData.push({
                        "GRN Number": grn.grnNo || "",
                        "GRN Date": grn.grnDate ? new Date(grn.grnDate).toLocaleDateString() : "",
                        "Purchase Order": grn.purchaseOrder?.purchaseNo || "",
                        "Warehouse": grn.warehouse?.warehouse_name || "",
                        "Vehicle No": grn.vehicleNo || "",
                        "Driver Name": grn.driverName || "",
                        Status: grn.status || "",
                        Remarks: grn.remarks || "",
                        "Item Code": lineItem.item?.item_code || "",
                        "Item Name": lineItem.item?.item_name || "",
                        Quantity: lineItem.receivedQty || 0,
                        "Accepted Qty": lineItem.acceptedQty || 0,
                        "Rejected Qty": lineItem.rejectedQty || 0,
                        "Warehouse Location": lineItem.warehouse?.warehouse_name || "",
                        "Godown": lineItem.godown?.godown_name || "",
                        "Stack": lineItem.stackDetail?.stack_name || "",
                        "Batch No": lineItem.batchNo || "",
                        "Serial No": lineItem.serialNo || "",
                        "QC Required": lineItem.qcRequired ? "YES" : "NO",
                        "Line Status": lineItem.status || "",
                    });
                });
            } else {
                csvData.push({
                    "GRN Number": grn.grnNo || "",
                    "GRN Date": grn.grnDate ? new Date(grn.grnDate).toLocaleDateString() : "",
                    "Purchase Order": grn.purchaseOrder?.purchaseNo || "",
                    "Warehouse": grn.warehouse?.warehouse_name || "",
                    "Vehicle No": grn.vehicleNo || "",
                    "Driver Name": grn.driverName || "",
                    Status: grn.status || "",
                    Remarks: grn.remarks || "",
                    "Item Code": "",
                    "Item Name": "",
                    Quantity: 0,
                    "Accepted Qty": 0,
                    "Rejected Qty": 0,
                    "Warehouse Location": "",
                    "Godown": "",
                    "Stack": "",
                    "Batch No": "",
                    "Serial No": "",
                    "QC Required": "",
                    "Line Status": "",
                });
            }
        });

        const headers = csvData.length > 0 ? Object.keys(csvData[0]) : [
            "GRN Number",
            "GRN Date",
            "Purchase Order",
            "Warehouse",
            "Vehicle No",
            "Driver Name",
            "Status",
            "Remarks",
            "Item Code",
            "Item Name",
            "Quantity",
            "Accepted Qty",
            "Rejected Qty",
            "Warehouse Location",
            "Godown",
            "Stack",
            "Batch No",
            "Serial No",
            "QC Required",
            "Line Status",
        ];

        const csvContent = [
            headers.join(","),
            ...csvData.map((row) =>
                headers
                    .map((header) => {
                        const value = row[header];
                        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value;
                    })
                    .join(",")
            ),
        ].join("\n");

        const filename = `grn_export_${new Date().toISOString().split("T")[0]}.csv`;
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.status(StatusCodes.OK).send(csvContent);
    }),
};

export default GRNController;