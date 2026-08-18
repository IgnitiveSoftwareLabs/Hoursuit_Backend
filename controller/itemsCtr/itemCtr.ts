import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";

import SubsidiaryMaster from "../../modals/masters/subsidiaries/subsdiaryMaster";
import { findCompanyForUser } from "../../utils/findCompanyForUser";
import ItemMaster from "../../modals/masters/items/itemMaster";
import { CustomRequest } from "../../typeRequest/customReq";
import UOMMaster from "../../modals/masters/UOM/UOMMaster";
import HSNSACMaster from "../../modals/masters/HSN-SAC/HSNSACMaster";
import ChartOfAccountMaster from "../../modals/masters/chartOfAccount/chartOfAccount";
import ItemTypeMaster from "../../modals/platform/itemType/itemType";

const ItemMasterController = {
    // Create new item
    createItem: asyncHandler(async (req: CustomRequest, res: Response) => {
        const {
            item_code,
            item_name,
            item_desc,
            item_type,
            item_type_id,
            track_inventory,
            sku,
            barcode,
            cost_price,
            min_stock_level,
            hsn_sac_code_id,
            uom_id,
            default_rate,
            subsidiary_id,
            asset_account_id,
            income_account_id,
            cogs_account_id,
            expense_account_id,
        } = req.body;

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

        // validate subsidiary if provided
        let validatedSubsidiaryId: number | null = null;
        if (
            subsidiary_id !== undefined &&
            subsidiary_id !== null &&
            String(subsidiary_id) !== ""
        ) {
            if (isNaN(Number(subsidiary_id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Invalid subsidiary_id");
            }
            const sub = await SubsidiaryMaster.findOne({
                where: { id: Number(subsidiary_id), CompanyId: company.id },
            });
            if (!sub) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Subsidiary not found for this company");
            }
            validatedSubsidiaryId = Number(subsidiary_id);
        }

        const resolvedItemTypeId = item_type_id !== undefined && item_type_id !== null && String(item_type_id) !== ""
            ? Number(item_type_id)
            : (item_type !== undefined && item_type !== null && String(item_type) !== "" && !isNaN(Number(item_type))
                ? Number(item_type)
                : null);

        const item = await ItemMaster.create({
            item_code,
            item_name,
            item_desc,
            item_type_id: resolvedItemTypeId,
            track_inventory,
            sku,
            barcode,
            cost_price,
            min_stock_level,
            hsn_sac_code_id,
            uom_id,
            default_rate,
            subsidiary_id: validatedSubsidiaryId,
            asset_account_id,
            income_account_id,
            cogs_account_id,
            expense_account_id,
            isActive: true,
        });

        res.status(StatusCodes.CREATED).json({
            message: "Item created successfully",
            success: true,
            result: item,
        });
    }),

    // Get all items for the authenticated user's company
    getItems: asyncHandler(async (req: CustomRequest, res: Response) => {
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

        const items = await ItemMaster.findAll({
            include: [
                {
                    model: UOMMaster,
                    as: "uom",
                    attributes: ["id", "uom_name"],
                },
                {
                    model: HSNSACMaster,
                    as: "hsnSacCode",
                    attributes: ["id", "code", "type"],
                },
                {
                    model: SubsidiaryMaster,
                    as: "subsidiary",
                    attributes: ["id", "subsidiary_name"],
                },
                {
                    model: ItemTypeMaster,
                    as: "item_type",
                    attributes: ["id", "item_type_name"],
                },
                {
                    model: ChartOfAccountMaster,
                    as: "asset_account",
                    attributes: ["id", "account_number", "account_name"],
                    include: [{ association: "accountType", attributes: ["id", "account_type_name"] }],
                },
                {
                    model: ChartOfAccountMaster,
                    as: "income_account",
                    attributes: ["id", "account_number", "account_name"],
                    include: [{ association: "accountType", attributes: ["id", "account_type_name"] }],
                },
                {
                    model: ChartOfAccountMaster,
                    as: "cogs_account",
                    attributes: ["id", "account_number", "account_name"],
                    include: [{ association: "accountType", attributes: ["id", "account_type_name"] }],
                },
                {
                    model: ChartOfAccountMaster,
                    as: "expense_account",
                    attributes: ["id", "account_number", "account_name"],
                    include: [{ association: "accountType", attributes: ["id", "account_type_name"] }],
                },
            ],
        });

        res.status(StatusCodes.OK).json({
            message: "Items fetched successfully",
            success: true,
            result: items,
        });
    }),

    // Get a single item by ID
    getItemById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid item ID is required");
        }

        const item = await ItemMaster.findByPk(Number(id), {
            include: [
                {
                    model: UOMMaster,
                    as: "uom",
                    attributes: ["id", "uom_name"],
                },
                {
                    model: HSNSACMaster,
                    as: "hsnSacCode",
                    attributes: ["id", "code", "type"],
                },
                {
                    model: SubsidiaryMaster,
                    as: "subsidiary",
                    attributes: ["id", "subsidiary_name"],
                },
                {
                    model: ItemTypeMaster,
                    as: "item_type",
                    attributes: ["id", "item_type_name"],
                },
                {
                    model: ChartOfAccountMaster,
                    as: "asset_account",
                    attributes: ["id", "account_number", "account_name"],
                    include: [{ association: "accountType", attributes: ["id", "account_type_name"] }],
                },
                {
                    model: ChartOfAccountMaster,
                    as: "income_account",
                    attributes: ["id", "account_number", "account_name"],
                    include: [{ association: "accountType", attributes: ["id", "account_type_name"] }],
                },
                {
                    model: ChartOfAccountMaster,
                    as: "cogs_account",
                    attributes: ["id", "account_number", "account_name"],
                    include: [{ association: "accountType", attributes: ["id", "account_type_name"] }],
                },
                {
                    model: ChartOfAccountMaster,
                    as: "expense_account",
                    attributes: ["id", "account_number", "account_name"],
                    include: [{ association: "accountType", attributes: ["id", "account_type_name"] }],
                },
            ],
        });

        if (!item) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Item not found");
        }

        res.status(StatusCodes.OK).json({
            message: "Item fetched successfully",
            success: true,
            result: item,
        });
    }),

    // Update item
    updateItem: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const {
            item_code,
            item_name,
            item_desc,
            item_type,
            item_type_id,
            hsn_sac_code_id,
            track_inventory,
            sku,
            barcode,
            cost_price,
            min_stock_level,
            uom_id,
            default_rate,
            subsidiary_id,
            asset_account_id,
            income_account_id,
            cogs_account_id,
            expense_account_id,
            isActive,
        } = req.body;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid item ID is required");
        }

        const item = await ItemMaster.findByPk(Number(id));
        if (!item) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Item not found");
        }

        // Update fields (nullable and optional handled properly)
        if (item_code !== undefined) item.item_code = item_code;
        if (item_name !== undefined) item.item_name = item_name;
        if (item_desc !== undefined) item.item_desc = item_desc || null;
        const rawItemTypeId = item_type_id !== undefined ? item_type_id : item_type;
        if (rawItemTypeId !== undefined) {
            if (rawItemTypeId === null || String(rawItemTypeId) === "") {
                item.item_type_id = null;
            } else if (!isNaN(Number(rawItemTypeId))) {
                item.item_type_id = Number(rawItemTypeId);
            }
        }
        if (track_inventory !== undefined) item.track_inventory = track_inventory;
        if (sku !== undefined) item.sku = sku || null;
        if (barcode !== undefined) item.barcode = barcode || null;
        if (cost_price !== undefined) item.cost_price = cost_price || null;
        if (min_stock_level !== undefined) item.min_stock_level = min_stock_level || null;
        if (hsn_sac_code_id !== undefined)
            item.hsn_sac_code_id = hsn_sac_code_id || null;
        if (uom_id !== undefined) item.uom_id = uom_id;
        if (default_rate !== undefined) item.default_rate = default_rate ?? null;
        if (asset_account_id !== undefined) item.asset_account_id = asset_account_id ?? null;
        if (income_account_id !== undefined) item.income_account_id = income_account_id ?? null;
        if (cogs_account_id !== undefined) item.cogs_account_id = cogs_account_id ?? null;
        if (expense_account_id !== undefined) item.expense_account_id = expense_account_id ?? null;
        if (subsidiary_id !== undefined) {
            if (subsidiary_id === null || String(subsidiary_id) === "") {
                item.subsidiary_id = null;
            } else {
                if (isNaN(Number(subsidiary_id))) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error("Invalid subsidiary_id");
                }
                const company = await findCompanyForUser(req.user);
                const sub = await SubsidiaryMaster.findOne({
                    where: { id: Number(subsidiary_id), CompanyId: company?.id },
                });
                if (!sub) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error("Subsidiary not found for this company");
                }
                item.subsidiary_id = Number(subsidiary_id);
            }
        }
        if (isActive !== undefined) item.isActive = isActive;

        await item.save();

        res.status(StatusCodes.OK).json({
            message: "Item updated successfully",
            success: true,
            result: item,
        });
    }),

    // Delete item
    deleteItem: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid item ID is required");
        }

        const item = await ItemMaster.findByPk(Number(id));
        if (!item) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Item not found");
        }

        await item.destroy();

        res.status(StatusCodes.OK).json({
            message: "Item deleted successfully",
            success: true,
            result: null,
        });
    }),
};

export default ItemMasterController;