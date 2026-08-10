import { Response } from "express";
import { CustomRequest } from "../../typeRequest/customReq";

import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import RegistrationType from "../../modals/masters/registrationType/registrationType";
import { findCompanyForUser } from "../../utils/findCompanyForUser";

const RegistrationTypeController = {
    // Create new registration type
    createRegistrationType: asyncHandler(async (req: CustomRequest, res: Response) => {
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

        const { registration_type } = req.body

        const existingType = await RegistrationType.findOne({
            where: {
                registration_type,
                CompanyId:company.id,
            },
        });

        if (existingType) {
            res.status(StatusCodes.CONFLICT);
            throw new Error("Registration type with this name already exists");
        }

        // Create registration type
        const type = await RegistrationType.create({
            registration_type,
            CompanyId: company.id,
            user_id: userId,
            isActive: true,
        });

        res.status(StatusCodes.CREATED).json({
            message: "Registration type created successfully",
            success: true,
            result: type,
        });
    }),

    // Get all registration types
    getAllRegistrationTypes: asyncHandler(async (req: CustomRequest, res: Response) => {
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

        const types = await RegistrationType.findAll({
            order: [["registration_type", "ASC"]],
        });

        res.status(StatusCodes.OK).json({
            message: "Registration types fetched successfully",
            success: true,
            result: types,
        });
    }),

    // Get registration type by ID
    getRegistrationTypeById: asyncHandler(async (req: CustomRequest, res: Response) => {
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
            throw new Error("Valid Registration Type ID is required");
        }

        const type = await RegistrationType.findByPk(Number(id), {
            order: [["registration_type", "ASC"]],
        });

        if (!type) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Registration type not found");
        }

        res.status(StatusCodes.OK).json({
            message: "Registration type fetched successfully",
            success: true,
            result: type,
        });
    }),

    // Update Registration Type
    updateRegistrationType: asyncHandler(async (req: CustomRequest, res: Response) => {
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
        const { registration_type, isActive } = req.body as {
            registration_type?: string;
            isActive?: boolean;
        };

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid Registration Type ID is required");
        }

        const type = await RegistrationType.findByPk(Number(id));
        if (!type) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Registration type not found");
        }

        if (registration_type !== undefined) {
            type.registration_type = registration_type;
        }

        if (isActive !== undefined) {
            type.isActive = isActive;
        }

        // Check duplicate registration type
        const conflict = await RegistrationType.findOne({
            where: {
                registration_type: type.registration_type,
                CompanyId: type.CompanyId,
                id: { [Op.ne]: type.id },
            },
        });
        if (conflict) {
            res.status(StatusCodes.CONFLICT);
            throw new Error("Registration type with this name already exists");
        }

        await type.save();

        res.status(StatusCodes.OK).json({
            message: "Registration type updated successfully",
            success: true,
            result: type,
        });
    }),

    // Delete Registration Type
    deleteRegistrationType: asyncHandler(async (req: CustomRequest, res: Response) => {
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
            throw new Error("Valid Registration Type ID is required");
        }

        const type = await RegistrationType.findByPk(Number(id));
        if (!type) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Registration type not found");
        }

        await type.destroy();

        res.status(StatusCodes.OK).json({
            message: "Registration type deleted successfully",
            success: true,
            result: null,
        });
    }),
};

export default RegistrationTypeController;