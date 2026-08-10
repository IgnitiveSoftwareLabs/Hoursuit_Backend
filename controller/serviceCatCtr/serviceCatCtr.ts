import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { CustomRequest } from "../../typeRequest/customReq";
import ServiceCategory from "../../modals/masters/serviceCategory/serviceCatMaster";
import SubsidiaryMaster from "../../modals/masters/subsidiaries/subsdiaryMaster";
import { findCompanyForUser } from "../../utils/findCompanyForUser";

const ServiceCategoryController = {
    createServiceCategory: asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const { category_name, isActive, subsidiary_id } = req.body;
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

            // If subsidiary_id is provided, validate it belongs to the same company
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

            const serviceCategory = await ServiceCategory.create({
                category_name,
                CompanyId: company.id,
                user_id: userId,
                isActive: isActive !== undefined ? isActive : true,
                subsidiary_id: validatedSubsidiaryId,
            });

            res.status(StatusCodes.CREATED).json({
                message: "Service category created successfully",
                success: true,
                result: serviceCategory,
            });
        }
    ),

    getServiceCategories: asyncHandler(
        async (req: CustomRequest, res: Response) => {
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

            const categories = await ServiceCategory.findAll({
                where: { CompanyId: company.id },
                include: [
                    { association: "subsidiary", attributes: ["id", "subsidiary_name"] },
                ],
            });

            res.status(StatusCodes.OK).json({
                message: "Service categories fetched successfully",
                success: true,
                result: categories,
            });
        }
    ),

    getServiceCategoryById: asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const { id } = req.params;
            const userId = req.user?.id;

            if (!id || isNaN(Number(id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid service category ID is required");
            }

            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            const category = await ServiceCategory.findByPk(Number(id), {
                include: [
                    { association: "company", attributes: ["id", "name"] },
                    { association: "user", attributes: ["id", "username", "email"] },
                    { association: "subsidiary", attributes: ["id", "subsidiary_name"] },
                ],
            });

            if (!category) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Service category not found");
            }

            res.status(StatusCodes.OK).json({
                message: "Service category fetched successfully",
                success: true,
                result: category,
            });
        }
    ),

    updateServiceCategory: asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const { id } = req.params;
            const { category_name, isActive, subsidiary_id } = req.body;
            const userId = req.user?.id;

            if (!id || isNaN(Number(id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid service category ID is required");
            }

            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            const category = await ServiceCategory.findByPk(Number(id));
            if (!category) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Service category not found");
            }

            // Validate subsidiary if provided
            if (subsidiary_id !== undefined) {
                if (subsidiary_id === null || String(subsidiary_id).trim() === "") {
                    category.subsidiary_id = null;
                } else {
                    if (isNaN(Number(subsidiary_id))) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error("Invalid subsidiary_id provided");
                    }
                    const company = await findCompanyForUser(req.user);
                    if (!company) {
                        res.status(StatusCodes.UNAUTHORIZED);
                        throw new Error("Unauthorized: Company not found for user");
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

            category.category_name = category_name ?? category.category_name;
            category.isActive = isActive !== undefined ? isActive : category.isActive;

            await category.save();

            res.status(StatusCodes.OK).json({
                message: "Service category updated successfully",
                success: true,
                result: category,
            });
        }
    ),

    deleteServiceCategory: asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const { id } = req.params;
            const userId = req.user?.id;

            if (!id || isNaN(Number(id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid service category ID is required");
            }

            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            const category = await ServiceCategory.findByPk(Number(id));
            if (!category) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Service category not found");
            }

            await category.destroy();

            res.status(StatusCodes.OK).json({
                message: "Service category deleted successfully",
                success: true,
                result: null,
            });
        }
    ),
};

export default ServiceCategoryController;