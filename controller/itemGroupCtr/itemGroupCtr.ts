import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";

import SubsidiaryMaster from "../../modals/masters/subsidiaries/subsdiaryMaster";
import ItemGroupMaster from "../../modals/masters/itemGroup/itemGroup";
import { findCompanyForUser } from "../../utils/findCompanyForUser";
import { CustomRequest } from "../../typeRequest/customReq";

const ItemGroupController = {
    // Create item group
    createItemGroup: asyncHandler(async (req: CustomRequest, res: Response) => {
        try {
            const {
                item_group_code,
                item_group_name,
                subsidiary_id,
                base_rate,
                isActive
            } = req.body;

            const userId = req.user?.id;

            // Validate required fields
            if (!item_group_code || !item_group_name) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Item group code and name are required");
            }

            // Validate user authentication
            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            // Verify company ownership
            const company = await findCompanyForUser(req.user);

            if (!company) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("Unauthorized or invalid company");
            }

            const itemGroup = await ItemGroupMaster.create({
                item_group_code,
                item_group_name,
                base_rate: base_rate || 0,
                subsidiary_id: subsidiary_id || null,
                CompanyId: Number(company.id),
                user_id: Number(userId),
                isActive: isActive !== undefined ? isActive : true,
            });

            res.status(StatusCodes.CREATED).json({
                message: "Item group created successfully",
                success: true,
                result: itemGroup,
            });
        } catch (error: any) {
            throw new Error(error.message);
        }
    }),

    // Get all item groups for a company
    getItemGroups: asyncHandler(async (req: CustomRequest, res: Response) => {
        try {
            const userId = req.user?.id;

            // Validate user authentication
            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            const company = await findCompanyForUser(req.user);

            // Validate company existence
            if (!company) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("Unauthorized or invalid company");
            }

            const itemGroups = await ItemGroupMaster.findAll({
                where: { CompanyId: Number(company.id) },
                include: [
                    {
                        model: SubsidiaryMaster,
                        as: "subsidiary",
                        attributes: ["id", "subsidiary_name"],
                    },
                ],
                order: [["createdAt", "DESC"]],
            });

            res.status(StatusCodes.OK).json({
                message: "Item groups fetched successfully",
                success: true,
                result: itemGroups,
            });
        } catch (error: any) {
            throw new Error(error.message);
        }
    }),

    // Get single item group by ID
    getItemGroupById: asyncHandler(async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            // Validate input
            if (!id || isNaN(Number(id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid item group ID is required");
            }

            // Validate user authentication
            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            const company = await findCompanyForUser(req.user);

            if (!company) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("Unauthorized or invalid company");
            }

            const itemGroup = await ItemGroupMaster.findOne({
                where: {
                    id: Number(id),
                    CompanyId: Number(company.id)
                },
                include: [
                    {
                        model: SubsidiaryMaster,
                        as: "subsidiary",
                        attributes: ["id", "subsidiary_name", "subsidiary_code"],
                    },
                ],
            });

            if (!itemGroup) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Item group not found or unauthorized");
            }

            res.status(StatusCodes.OK).json({
                message: "Item group fetched successfully",
                success: true,
                result: itemGroup,
            });
        } catch (error: any) {
            throw new Error(error.message);
        }
    }),

    // Update item group by ID
    updateItemGroup: asyncHandler(async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            // Validate input
            if (!id || isNaN(Number(id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid item group ID is required");
            }

            // Validate user authentication
            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            // Verify company ownership
            const company = await findCompanyForUser(req.user);

            if (!company) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("Unauthorized or invalid company");
            }

            const itemGroup = await ItemGroupMaster.findOne({
                where: {
                    id: Number(id),
                    CompanyId: Number(company.id)
                }
            });

            if (!itemGroup) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Item group not found");
            }

            // Validate and filter update fields
            const { item_group_code, item_group_name, base_rate, subsidiary_id, isActive } = req.body;
            const updateData: Partial<any> = {};

            if (item_group_code !== undefined) updateData.item_group_code = item_group_code;
            if (item_group_name !== undefined) updateData.item_group_name = item_group_name;
            if (base_rate !== undefined) updateData.base_rate = base_rate;
            if (subsidiary_id !== undefined) updateData.subsidiary_id = subsidiary_id || null;
            if (isActive !== undefined) updateData.isActive = isActive;

            await itemGroup.update(updateData);

            res.status(StatusCodes.OK).json({
                message: "Item group updated successfully",
                success: true,
                result: itemGroup,
            });
        } catch (error: any) {
            throw new Error(error.message);
        }
    }),

    // Delete item group by ID
    deleteItemGroup: asyncHandler(async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            // Validate input
            if (!id || isNaN(Number(id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid item group ID is required");
            }

            // Validate user authentication
            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            // Verify company ownership
            const company = await findCompanyForUser(req.user);

            if (!company) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("Unauthorized or invalid company");
            }

            const itemGroup = await ItemGroupMaster.findOne({
                where: {
                    id: Number(id),
                    CompanyId: Number(company.id)
                }
            });

            if (!itemGroup) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Item group not found");
            }

            await itemGroup.destroy();

            res.status(StatusCodes.OK).json({
                message: "Item group deleted successfully",
                success: true,
                result: null,
            });
        } catch (error: any) {
            throw new Error(error.message);
        }
    }),
};

export default ItemGroupController;