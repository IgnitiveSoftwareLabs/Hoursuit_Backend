import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { CustomRequest } from "../../typeRequest/customReq";
import Category from "../../modals/masters/category/category";
import SubsidiaryMaster from "../../modals/masters/subsidiaries/subsdiaryMaster";
import { findCompanyForUser } from "../../utils/findCompanyForUser";

const categoryController = {
    // Create a new category
    createCategory: asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const { item_category_name, isActive, subsidiary_id } = req.body;
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
                String(subsidiary_id).trim() !== ""
            ) {
                if (isNaN(Number(subsidiary_id))) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error("Invalid subsidiary_id provided");
                }
                const subsidiary = await SubsidiaryMaster.findByPk(
                    Number(subsidiary_id)
                );
                if (!subsidiary || subsidiary.CompanyId !== company.id) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error(
                        "Invalid subsidiary: not found or not part of your company"
                    );
                }
                validatedSubsidiaryId = subsidiary.id;
            }

            const category = await Category.create({
                item_category_name,
                CompanyId: company.id,
                user_id: userId,
                isActive: isActive !== undefined ? isActive : true,
                subsidiary_id: validatedSubsidiaryId,
            });

            res.status(StatusCodes.CREATED).json({
                message: "category created successfully",
                success: true,
                result: category,
            });
        }
    ),

    // Get all categories for authenticated user's company
    getCategories: asyncHandler(async (req: CustomRequest, res: Response) => {
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

        const categories = await Category.findAll({
            where: { CompanyId: company.id },
            include: [
                { association: "subsidiary", attributes: ["id", "subsidiary_name"] },
            ],
        });

        res.status(StatusCodes.OK).json({
            message: "Work categories fetched successfully",
            success: true,
            result: categories,
        });
    }),

    // Get a single work category by ID
    getCategoryById: asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const { id } = req.params;
            const userId = req.user?.id;

            if (!id || isNaN(Number(id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid work category ID is required");
            }

            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            const category = await Category.findByPk(Number(id), {
                include: [
                    { association: "subsidiary", attributes: ["id", "subsidiary_name"] },
                ],
            });

            if (!category) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Category not found");
            }

            res.status(StatusCodes.OK).json({
                message: "Category fetched successfully",
                success: true,
                result: category,
            });
        }
    ),

    // Update a work category
    updateCategory: asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const { id } = req.params;
            const { item_category_name, isActive, subsidiary_id } = req.body;
            const userId = req.user?.id;

            if (!id || isNaN(Number(id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid work category ID is required");
            }

            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            const category = await Category.findByPk(Number(id));
            if (!category) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Category not found");
            }

            // validate and update subsidiary if provided
            const company = await findCompanyForUser(req.user);
            if (!company || category.CompanyId !== company.id) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error(
                    "Unauthorized: Cannot modify Category for this company"
                );
            }

            if (subsidiary_id !== undefined) {
                if (subsidiary_id === null || String(subsidiary_id).trim() === "") {
                    category.subsidiary_id = null;
                } else {
                    if (isNaN(Number(subsidiary_id))) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error("Invalid subsidiary_id provided");
                    }
                    const subsidiary = await SubsidiaryMaster.findByPk(
                        Number(subsidiary_id)
                    );
                    if (!subsidiary || subsidiary.CompanyId !== company.id) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error(
                            "Invalid subsidiary: not found or not part of your company"
                        );
                    }
                    category.subsidiary_id = subsidiary.id;
                }
            }

            // Update only provided fields
            if (item_category_name)
                category.item_category_name = item_category_name;
            if (isActive !== undefined) category.isActive = isActive;

            await category.save();

            res.status(StatusCodes.OK).json({
                message: "Work category updated successfully",
                success: true,
                result: category,
            });
        }
    ),

    // Delete a work category
    deleteCategory: asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const { id } = req.params;
            const userId = req.user?.id;

            if (!id || isNaN(Number(id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid work category ID is required");
            }

            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            const category = await Category.findByPk(Number(id));
            if (!category) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Category not found");
            }

            await category.destroy();

            res.status(StatusCodes.OK).json({
                message: "Category deleted successfully",
                success: true,
                result: null,
            });
        }
    ),
};

export default categoryController;