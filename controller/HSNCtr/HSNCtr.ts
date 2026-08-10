import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { CustomRequest } from "../../typeRequest/customReq";
import HSNSACMaster from "../../modals/masters/HSN-SAC/HSNSACMaster";
import SubsidiaryMaster from "../../modals/masters/subsidiaries/subsdiaryMaster";
import { findCompanyForUser } from "../../utils/findCompanyForUser";

const HSNSACMasterController = {
    // Create new HSN/SAC code
    createHSNSAC: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { code, type, description, taxPercentage, subsidiary_id } = req.body;
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

        // Validate request body

        // Check for duplicate code in company
        const existing = await HSNSACMaster.findOne({
            where: { code, CompanyId: company.id },
        });
        if (existing) {
            res.status(StatusCodes.CONFLICT);
            throw new Error("HSN/SAC code already exists for this company");
        }

        // If subsidiary_id provided, verify it belongs to the company
        if (subsidiary_id) {
            const sub = await SubsidiaryMaster.findOne({
                where: { id: subsidiary_id, CompanyId: company.id },
            });
            if (!sub) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Invalid subsidiary_id for this company");
            }
        }

        const hsnsac = await HSNSACMaster.create({
            code,
            type,
            description,
            taxPercentage,
            subsidiary_id: subsidiary_id || null,
            CompanyId: company.id,
            user_id: userId,
            isActive: true,
        });

        res.status(StatusCodes.CREATED).json({
            message: "HSN/SAC code created successfully",
            success: true,
            result: hsnsac,
        });
    }),

    // Get all HSN/SAC codes for user's company
    getHSNSACs: asyncHandler(async (req: CustomRequest, res: Response) => {
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

        const hsnsacs = await HSNSACMaster.findAll({
            where: { CompanyId: company.id },
            include: [
                "company",
                "user",
                { model: SubsidiaryMaster, as: "subsidiary" },
            ],
            order: [["createdAt", "DESC"]],
        });

        res.status(StatusCodes.OK).json({
            message: "HSN/SAC codes fetched successfully",
            success: true,
            result: hsnsacs,
        });
    }),

    // Get a single HSN/SAC by ID
    getHSNSACById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid HSN/SAC ID is required");
        }

        const hsnsac = await HSNSACMaster.findByPk(Number(id), {
            include: [
                "company",
                "user",
                { model: SubsidiaryMaster, as: "subsidiary" },
            ],
        });

        if (!hsnsac) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("HSN/SAC code not found");
        }

        res.status(StatusCodes.OK).json({
            message: "HSN/SAC code fetched successfully",
            success: true,
            result: hsnsac,
        });
    }),

    // Update HSN/SAC code
    updateHSNSAC: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { code, type, description, isActive, taxPercentage, subsidiary_id } =
            req.body;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid HSN/SAC ID is required");
        }

        const hsnsac = await HSNSACMaster.findByPk(Number(id));
        if (!hsnsac) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("HSN/SAC code not found");
        }

        if (code !== undefined) hsnsac.code = code;
        if (type !== undefined) hsnsac.type = type;
        if (description !== undefined) hsnsac.description = description;
        if (isActive !== undefined) hsnsac.isActive = isActive;
        if (taxPercentage !== undefined) hsnsac.taxPercentage = taxPercentage;
        if (subsidiary_id !== undefined) {
            if (subsidiary_id === null || subsidiary_id === "") {
                hsnsac.subsidiary_id = null;
            } else {
                // verify subsidiary belongs to company
                const sub = await SubsidiaryMaster.findOne({
                    where: { id: subsidiary_id, CompanyId: hsnsac.CompanyId },
                });
                if (!sub) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error("Invalid subsidiary_id for this company");
                }
                hsnsac.subsidiary_id = subsidiary_id;
            }
        }

        await hsnsac.save();

        res.status(StatusCodes.OK).json({
            message: "HSN/SAC code updated successfully",
            success: true,
            result: hsnsac,
        });
    }),

    // Delete HSN/SAC code
    deleteHSNSAC: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid HSN/SAC ID is required");
        }

        const hsnsac = await HSNSACMaster.findByPk(Number(id));
        if (!hsnsac) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("HSN/SAC code not found");
        }

        await hsnsac.destroy();

        res.status(StatusCodes.OK).json({
            message: "HSN/SAC code deleted successfully",
            success: true,
            result: null,
        });
    }),
};

export default HSNSACMasterController;