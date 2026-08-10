import { Response } from "express";
import { CustomRequest } from "../../typeRequest/customReq";

import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import PanAvailibility from "../../modals/masters/panAvailibility/panAvailibility";
import { findCompanyForUser } from "../../utils/findCompanyForUser";

const PanAvailibilityController = {
    createPanAvailibility: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        if (!company) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Unauthorized or invalid company");
        }

        const userId = req.user?.id;
        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const { name } = req.body;
        
        const existing = await PanAvailibility.findOne({
            where: {
                name,
                CompanyId: company.id,
            },
        });

        if (existing) {
            res.status(StatusCodes.CONFLICT);
            throw new Error("PAN availability with this name already exists for this company");
        }

        const panAvailibility = await PanAvailibility.create({
            name,
            CompanyId: company.id,
            user_id: userId,
            isActive: true,
        });

        res.status(StatusCodes.CREATED).json({
            message: "PAN availability created successfully",
            success: true,
            result: panAvailibility,
        });
    }),

    getAllPanAvailibilities: asyncHandler(async (req: CustomRequest, res: Response) => {
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

        const records = await PanAvailibility.findAll({
            order: [["name", "ASC"]],
        });

        res.status(StatusCodes.OK).json({
            message: "PAN availability records fetched successfully",
            success: true,
            result: records,
        });
    }),

    getPanAvailibilityById: asyncHandler(async (req: CustomRequest, res: Response) => {
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

        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid PAN availability ID is required");
        }

        const record = await PanAvailibility.findByPk(Number(id));
        if (!record) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("PAN availability record not found");
        }

        res.status(StatusCodes.OK).json({
            message: "PAN availability record fetched successfully",
            success: true,
            result: record,
        });
    }),

    updatePanAvailibility: asyncHandler(async (req: CustomRequest, res: Response) => {
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

        const { id } = req.params;
        const { name, isActive } = req.body;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid PAN availability ID is required");
        }

        const record = await PanAvailibility.findByPk(Number(id));
        if (!record) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("PAN availability record not found");
        }

        if (name !== undefined) {
            record.name = name;
            const conflict = await PanAvailibility.findOne({
                where: {
                    name: record.name,
                    CompanyId: record.CompanyId,
                    id: { [Op.ne]: record.id },
                },
            });
            if (conflict) {
                res.status(StatusCodes.CONFLICT);
                throw new Error("PAN availability with this name already exists for this company");
            }
        }

        if (isActive !== undefined) {
            record.isActive = isActive;
        }

        await record.save();

        res.status(StatusCodes.OK).json({
            message: "PAN availability record updated successfully",
            success: true,
            result: record,
        });
    }),

    deletePanAvailibility: asyncHandler(async (req: CustomRequest, res: Response) => {
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
        
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid PAN availability ID is required");
        }

        const record = await PanAvailibility.findByPk(Number(id));
        if (!record) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("PAN availability record not found");
        }

        await record.destroy();

        res.status(StatusCodes.OK).json({
            message: "PAN availability record deleted successfully",
            success: true,
            result: null,
        });
    }),
};

export default PanAvailibilityController;