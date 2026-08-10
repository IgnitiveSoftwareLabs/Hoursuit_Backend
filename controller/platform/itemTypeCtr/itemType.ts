import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { CustomRequest } from "../../../typeRequest/customReq";
import ItemTypeMaster from "../../../modals/platform/itemType/itemType";

const ItemTypeController = {
    createItemType: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { item_type_name, description, isActive } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const itemType = await ItemTypeMaster.create({
            item_type_name,
            description: description !== undefined ? description : null,
            user_id: userId,
            isActive: isActive !== undefined ? isActive : true,
        });

        res.status(StatusCodes.CREATED).json({
            message: "Item Type created successfully",
            success: true,
            result: itemType,
        });
    }),

    getItemTypes: asyncHandler(async (req: CustomRequest, res: Response) => {
        const userId = req.user?.id;
        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const items = await ItemTypeMaster.findAll({
            include: [
                { association: "user", attributes: ["id", "FirstName", "LastName", "Email"] },
            ],
        });

        res.status(StatusCodes.OK).json({
            message: "Item Types fetched successfully",
            success: true,
            result: items,
        });
    }),

    getItemTypeById: asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const { id } = req.params;
            const userId = req.user?.id;
            if (!id || isNaN(Number(id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid Item Type ID is required");
            }
            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            const item = await ItemTypeMaster.findByPk(Number(id), {
                include: [
                    { association: "user", attributes: ["id", "FirstName", "LastName", "email"] },
                ],
            });
            if (!item) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Item Type not found");
            }

            res.status(StatusCodes.OK).json({
                message: "Item Type fetched successfully",
                success: true,
                result: item,
            });
        }
    ),

    updateItemType: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { item_type_name, description, isActive } = req.body;
        const userId = req.user?.id;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid Item Type ID is required");
        }
        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const item = await ItemTypeMaster.findByPk(Number(id));
        if (!item) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Item Type not found");
        }

        item.item_type_name = item_type_name ?? item.item_type_name;
        item.description = description !== undefined ? description : item.description;
        item.user_id = userId;
        item.isActive = isActive !== undefined ? isActive : item.isActive;

        await item.save();

        res.status(StatusCodes.OK).json({
            message: "Item Type updated successfully",
            success: true,
            result: item,
        });
    }),

    deleteItemType: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid Item Type ID is required");
        }
        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const item = await ItemTypeMaster.findByPk(Number(id));
        if (!item) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Item Type not found");
        }

        await item.destroy();

        res.status(StatusCodes.OK).json({
            message: "Item Type deleted successfully",
            success: true,
            result: null,
        });
    }),
};

export default ItemTypeController;