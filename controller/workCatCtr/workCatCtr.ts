import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { CustomRequest } from "../../typeRequest/customReq";
import WorkCategory from "../../modals/masters/workCategory/workCatMaster";
import SubsidiaryMaster from "../../modals/masters/subsidiaries/subsdiaryMaster";
import { findCompanyForUser } from "../../utils/findCompanyForUser";

const WorkCategoryController = {
    // Create a new work category
    createWorkCategory: asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const { work_category_name, isActive, subsidiary_id } = req.body;
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

            const workCategory = await WorkCategory.create({
                work_category_name,
                CompanyId: company.id,
                user_id: userId,
                isActive: isActive !== undefined ? isActive : true,
                subsidiary_id: validatedSubsidiaryId,
            });

            res.status(StatusCodes.CREATED).json({
                message: "Work category created successfully",
                success: true,
                result: workCategory,
            });
        }
    ),

    // Get all work categories for authenticated user's company
    getWorkCategories: asyncHandler(async (req: CustomRequest, res: Response) => {
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

        const categories = await WorkCategory.findAll({
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
    getWorkCategoryById: asyncHandler(
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

            const workCategory = await WorkCategory.findByPk(Number(id), {
                include: [
                    { association: "subsidiary", attributes: ["id", "subsidiary_name"] },
                ],
            });

            if (!workCategory) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Work category not found");
            }

            res.status(StatusCodes.OK).json({
                message: "Work category fetched successfully",
                success: true,
                result: workCategory,
            });
        }
    ),

    // Update a work category
    updateWorkCategory: asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const { id } = req.params;
            const { work_category_name, isActive, subsidiary_id } = req.body;
            const userId = req.user?.id;

            if (!id || isNaN(Number(id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid work category ID is required");
            }

            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            const workCategory = await WorkCategory.findByPk(Number(id));
            if (!workCategory) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Work category not found");
            }

            // validate and update subsidiary if provided
            const company = await findCompanyForUser(req.user);
            if (!company || workCategory.CompanyId !== company.id) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error(
                    "Unauthorized: Cannot modify Work Category for this company"
                );
            }

            if (subsidiary_id !== undefined) {
                if (subsidiary_id === null || String(subsidiary_id).trim() === "") {
                    workCategory.subsidiary_id = null;
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
                    workCategory.subsidiary_id = subsidiary.id;
                }
            }

            // Update only provided fields
            if (work_category_name)
                workCategory.work_category_name = work_category_name;
            if (isActive !== undefined) workCategory.isActive = isActive;

            await workCategory.save();

            res.status(StatusCodes.OK).json({
                message: "Work category updated successfully",
                success: true,
                result: workCategory,
            });
        }
    ),

    // Delete a work category
    deleteWorkCategory: asyncHandler(
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

            const workCategory = await WorkCategory.findByPk(Number(id));
            if (!workCategory) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Work category not found");
            }

            await workCategory.destroy();

            res.status(StatusCodes.OK).json({
                message: "Work category deleted successfully",
                success: true,
                result: null,
            });
        }
    ),
};

export default WorkCategoryController;