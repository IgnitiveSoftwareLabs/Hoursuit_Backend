import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";

import TransportationMode from "../../modals/masters/transportMode/transportMode";
import SubsidiaryMaster from "../../modals/masters/subsidiaries/subsdiaryMaster";
import { findCompanyForUser } from "../../utils/findCompanyForUser";
import { CustomRequest } from "../../typeRequest/customReq";

const TransportationModeController = {
    // Create a new transportation mode
    createTransportationMode: asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const { mode_name, subsidiary_id, isActive } = req.body;
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

            // Validate and attach subsidiary if provided
            let validatedSubsidiaryId: number | null = null;
            if (
                subsidiary_id !== undefined &&
                subsidiary_id !== null &&
                subsidiary_id !== ""
            ) {
                const sub = await SubsidiaryMaster.findByPk(Number(subsidiary_id));
                if (!sub || sub.CompanyId !== company.id) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error("Invalid subsidiary for this company");
                }
                validatedSubsidiaryId = Number(subsidiary_id);
            }

            const mode = await TransportationMode.create({
                mode_name,
                company_id: company.id,
                subsidiary_id: validatedSubsidiaryId,
                user_id: userId,
                isActive: isActive !== undefined ? isActive : true,
            });

            res.status(StatusCodes.CREATED).json({
                message: "Transportation mode created successfully",
                success: true,
                result: mode,
            });
        }
    ),

    // Get all transportation modes for the authenticated user's company
    getTransportationModes: asyncHandler(
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

            const modes = await TransportationMode.findAll({
                where: { company_id: company.id },
                include: [
                    { association: "company", attributes: ["id", "name"] },
                    { association: "subsidiary", attributes: ["id", "subsidiary_name"] },
                ],
            });

            res.status(StatusCodes.OK).json({
                message: "Transportation modes fetched successfully",
                success: true,
                result: modes,
            });
        }
    ),

    // Get a single transportation mode by ID
    getTransportationModeById: asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const { id } = req.params;
            const userId = req.user?.id;

            if (!id || isNaN(Number(id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid transportation mode ID is required");
            }

            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            const mode = await TransportationMode.findByPk(Number(id), {
                include: [
                    { association: "company", attributes: ["id", "name"] },
                    { association: "subsidiary", attributes: ["id", "subsidiary_name"] },
                ],
            });

            if (!mode) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Transportation mode not found");
            }

            res.status(StatusCodes.OK).json({
                message: "Transportation mode fetched successfully",
                success: true,
                result: mode,
            });
        }
    ),

    // Update a transportation mode
    updateTransportationMode: asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const { id } = req.params;
            const { mode_name, subsidiary_id, isActive } = req.body;
            const userId = req.user?.id;

            if (!id || isNaN(Number(id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid transportation mode ID is required");
            }

            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            const mode = await TransportationMode.findByPk(Number(id));
            if (!mode) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Transportation mode not found");
            }

            // Validate and prepare subsidiary if provided
            let validatedSubsidiaryId: number | null = mode.subsidiary_id ?? null;
            if (subsidiary_id !== undefined) {
                if (subsidiary_id === null || subsidiary_id === "") {
                    validatedSubsidiaryId = null;
                } else {
                    const sub = await SubsidiaryMaster.findByPk(Number(subsidiary_id));
                    if (!sub || sub.CompanyId !== mode.company_id) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error("Invalid subsidiary for this company");
                    }
                    validatedSubsidiaryId = Number(subsidiary_id);
                }
            }

            // Prepare updated data
            const updatedData = {
                mode_name: mode_name ?? mode.mode_name,
                company_id: mode.company_id,
                subsidiary_id: validatedSubsidiaryId,
                user_id: mode.user_id,
                isActive: isActive !== undefined ? isActive : mode.isActive,
                id: mode.id,
            };

            mode.mode_name = updatedData.mode_name;
            mode.subsidiary_id = updatedData.subsidiary_id;
            mode.isActive = updatedData.isActive;

            await mode.save();

            res.status(StatusCodes.OK).json({
                message: "Transportation mode updated successfully",
                success: true,
                result: mode,
            });
        }
    ),

    // Delete a transportation mode
    deleteTransportationMode: asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const { id } = req.params;
            const userId = req.user?.id;

            if (!id || isNaN(Number(id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid transportation mode ID is required");
            }

            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            const mode = await TransportationMode.findByPk(Number(id));
            if (!mode) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Transportation mode not found");
            }

            await mode.destroy();

            res.status(StatusCodes.OK).json({
                message: "Transportation mode deleted successfully",
                success: true,
                result: null,
            });
        }
    ),
};

export default TransportationModeController;