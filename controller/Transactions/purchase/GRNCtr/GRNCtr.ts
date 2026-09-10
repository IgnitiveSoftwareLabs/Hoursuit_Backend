import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import ChartOfAccountMaster from "../../../../modals/masters/chartOfAccount/chartOfAccount";
import AccountTypeMaster from "../../../../modals/platform/accountType/accountType";
import { GRN, GRNLine } from "../../../../modals/Transactions/purchase/GRN";
import { findCompanyForUser } from "../../../../utils/findCompanyForUser";
import Warehouse from "../../../../modals/masters/warehouse/warehouse";
import Godown from "../../../../modals/masters/godown/godown";
import Stack from "../../../../modals/masters/stack/stack";
import VendorDetails from "../../../../modals/masters/vendorDetails/vendorDetails";
import TransportationMode from "../../../../modals/masters/transportMode/transportMode";
import CityMaster from "../../../../modals/masters/city/city";
import { InventoryService } from "../../../../utils/inventoryService";
import ItemMaster from "../../../../modals/masters/items/itemMaster";
import UOMMaster from "../../../../modals/masters/UOM/UOMMaster";
import { GLImpactService } from "../../../../utils/glImpactService";
import { CustomRequest } from "../../../../typeRequest/customReq";
import { normalizeGRNStatus } from "../../../../utils/p2pStatus";
import {
    PurchaseOrder,
    PurchaseOrderLine
} from "../../../../modals/Transactions/purchase/purchaseOrder";
import sequelize from "../../../../dbconfig/dbconfig";

export const isDecimalAllowedForUOM = (uomObjOrName: any): boolean => {
    if (!uomObjOrName) return true;
    if (typeof uomObjOrName === "object" && uomObjOrName.allow_decimals !== undefined && uomObjOrName.allow_decimals !== null) {
        return Boolean(uomObjOrName.allow_decimals);
    }
    const name = String(typeof uomObjOrName === "object" ? uomObjOrName.uom_name || uomObjOrName.name || "" : uomObjOrName).trim().toUpperCase();
    const DISCRETE_UOMS = ["EACH", "EA", "PCS", "PIECE", "PIECES", "BOX", "BOXES", "UNIT", "UNITS", "PAIR", "PAIRS", "SET", "SETS", "NOS", "NUMBER", "NUMBERS", "BAG", "BAGS", "PACK", "PACKS", "CARTON", "CARTONS", "DRUM", "DRUMS", "BOTTLE", "BOTTLES", "CAN", "CANS", "ROLL", "ROLLS", "BARREL", "BARRELS"];
    return !DISCRETE_UOMS.includes(name);
};

const normalizeOptionalId = (value: unknown) => {
    if (value === null || value === undefined || value === "") {
        return null;
    }
    return Number(value);
};

const getItemIncludeConfig = () => ({
    model: ItemMaster,
    as: "item",
    attributes: ["id", "item_code", "item_name", "item_desc", "track_inventory", "cost_price", "default_rate", "asset_account_id", "income_account_id", "cogs_account_id", "expense_account_id"],
    include: [
        { model: ChartOfAccountMaster, as: "asset_account", attributes: ["id", "account_number", "account_name"], include: [{ model: AccountTypeMaster, as: "accountType", attributes: ["id", "account_type_name"] }] },
        { model: ChartOfAccountMaster, as: "income_account", attributes: ["id", "account_number", "account_name"], include: [{ model: AccountTypeMaster, as: "accountType", attributes: ["id", "account_type_name"] }] },
        { model: ChartOfAccountMaster, as: "cogs_account", attributes: ["id", "account_number", "account_name"], include: [{ model: AccountTypeMaster, as: "accountType", attributes: ["id", "account_type_name"] }] },
        { model: ChartOfAccountMaster, as: "expense_account", attributes: ["id", "account_number", "account_name"], include: [{ model: AccountTypeMaster, as: "accountType", attributes: ["id", "account_type_name"] }] },
    ],
});

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

            let grnNo = String(header.grnNo || "").trim();
            if (!grnNo) {
                const count = await GRN.count({ where: { CompanyId }, transaction });
                let autoNo = `GRN-${String(count + 1).padStart(4, "0")}`;
                const exists = await GRN.findOne({ where: { grnNo: autoNo, CompanyId }, transaction });
                if (exists) {
                    autoNo = `GRN-${Date.now()}`;
                }
                grnNo = autoNo;
            }

            const headerPayload: any = {
                grnNo,
                purchaseOrderId: normalizeOptionalId(header.purchaseOrderId),
                warehouseId: normalizeOptionalId(header.warehouseId),
                godownId: normalizeOptionalId(header.godownId),
                stackId: normalizeOptionalId(header.stackId),
                transportationModeId: normalizeOptionalId(header.transportationModeId),
                grnDate: header.grnDate ? new Date(header.grnDate) : null,
                vehicleNo: header.vehicleNo || null,
                driverName: header.driverName || null,
                driverPhoneNo: header.driverPhoneNo || header.driverPhone || null,
                memo: header.memo || null,
                status: normalizeGRNStatus(header.status, "PENDING_RECEIPT"),
                remarks: header.remarks || null,
                CompanyId,
                user_id,
            };

            if (!headerPayload.grnDate || Number.isNaN(headerPayload.grnDate.getTime())) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid grnDate is required");
            }

            let poSummary: any = null;
            const batchReceivedByPoLineId: Record<number, number> = {};

            if (headerPayload.purchaseOrderId) {
                poSummary = await InventoryService.getPurchaseOrderReceiptSummary(
                    headerPayload.purchaseOrderId,
                    CompanyId,
                    undefined,
                    transaction
                );

                const po = poSummary.purchaseOrder;
                if (!po) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`Referenced Purchase Order #${headerPayload.purchaseOrderId} does not exist`);
                }

                if (po.isActive === false) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`Cannot create GRN for Purchase Order ${po.purchaseNo || po.id} because it is deactivated/inactive.`);
                }

                const poStatus = String(po.status || "").toUpperCase();
                if (poStatus === "DRAFT" || poStatus === "PENDING_APPROVAL") {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`Cannot create GRN for Purchase Order ${po.purchaseNo || po.id} because it is in Pending Approval status. Purchase Order must be approved first.`);
                }
                if (poStatus === "REJECTED") {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`Cannot create GRN for Purchase Order ${po.purchaseNo || po.id} because it is REJECTED.`);
                }
                if (poStatus === "CANCELLED") {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`Cannot create GRN for Purchase Order ${po.purchaseNo || po.id} because it is CANCELLED.`);
                }
                if (poSummary.isFullyReceived || poSummary.totalRemainingQty <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`Purchase Order ${po.purchaseNo || po.id} has already been fully received across existing receipts.`);
                }
            }

            const preparedLineItems: any[] = [];
            for (let index = 0; index < lineItems.length; index++) {
                const lineItem = lineItems[index];
                let orderedQty = Number(lineItem.orderedQty);
                const receivedQty = Number(lineItem.receivedQty);
                const acceptedQty =
                    lineItem.acceptedQty !== undefined && lineItem.acceptedQty !== ""
                        ? Number(lineItem.acceptedQty)
                        : 0;
                const rejectedQty =
                    lineItem.rejectedQty !== undefined && lineItem.rejectedQty !== ""
                        ? Number(lineItem.rejectedQty)
                        : 0;

                const itemId = Number(lineItem.itemId);
                const poLineId = normalizeOptionalId(lineItem.purchaseOrderLineId);

                if (!itemId) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`itemId is required in line item ${index + 1}`);
                }
                if (!receivedQty || receivedQty <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`receivedQty must be greater than zero in line item ${index + 1}`);
                }
                if (acceptedQty < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`acceptedQty cannot be negative in line item ${index + 1}`);
                }
                if (rejectedQty < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`rejectedQty cannot be negative in line item ${index + 1}`);
                }
                if (acceptedQty > receivedQty) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`acceptedQty (${acceptedQty}) cannot exceed receivedQty (${receivedQty}) in line item ${index + 1}`);
                }
                if (rejectedQty > receivedQty) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`rejectedQty (${rejectedQty}) cannot exceed receivedQty (${receivedQty}) in line item ${index + 1}`);
                }
                if (acceptedQty + rejectedQty > receivedQty) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`The sum of acceptedQty (${acceptedQty}) and rejectedQty (${rejectedQty}) cannot exceed receivedQty (${receivedQty}) in line item ${index + 1}`);
                }

                if (lineItem.manufacturingDate && lineItem.expiryDate) {
                    const mfg = new Date(lineItem.manufacturingDate);
                    const exp = new Date(lineItem.expiryDate);
                    if (exp.getTime() < mfg.getTime()) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`expiryDate cannot be earlier than manufacturingDate in line item ${index + 1}`);
                    }
                }

                if (poSummary) {
                    const matchedSummary = poSummary.lineSummaries.find((s: any) =>
                        (poLineId && Number(s.purchaseOrderLineId) === Number(poLineId)) ||
                        (!poLineId && Number(s.itemId) === itemId)
                    );

                    if (!matchedSummary) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`Line item ${index + 1} (Item #${itemId}) does not belong to Purchase Order ${poSummary.purchaseOrder?.purchaseNo || headerPayload.purchaseOrderId}`);
                    }

                    if (poLineId && Number(matchedSummary.itemId) !== itemId) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`Item mismatch for PO Line #${poLineId} in line item ${index + 1}: PO Line is for item #${matchedSummary.itemId}, but line item specifies #${itemId}`);
                    }

                    orderedQty = matchedSummary.orderedQty;

                    const priorBatchQty = batchReceivedByPoLineId[matchedSummary.purchaseOrderLineId] || 0;
                    const remainingForLine = Math.max(0, matchedSummary.remainingQty - priorBatchQty);
                    const itemName = matchedSummary.item?.item_name || matchedSummary.item?.item_code || `Item #${itemId}`;

                    if (remainingForLine <= 0) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`Item '${itemName}' (PO line #${matchedSummary.purchaseOrderLineId}) has already been fully received across existing GRN(s).`);
                    }

                    if (receivedQty > remainingForLine) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`Received quantity (${receivedQty}) exceeds remaining open quantity (${remainingForLine}) for item '${itemName}' in line item ${index + 1}. (PO Ordered: ${matchedSummary.orderedQty}, Previously Received/Drafted: ${matchedSummary.previouslyReceivedQty}${priorBatchQty > 0 ? `, Current Batch: ${priorBatchQty}` : ""}).`);
                    }

                    batchReceivedByPoLineId[matchedSummary.purchaseOrderLineId] = priorBatchQty + receivedQty;

                    const uomObj = matchedSummary.uom || (lineItem.uom_id ? await UOMMaster.findByPk(lineItem.uom_id, { transaction }) : null);
                    if (uomObj && !isDecimalAllowedForUOM(uomObj)) {
                        if (receivedQty % 1 !== 0 || acceptedQty % 1 !== 0 || rejectedQty % 1 !== 0) {
                            res.status(StatusCodes.BAD_REQUEST);
                            throw new Error(`Decimals are not permitted for UOM '${uomObj.uom_name || "discrete"}' in line item ${index + 1}. Quantities must be whole numbers.`);
                        }
                    }
                } else {
                    if (!orderedQty || orderedQty <= 0) {
                        orderedQty = receivedQty;
                    }
                    if (receivedQty > orderedQty) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`receivedQty (${receivedQty}) cannot exceed orderedQty (${orderedQty}) in line item ${index + 1}`);
                    }
                }

                const lineLocationId = normalizeOptionalId(lineItem.locationId || lineItem.location_id) || normalizeOptionalId(headerPayload.city_id || header.location_id || header.locationId);
                const linePayload: any = {
                    purchaseOrderLineId: poLineId,
                    itemId,
                    locationId: lineLocationId,
                    onHand: lineItem.onHand !== undefined && lineItem.onHand !== "" ? Number(lineItem.onHand) : 0,
                    orderedQty,
                    receivedQty,
                    acceptedQty,
                    rejectedQty,
                    manufacturingDate: lineItem.manufacturingDate ? new Date(lineItem.manufacturingDate) : null,
                    expiryDate: lineItem.expiryDate ? new Date(lineItem.expiryDate) : null,
                    qcRequired: Boolean(lineItem.qcRequired),
                    status: lineItem.status || "PENDING",
                    remarks: lineItem.remarks || null,
                    CompanyId,
                    user_id,
                };

                preparedLineItems.push(linePayload);
            }

            const createdHeader = await GRN.create(headerPayload, { transaction });
            const createdLineItems = [];

            for (const linePayload of preparedLineItems) {
                linePayload.grnHeaderId = createdHeader.id;
                const createdLine = await GRNLine.create(linePayload, { transaction });
                createdLineItems.push(createdLine);
            }

            // Sync Purchase Order status based on all GRNs
            if (headerPayload.purchaseOrderId) {
                await InventoryService.syncPurchaseOrderStatus(headerPayload.purchaseOrderId, CompanyId, transaction);
            }

            const isReceivedOrApprovedStatus = (s: string) => ["APPROVED", "RECEIVED", "PENDING_BILLING", "PENDING_BILLING_PARTIALLY_RECEIVED", "PARTIALLY_RECEIVED", "FULLY_BILLED", "CLOSED"].includes(s);
            if (isReceivedOrApprovedStatus(createdHeader.status)) {
                await InventoryService.updateStockFromGRN(
                    createdHeader.id,
                    createdHeader.warehouseId || 1,
                    CompanyId,
                    user_id,
                    transaction
                );
                await GLImpactService.processGRNPosting(
                    "GRN",
                    createdHeader.id,
                    CompanyId,
                    user_id,
                    undefined,
                    undefined,
                    transaction
                );
                await InventoryService.syncGRNStatus(createdHeader.id, CompanyId, transaction);
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
            console.log(error);
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

        const { page = 1, limit = 10, search, status, startDate, endDate, fromDate, toDate } = req.query;
        const option = String(req.query.option || "").toLowerCase() === "true" || String(req.query.option || "") === "1";

        const whereClause: any = { CompanyId };

        // Search condition
        if (search) {
            const searchStr = String(search).trim();
            const matchingPOs = await PurchaseOrder.findAll({
                where: {
                    CompanyId,
                    purchaseNo: { [Op.like]: `%${searchStr}%` },
                },
                attributes: ["id"],
            });
            const poIds = matchingPOs.map((p: any) => p.id);

            const searchConditions: any[] = [
                { grnNo: { [Op.like]: `%${searchStr}%` } },
                { vehicleNo: { [Op.like]: `%${searchStr}%` } },
                { driverName: { [Op.like]: `%${searchStr}%` } },
                { driverPhoneNo: { [Op.like]: `%${searchStr}%` } },
                { remarks: { [Op.like]: `%${searchStr}%` } },
            ];

            if (poIds.length > 0) {
                searchConditions.push({ purchaseOrderId: { [Op.in]: poIds } });
            }

            if (!isNaN(Number(searchStr))) {
                searchConditions.push({ id: Number(searchStr) });
            }

            whereClause[Op.or] = searchConditions;
        }

        // Status filter
        if (status && status !== "" && status !== "ALL") {
            const statusVal = String(status).trim();
            if (statusVal === "PENDING_RECEIPT" || statusVal === "DRAFT") {
                whereClause.status = { [Op.in]: ["PENDING_RECEIPT", "DRAFT"] };
            } else if (statusVal === "APPROVED" || statusVal === "RECEIVED") {
                whereClause.status = { [Op.in]: ["APPROVED", "RECEIVED"] };
            } else if (statusVal === "CLOSED" || statusVal === "COMPLETED") {
                whereClause.status = { [Op.in]: ["CLOSED", "COMPLETED"] };
            } else if (statusVal === "FULLY_BILLED" || statusVal === "BILLED") {
                whereClause.status = { [Op.in]: ["FULLY_BILLED", "BILLED"] };
            } else if (statusVal === "PARTIALLY_RECEIVED" || statusVal === "PARTIAL_RECEIVED") {
                whereClause.status = { [Op.in]: ["PARTIALLY_RECEIVED", "PARTIAL_RECEIVED"] };
            } else {
                whereClause.status = statusVal;
            }
        }

        // Date range filter
        const fromD = startDate || fromDate;
        const toD = endDate || toDate;
        if (fromD && toD) {
            const start = new Date(fromD as string);
            start.setHours(0, 0, 0, 0);
            const end = new Date(toD as string);
            end.setHours(23, 59, 59, 999);
            whereClause.grnDate = { [Op.between]: [start, end] };
        } else if (fromD) {
            const start = new Date(fromD as string);
            start.setHours(0, 0, 0, 0);
            whereClause.grnDate = { [Op.gte]: start };
        } else if (toD) {
            const end = new Date(toD as string);
            end.setHours(23, 59, 59, 999);
            whereClause.grnDate = { [Op.lte]: end };
        }

        // Sort configuration
        const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy : "createdAt";
        const sortOrder = String(req.query.sortOrder || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

        const sortFieldMap: { [key: string]: any } = {
            id: [["id", sortOrder]],
            grnNo: [["grnNo", sortOrder]],
            grnDate: [["grnDate", sortOrder]],
            status: [["status", sortOrder]],
            vehicleNo: [["vehicleNo", sortOrder]],
            driverName: [["driverName", sortOrder]],
            createdAt: [["createdAt", sortOrder]],
            updatedAt: [["updatedAt", sortOrder]],
        };

        const orderClause = sortFieldMap[sortBy] || [["createdAt", "DESC"]];

        const grnIncludes = [
            {
                model: PurchaseOrder,
                as: "purchaseOrder",
                attributes: ["id", "purchaseNo", "vendor_id", "purchaseDate", "deliveryDate", "status"],
                include: [
                    {
                        model: VendorDetails,
                        as: "vendor",
                        attributes: ["id", "company_name", "first_name", "last_name", "salutation", "entity_id"],
                        required: false,
                    },
                ],
            },
            {
                model: TransportationMode,
                as: "transportationMode",
                attributes: ["id", "mode_name"],
                required: false,
            },
            {
                model: Warehouse,
                as: "warehouse",
                attributes: ["id", "name"],
                required: false,
            },
            {
                model: Godown,
                as: "godown",
                attributes: ["id", "name"],
                required: false,
            },
            {
                model: Stack,
                as: "stack",
                attributes: ["id", "name"],
                required: false,
            },
            {
                model: GRNLine,
                as: "lineItems",
                required: false,
                include: [
                    getItemIncludeConfig(),
                    {
                        model: CityMaster,
                        as: "location",
                        attributes: ["id", "city_name"],
                    },
                    {
                        model: PurchaseOrderLine,
                        as: "purchaseOrderLine",
                        attributes: ["id", "quantity", "rate", "amount", "discount_amount", "subtotal", "tax_amount", "line_total"],
                    },
                ],
            },
        ];

        // Bypass pagination if option is true
        if (option) {
            const grns = await GRN.findAll({
                where: whereClause,
                include: grnIncludes,
                order: orderClause,
            });

            res.status(StatusCodes.OK).json({
                message: "GRNs fetched successfully",
                success: true,
                result: grns,
                total: grns.length,
            });
            return;
        }

        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.max(1, Number(limit) || 10);
        const offset = (pageNum - 1) * limitNum;

        const total = await GRN.count({ where: whereClause });
        const grns = await GRN.findAll({
            where: whereClause,
            include: grnIncludes,
            offset,
            limit: limitNum,
            order: orderClause,
        });

        res.status(StatusCodes.OK).json({
            message: "GRNs fetched successfully",
            success: true,
            result: grns,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
            total,
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
            subQuery: false,
            include: [
                {
                    model: PurchaseOrder,
                    as: "purchaseOrder",
                    attributes: ["id", "purchaseNo", "vendor_id", "purchaseDate", "deliveryDate", "status"],
                    include: [
                        {
                            model: PurchaseOrderLine,
                            as: "purchaseOrderLines",
                            include: [getItemIncludeConfig()],
                        },
                    ],
                },
                {
                    model: TransportationMode,
                    as: "transportationMode",
                    attributes: ["id", "mode_name"],
                },
                {
                    model: GRNLine,
                    as: "lineItems",
                    required: false,
                    include: [
                        getItemIncludeConfig(),
                        {
                            model: CityMaster,
                            as: "location",
                            attributes: ["id", "city_name"],
                        },
                        {
                            model: PurchaseOrderLine,
                            as: "purchaseOrderLine",
                            attributes: ["id", "quantity", "rate", "amount", "discount_amount", "subtotal", "tax_amount", "line_total"],
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

            const normStatus = normalizeGRNStatus(existingGRN.status);
            if (normStatus !== "PENDING_RECEIPT" && normStatus !== "DRAFT") {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Cannot update GRN. Only GRNs in 'Pending Receipt' status can be edited.");
            }

            const headerPayload: any = {
                grnNo: String(header.grnNo || existingGRN.grnNo).trim(),
                purchaseOrderId: normalizeOptionalId(header.purchaseOrderId) ?? existingGRN.purchaseOrderId,
                warehouseId: normalizeOptionalId(header.warehouseId) ?? existingGRN.warehouseId,
                godownId: normalizeOptionalId(header.godownId) ?? existingGRN.godownId,
                stackId: normalizeOptionalId(header.stackId) ?? existingGRN.stackId,
                transportationModeId: normalizeOptionalId(header.transportationModeId) ?? existingGRN.transportationModeId,
                grnDate: header.grnDate ? new Date(header.grnDate) : existingGRN.grnDate,
                vehicleNo: header.hasOwnProperty("vehicleNo") ? header.vehicleNo : existingGRN.vehicleNo,
                driverName: header.hasOwnProperty("driverName") ? header.driverName : existingGRN.driverName,
                driverPhoneNo: header.hasOwnProperty("driverPhoneNo") ? header.driverPhoneNo : (header.hasOwnProperty("driverPhone") ? header.driverPhone : existingGRN.driverPhoneNo),
                memo: header.hasOwnProperty("memo") ? header.memo : existingGRN.memo,
                status: normalizeGRNStatus(header.status || existingGRN.status, "PENDING_RECEIPT"),
                remarks: header.hasOwnProperty("remarks") ? header.remarks : existingGRN.remarks,
                CompanyId,
                user_id,
            };

            if (!headerPayload.grnNo) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("grnNo is required");
            }
            if (!headerPayload.grnDate || Number.isNaN(headerPayload.grnDate.getTime())) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid grnDate is required");
            }

            const targetPoId = headerPayload.purchaseOrderId;
            let poSummary: any = null;
            const batchReceivedByPoLineId: Record<number, number> = {};

            if (targetPoId) {
                poSummary = await InventoryService.getPurchaseOrderReceiptSummary(
                    targetPoId,
                    CompanyId,
                    existingGRN.id,
                    transaction
                );

                const po = poSummary.purchaseOrder;
                if (!po) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`Referenced Purchase Order #${targetPoId} does not exist`);
                }

                if (po.isActive === false) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`Cannot update GRN for Purchase Order ${po.purchaseNo || po.id} because it is deactivated/inactive.`);
                }

                const poStatus = String(po.status || "").toUpperCase();
                if (poStatus === "DRAFT" || poStatus === "PENDING_APPROVAL") {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`Cannot update GRN for Purchase Order ${po.purchaseNo || po.id} because it is in Pending Approval status. Purchase Order must be approved first.`);
                }
                if (poStatus === "REJECTED") {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`Cannot update GRN for Purchase Order ${po.purchaseNo || po.id} because it is REJECTED.`);
                }
                if (poStatus === "CANCELLED") {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`Cannot update GRN for Purchase Order ${po.purchaseNo || po.id} because it is CANCELLED.`);
                }
            }

            await existingGRN.update(headerPayload, { transaction });

            await GRNLine.destroy({
                where: { grnHeaderId: existingGRN.id },
                transaction,
            });

            const updatedLineItems: any[] = [];
            for (let index = 0; index < lineItems.length; index++) {
                const lineItem = lineItems[index];
                let orderedQty = Number(lineItem.orderedQty);
                const receivedQty = Number(lineItem.receivedQty);
                const acceptedQty =
                    lineItem.acceptedQty !== undefined && lineItem.acceptedQty !== ""
                        ? Number(lineItem.acceptedQty)
                        : 0;
                const rejectedQty =
                    lineItem.rejectedQty !== undefined && lineItem.rejectedQty !== ""
                        ? Number(lineItem.rejectedQty)
                        : 0;

                const itemId = Number(lineItem.itemId);
                const poLineId = normalizeOptionalId(lineItem.purchaseOrderLineId);

                if (!itemId) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`itemId is required in line item ${index + 1}`);
                }
                if (!receivedQty || receivedQty <= 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`receivedQty must be greater than zero in line item ${index + 1}`);
                }
                if (acceptedQty < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`acceptedQty cannot be negative in line item ${index + 1}`);
                }
                if (rejectedQty < 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`rejectedQty cannot be negative in line item ${index + 1}`);
                }
                if (acceptedQty > receivedQty) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`acceptedQty (${acceptedQty}) cannot exceed receivedQty (${receivedQty}) in line item ${index + 1}`);
                }
                if (rejectedQty > receivedQty) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`rejectedQty (${rejectedQty}) cannot exceed receivedQty (${receivedQty}) in line item ${index + 1}`);
                }
                if (acceptedQty + rejectedQty > receivedQty) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(`The sum of acceptedQty (${acceptedQty}) and rejectedQty (${rejectedQty}) cannot exceed receivedQty (${receivedQty}) in line item ${index + 1}`);
                }

                if (lineItem.manufacturingDate && lineItem.expiryDate) {
                    const mfg = new Date(lineItem.manufacturingDate);
                    const exp = new Date(lineItem.expiryDate);
                    if (exp.getTime() < mfg.getTime()) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`expiryDate cannot be earlier than manufacturingDate in line item ${index + 1}`);
                    }
                }

                if (poSummary) {
                    const matchedSummary = poSummary.lineSummaries.find((s: any) =>
                        (poLineId && Number(s.purchaseOrderLineId) === Number(poLineId)) ||
                        (!poLineId && Number(s.itemId) === itemId)
                    );

                    if (!matchedSummary) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`Line item ${index + 1} (Item #${itemId}) does not belong to Purchase Order ${poSummary.purchaseOrder?.purchaseNo || targetPoId}`);
                    }

                    if (poLineId && Number(matchedSummary.itemId) !== itemId) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`Item mismatch for PO Line #${poLineId} in line item ${index + 1}: PO Line is for item #${matchedSummary.itemId}, but line item specifies #${itemId}`);
                    }

                    orderedQty = matchedSummary.orderedQty;

                    const priorBatchQty = batchReceivedByPoLineId[matchedSummary.purchaseOrderLineId] || 0;
                    const remainingForLine = Math.max(0, matchedSummary.remainingQty - priorBatchQty);
                    const itemName = matchedSummary.item?.item_name || matchedSummary.item?.item_code || `Item #${itemId}`;

                    if (remainingForLine <= 0) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`Item '${itemName}' (PO line #${matchedSummary.purchaseOrderLineId}) has already been fully received across existing GRN(s).`);
                    }

                    if (receivedQty > remainingForLine) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`Received quantity (${receivedQty}) exceeds remaining open quantity (${remainingForLine}) for item '${itemName}' in line item ${index + 1}. (PO Ordered: ${matchedSummary.orderedQty}, Previously Received/Drafted by Other Receipts: ${matchedSummary.previouslyReceivedQty}${priorBatchQty > 0 ? `, Current Batch: ${priorBatchQty}` : ""}).`);
                    }

                    batchReceivedByPoLineId[matchedSummary.purchaseOrderLineId] = priorBatchQty + receivedQty;

                    const uomObj = matchedSummary.uom || (lineItem.uom_id ? await UOMMaster.findByPk(lineItem.uom_id, { transaction }) : null);
                    if (uomObj && !isDecimalAllowedForUOM(uomObj)) {
                        if (receivedQty % 1 !== 0 || acceptedQty % 1 !== 0 || rejectedQty % 1 !== 0) {
                            res.status(StatusCodes.BAD_REQUEST);
                            throw new Error(`Decimals are not permitted for UOM '${uomObj.uom_name || "discrete"}' in line item ${index + 1}. Quantities must be whole numbers.`);
                        }
                    }
                } else {
                    if (!orderedQty || orderedQty <= 0) {
                        orderedQty = receivedQty;
                    }
                    if (receivedQty > orderedQty) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(`receivedQty (${receivedQty}) cannot exceed orderedQty (${orderedQty}) in line item ${index + 1}`);
                    }
                }

                const lineLocationId = normalizeOptionalId(lineItem.locationId || lineItem.location_id) || normalizeOptionalId(headerPayload.city_id || header.location_id || header.locationId);
                const linePayload: any = {
                    grnHeaderId: existingGRN.id,
                    purchaseOrderLineId: poLineId,
                    itemId,
                    locationId: lineLocationId,
                    onHand: lineItem.onHand !== undefined && lineItem.onHand !== "" ? Number(lineItem.onHand) : 0,
                    orderedQty,
                    receivedQty,
                    acceptedQty,
                    rejectedQty,
                    manufacturingDate: lineItem.manufacturingDate ? new Date(lineItem.manufacturingDate) : null,
                    expiryDate: lineItem.expiryDate ? new Date(lineItem.expiryDate) : null,
                    qcRequired: lineItem.qcRequired !== undefined ? Boolean(lineItem.qcRequired) : true,
                    status: lineItem.status || "PENDING",
                    remarks: lineItem.remarks || null,
                    CompanyId,
                    user_id,
                };

                const createdLine = await GRNLine.create(linePayload, { transaction });
                updatedLineItems.push(createdLine);
            }

            // Sync Purchase Order status based on all GRNs
            if (targetPoId) {
                await InventoryService.syncPurchaseOrderStatus(targetPoId, CompanyId, transaction);
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

        if (grn.purchaseOrderId && normalizedStatus !== "CANCELLED") {
            const po = await PurchaseOrder.findOne({ where: { id: grn.purchaseOrderId, CompanyId } });
            if (po && po.isActive === false) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error(`Cannot update status for GRN ${grn.grnNo} because referenced Purchase Order ${po.purchaseNo || po.id} is deactivated/inactive.`);
            }
        }

        // Idempotency check: if status is unchanged, return current GRN
        if (previousStatus === normalizedStatus) {
            res.status(StatusCodes.OK).json({
                success: true,
                message: "GRN status is already set to " + status,
                result: grn,
            });
            return;
        }

        const isUnpostedState = (s: string) => s === "PENDING_RECEIPT" || s === "DRAFT";
        const isPostedState = (s: string) => ["APPROVED", "RECEIVED", "PENDING_BILLING", "PENDING_BILLING_PARTIALLY_RECEIVED", "PARTIALLY_RECEIVED", "FULLY_BILLED", "CLOSED"].includes(s);

        // Managed transaction for status transition, stock, and GL updates
        await sequelize.transaction(async (t: any) => {
            await grn.update({
                status: normalizedStatus as any
            }, { transaction: t });

            // If transitioning to a received/complete state from a pending receipt state
            if (isPostedState(normalizedStatus) && isUnpostedState(previousStatus)) {
                await InventoryService.updateStockFromGRN(
                    grn.id,
                    grn.warehouseId || 1,
                    CompanyId,
                    user_id,
                    t
                );

                const parseOptionalId = (val: unknown) => (val !== undefined && val !== null && val !== "" ? Number(val) : undefined);
                const parsedVoucherTypeId = parseOptionalId(req.body.voucherTypeId ?? req.body.voucher_type_id);
                const parsedGrniAccountId = parseOptionalId(req.body.grniAccountId ?? req.body.grni_account_id);

                await GLImpactService.processGRNPosting(
                    "GRN",
                    grn.id,
                    CompanyId,
                    user_id,
                    parsedVoucherTypeId,
                    parsedGrniAccountId,
                    t
                );
            }

            // If transitioning to CANCELLED or REJECTED from an approved state
            if ((normalizedStatus === "CANCELLED" || normalizedStatus === "REJECTED") && isPostedState(previousStatus)) {
                await InventoryService.reverseStockFromGRN(
                    grn.id,
                    grn.warehouseId || 1,
                    CompanyId,
                    user_id,
                    t
                );
            }

            // Sync GRN and Purchase Order status
            if (isPostedState(normalizedStatus)) {
                await InventoryService.syncGRNStatus(grn.id, CompanyId, t);
            }
            if (grn.purchaseOrderId) {
                await InventoryService.syncPurchaseOrderStatus(grn.purchaseOrderId, CompanyId, t);
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

        const normStatus = normalizeGRNStatus(grn.status);
        if (normStatus !== "PENDING_RECEIPT" && normStatus !== "DRAFT") {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Cannot delete GRN. Only GRNs in 'Pending Receipt' status can be deleted.");
        }

        const poIdToSync = grn.purchaseOrderId;
        await GRNLine.destroy({ where: { grnHeaderId: grn.id } });
        await grn.destroy();

        if (poIdToSync) {
            await InventoryService.syncPurchaseOrderStatus(poIdToSync, CompanyId);
        }

        res.status(StatusCodes.OK).json({
            success: true,
            message: "GRN deleted successfully",
            result: null,
        });
    }),

    exportGRNCSV: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const CompanyId = company?.id;
        const { fromDate, toDate, startDate, endDate, status, purchaseOrderId, search } = req.query;

        if (!CompanyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const whereClause: any = { CompanyId };

        const fromD = startDate || fromDate;
        const toD = endDate || toDate;

        const convertDateFormat = (dateStr: string): string => {
            if (dateStr.includes("/")) {
                const parts = dateStr.split("/");
                if (parts.length === 3) {
                    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
                }
            }
            return dateStr;
        };

        if (fromD || toD) {
            const dateConditions: any = {};
            if (fromD) {
                const s = new Date(convertDateFormat(fromD as string));
                s.setHours(0, 0, 0, 0);
                dateConditions[Op.gte] = s;
            }
            if (toD) {
                const e = new Date(convertDateFormat(toD as string));
                e.setHours(23, 59, 59, 999);
                dateConditions[Op.lte] = e;
            }
            whereClause.grnDate = dateConditions;
        }

        if (status && status !== "" && status !== "ALL") {
            const statusVal = String(status).trim();
            if (statusVal === "PENDING_RECEIPT" || statusVal === "DRAFT") {
                whereClause.status = { [Op.in]: ["PENDING_RECEIPT", "DRAFT"] };
            } else if (statusVal === "APPROVED" || statusVal === "RECEIVED") {
                whereClause.status = { [Op.in]: ["APPROVED", "RECEIVED"] };
            } else if (statusVal === "CLOSED" || statusVal === "COMPLETED") {
                whereClause.status = { [Op.in]: ["CLOSED", "COMPLETED"] };
            } else if (statusVal === "FULLY_BILLED" || statusVal === "BILLED") {
                whereClause.status = { [Op.in]: ["FULLY_BILLED", "BILLED"] };
            } else if (statusVal === "PARTIALLY_RECEIVED" || statusVal === "PARTIAL_RECEIVED") {
                whereClause.status = { [Op.in]: ["PARTIALLY_RECEIVED", "PARTIAL_RECEIVED"] };
            } else {
                whereClause.status = statusVal;
            }
        }

        if (purchaseOrderId) {
            whereClause.purchaseOrderId = Number(purchaseOrderId);
        }

        if (search) {
            const searchStr = String(search).trim();
            const matchingPOs = await PurchaseOrder.findAll({
                where: {
                    CompanyId,
                    purchaseNo: { [Op.like]: `%${searchStr}%` },
                },
                attributes: ["id"],
            });
            const poIds = matchingPOs.map((p: any) => p.id);

            const searchConditions: any[] = [
                { grnNo: { [Op.like]: `%${searchStr}%` } },
                { vehicleNo: { [Op.like]: `%${searchStr}%` } },
                { driverName: { [Op.like]: `%${searchStr}%` } },
                { driverPhoneNo: { [Op.like]: `%${searchStr}%` } },
                { remarks: { [Op.like]: `%${searchStr}%` } },
            ];

            if (poIds.length > 0) {
                searchConditions.push({ purchaseOrderId: { [Op.in]: poIds } });
            }

            if (!isNaN(Number(searchStr))) {
                searchConditions.push({ id: Number(searchStr) });
            }

            whereClause[Op.or] = searchConditions;
        }

        const grns = await GRN.findAll({
            where: whereClause,
            include: [
                {
                    model: PurchaseOrder,
                    as: "purchaseOrder",
                    attributes: ["id", "purchaseNo", "vendor_id"],
                    include: [
                        {
                            model: VendorDetails,
                            as: "vendor",
                            attributes: ["id", "company_name", "first_name", "last_name", "salutation", "entity_id"],
                            required: false,
                        },
                    ],
                },
                {
                    model: TransportationMode,
                    as: "transportationMode",
                    attributes: ["id", "mode_name"],
                    required: false,
                },
                {
                    model: Warehouse,
                    as: "warehouse",
                    attributes: ["id", "name"],
                    required: false,
                },
                {
                    model: Godown,
                    as: "godown",
                    attributes: ["id", "name"],
                    required: false,
                },
                {
                    model: Stack,
                    as: "stack",
                    attributes: ["id", "name"],
                    required: false,
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
                            model: CityMaster,
                            as: "location",
                            attributes: ["id", "city_name"],
                        },
                        {
                            model: PurchaseOrderLine,
                            as: "purchaseOrderLine",
                            attributes: ["id", "quantity", "rate"],
                        },
                    ],
                },
            ],
            order: [["createdAt", "DESC"]],
        });

        const csvData: any[] = [];
        grns.forEach((grn: any) => {
            const vendorObj = grn.purchaseOrder?.vendor;
            const vendorName = vendorObj
                ? (vendorObj.company_name || [vendorObj.salutation, vendorObj.first_name, vendorObj.last_name].filter(Boolean).join(" "))
                : "";

            if (grn.lineItems && grn.lineItems.length > 0) {
                grn.lineItems.forEach((lineItem: any) => {
                    csvData.push({
                        "GRN Number": grn.grnNo || "",
                        "GRN Date": grn.grnDate ? new Date(grn.grnDate).toLocaleDateString() : "",
                        "Purchase Order": grn.purchaseOrder?.purchaseNo || "",
                        "Vendor": vendorName,
                        "Warehouse": grn.warehouse?.name || "",
                        "Godown": grn.godown?.name || "",
                        "Stack": grn.stack?.name || "",
                        "Transportation Mode": grn.transportationMode?.mode_name || "",
                        "Vehicle No": grn.vehicleNo || "",
                        "Driver Name": grn.driverName || "",
                        "Driver Phone No": grn.driverPhoneNo || "",
                        Status: grn.status || "",
                        "Header Memo": grn.memo || "",
                        "Header Remarks": grn.remarks || "",
                        "Item Code": lineItem.item?.item_code || "",
                        "Item Name": lineItem.item?.item_name || "",
                        "Location": lineItem.location?.city_name || "",
                        "On Hand Qty": lineItem.onHand || 0,
                        "Ordered Qty": lineItem.orderedQty || 0,
                        "Received Qty": lineItem.receivedQty || 0,
                        "Accepted Qty": lineItem.acceptedQty || 0,
                        "Rejected Qty": lineItem.rejectedQty || 0,
                        "Manufacturing Date": lineItem.manufacturingDate ? new Date(lineItem.manufacturingDate).toLocaleDateString() : "",
                        "Expiry Date": lineItem.expiryDate ? new Date(lineItem.expiryDate).toLocaleDateString() : "",
                        "QC Required": lineItem.qcRequired ? "YES" : "NO",
                        "Line Status": lineItem.status || "",
                        "Line Remarks": lineItem.remarks || "",
                    });
                });
            } else {
                csvData.push({
                    "GRN Number": grn.grnNo || "",
                    "GRN Date": grn.grnDate ? new Date(grn.grnDate).toLocaleDateString() : "",
                    "Purchase Order": grn.purchaseOrder?.purchaseNo || "",
                    "Vendor": vendorName,
                    "Warehouse": grn.warehouse?.name || "",
                    "Godown": grn.godown?.name || "",
                    "Stack": grn.stack?.name || "",
                    "Transportation Mode": grn.transportationMode?.mode_name || "",
                    "Vehicle No": grn.vehicleNo || "",
                    "Driver Name": grn.driverName || "",
                    "Driver Phone No": grn.driverPhoneNo || "",
                    Status: grn.status || "",
                    "Header Memo": grn.memo || "",
                    "Header Remarks": grn.remarks || "",
                    "Item Code": "",
                    "Item Name": "",
                    "Location": "",
                    "On Hand Qty": 0,
                    "Ordered Qty": 0,
                    "Received Qty": 0,
                    "Accepted Qty": 0,
                    "Rejected Qty": 0,
                    "Manufacturing Date": "",
                    "Expiry Date": "",
                    "QC Required": "",
                    "Line Status": "",
                    "Line Remarks": "",
                });
            }
        });

        const headers = csvData.length > 0 ? Object.keys(csvData[0]) : [
            "GRN Number",
            "GRN Date",
            "Purchase Order",
            "Vendor",
            "Warehouse",
            "Godown",
            "Stack",
            "Transportation Mode",
            "Vehicle No",
            "Driver Name",
            "Driver Phone No",
            "Status",
            "Header Memo",
            "Header Remarks",
            "Item Code",
            "Item Name",
            "Location",
            "On Hand Qty",
            "Ordered Qty",
            "Received Qty",
            "Accepted Qty",
            "Rejected Qty",
            "Manufacturing Date",
            "Expiry Date",
            "QC Required",
            "Line Status",
            "Line Remarks",
        ];

        const csvContent = [
            headers.join(","),
            ...csvData.map((row) =>
                headers
                    .map((header) => {
                        const value = row[header];
                        if (value === null || value === undefined) {
                            return '""';
                        }
                        const stringValue = String(value);
                        if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n") || stringValue.includes("\r")) {
                            return `"${stringValue.replace(/"/g, '""')}"`;
                        }
                        return stringValue;
                    })
                    .join(",")
            ),
        ].join("\n");

        const filename = `grn_export_${new Date().toISOString().split("T")[0]}.csv`;
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.status(StatusCodes.OK).send(csvContent);
    }),
};

export default GRNController;