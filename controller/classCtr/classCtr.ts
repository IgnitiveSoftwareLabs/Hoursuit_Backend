import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { CustomRequest } from "../../typeRequest/customReq";
import ClassMaster from "../../modals/masters/class/classMaster";
import SubsidiaryMaster from "../../modals/masters/subsidiaries/subsdiaryMaster";
import { findCompanyForUser } from "../../utils/findCompanyForUser";

const ClassController = {
    createClass: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { class_name, subsidiary_id, isActive } = req.body;
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

        const classRecord = await ClassMaster.create({
            class_name,
            subsidiary_id: subsidiary_id ? Number(subsidiary_id) : null,
            CompanyId: company.id,
            user_id: userId,
            isActive: isActive !== undefined ? isActive : true,
        });

        res.status(StatusCodes.CREATED).json({
            message: "Class created successfully",
            success: true,
            result: classRecord,
        });
    }),

    getClasses: asyncHandler(async (req: CustomRequest, res: Response) => {
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

        const classes = await ClassMaster.findAll({
            where: { CompanyId: company.id },
            include: [
                { association: "company", attributes: ["id", "name"] },
                {
                    association: "subsidiary",
                    attributes: ["id", "subsidiary_name"],
                },
            ],
        });

        res.status(StatusCodes.OK).json({
            message: "Classes fetched successfully",
            success: true,
            result: classes,
        });
    }),

    getClassById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid class ID is required");
        }

        const classRecord = await ClassMaster.findByPk(Number(id), {
            include: [
                { association: "company", attributes: ["id", "name"] },
                {
                    association: "subsidiary",
                    attributes: ["id", "subsidiary_name"],
                },
            ],
        });

        if (!classRecord) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Class not found");
        }

        res.status(StatusCodes.OK).json({
            message: "Class fetched successfully",
            success: true,
            result: classRecord,
        });
    }),

    updateClass: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { class_name, subsidiary_id, isActive } = req.body;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid class ID is required");
        }

        const classRecord = await ClassMaster.findByPk(Number(id));
        if (!classRecord) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Class not found");
        }

        const company = await findCompanyForUser(req.user);
        if (!company || classRecord.CompanyId !== company.id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Unauthorized: Cannot modify class for this company");
        }

        if (class_name !== undefined) classRecord.class_name = class_name;
        if (subsidiary_id !== undefined) classRecord.subsidiary_id = subsidiary_id ? Number(subsidiary_id) : null;
        if (isActive !== undefined) classRecord.isActive = isActive;

        await classRecord.save();

        res.status(StatusCodes.OK).json({
            message: "Class updated successfully",
            success: true,
            result: classRecord,
        });
    }),

    deleteClass: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid class ID is required");
        }

        const classRecord = await ClassMaster.findByPk(Number(id));
        if (!classRecord) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Class not found");
        }

        const company = await findCompanyForUser(req.user);
        if (!company || classRecord.CompanyId !== company.id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Unauthorized: Cannot delete class for this company");
        }

        await classRecord.destroy();

        res.status(StatusCodes.OK).json({
            message: "Class deleted successfully",
            success: true,
            result: null,
        });
    }),
};

export default ClassController;
