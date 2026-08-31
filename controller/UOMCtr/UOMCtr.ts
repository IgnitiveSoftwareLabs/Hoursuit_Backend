import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";

import SubsidiaryMaster from "../../modals/masters/subsidiaries/subsdiaryMaster";
import { findCompanyForUser } from "../../utils/findCompanyForUser";
import { CustomRequest } from "../../typeRequest/customReq";
import UOMMaster from "../../modals/masters/UOM/UOMMaster";

const UOMMasterController = {
    // Create new UOM
    createUOM: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { uom_name, subsidiary_id, allow_decimals } = req.body;
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

        const existingUOM = await UOMMaster.findOne({
            where: { uom_name, CompanyId: company.id },
        });

        if (existingUOM) {
            res.status(StatusCodes.CONFLICT);
            throw new Error("UOM with this name already exists in your company");
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

        const uom = await UOMMaster.create({
            uom_name,
            subsidiary_id: subsidiary_id || null,
            allow_decimals: allow_decimals !== undefined ? Boolean(allow_decimals) : true,
            CompanyId: company.id,
            user_id: userId,
            isActive: true,
        });

        res.status(StatusCodes.CREATED).json({
            message: "UOM created successfully",
            success: true,
            result: uom,
        });
    }),

    // Get all UOMs for user's company
    getUOMs: asyncHandler(async (req: CustomRequest, res: Response) => {
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

        const uoms = await UOMMaster.findAll({
            where: { CompanyId: company.id },
            include: [
                "company",
                "user",
                { model: SubsidiaryMaster, as: "subsidiary" },
            ],
            order: [["createdAt", "DESC"]],
        });

        res.status(StatusCodes.OK).json({
            message: "UOMs fetched successfully",
            success: true,
            result: uoms,
        });
    }),

    // Get single UOM by id
    getUOMById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid UOM ID is required");
        }

        const uom = await UOMMaster.findByPk(Number(id), {
            include: [
                "company",
                "user",
                { model: SubsidiaryMaster, as: "subsidiary" },
            ],
        });

        if (!uom) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("UOM not found");
        }

        res.status(StatusCodes.OK).json({
            message: "UOM fetched successfully",
            success: true,
            result: uom,
        });
    }),

    // Update UOM
    updateUOM: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { uom_name, isActive, subsidiary_id, allow_decimals } = req.body;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid UOM ID is required");
        }

        const uom = await UOMMaster.findByPk(Number(id));
        if (!uom) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("UOM not found");
        }

        // Update fields if provided
        if (uom_name) uom.uom_name = uom_name;
        if (isActive !== undefined) uom.isActive = isActive;
        if (allow_decimals !== undefined) uom.allow_decimals = Boolean(allow_decimals);
        if (subsidiary_id !== undefined) {
            if (subsidiary_id === null || subsidiary_id === "") {
                uom.subsidiary_id = null;
            } else {
                const sub = await SubsidiaryMaster.findOne({
                    where: { id: subsidiary_id, CompanyId: uom.CompanyId },
                });
                if (!sub) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error("Invalid subsidiary_id for this company");
                }
                uom.subsidiary_id = subsidiary_id;
            }
        }

        await uom.save();

        res.status(StatusCodes.OK).json({
            message: "UOM updated successfully",
            success: true,
            result: uom,
        });
    }),

    // Delete UOM
    deleteUOM: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid UOM ID is required");
        }

        const uom = await UOMMaster.findByPk(Number(id));
        if (!uom) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("UOM not found");
        }

        await uom.destroy();

        res.status(StatusCodes.OK).json({
            message: "UOM deleted successfully",
            success: true,
            result: null,
        });
    }),
};

export default UOMMasterController;