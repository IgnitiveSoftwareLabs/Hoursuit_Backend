import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { CustomRequest } from "../../typeRequest/customReq";
import MISTypeMaster from "../../modals/masters/MisType/MistType";
import SubsidiaryMaster from "../../modals/masters/subsidiaries/subsdiaryMaster";
import { findCompanyForUser } from "../../utils/findCompanyForUser";

const MISTypeController = {
    createMISType: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { mis_type_name, isActive, subsidiary_id } = req.body;
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
            const subsidiary = await SubsidiaryMaster.findByPk(Number(subsidiary_id));
            if (!subsidiary || subsidiary.CompanyId !== company.id) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error(
                    "Invalid subsidiary: not found or not part of your company"
                );
            }
            validatedSubsidiaryId = subsidiary.id;
        }

        const mistype = await MISTypeMaster.create({
            mis_type_name,
            CompanyId: company.id,
            user_id: userId,
            isActive: isActive !== undefined ? isActive : true,
            subsidiary_id: validatedSubsidiaryId,
        });

        res.status(StatusCodes.CREATED).json({
            message: "MIS Type created successfully",
            success: true,
            result: mistype,
        });
    }),

    getMISTypes: asyncHandler(async (req: CustomRequest, res: Response) => {
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

        const items = await MISTypeMaster.findAll({
            where: { CompanyId: company.id },
            include: [
                { association: "subsidiary", attributes: ["id", "subsidiary_name"] },
            ],
        });
        res.status(StatusCodes.OK).json({
            message: "MIS Types fetched successfully",
            success: true,
            result: items,
        });
    }),

    getMISTypeById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid MIS Type ID is required");
        }

        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const item = await MISTypeMaster.findByPk(Number(id), {
            include: [
                { association: "subsidiary", attributes: ["id", "subsidiary_name"] },
            ],
        });
        if (!item) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("MIS Type not found");
        }

        res.status(StatusCodes.OK).json({
            message: "MIS Type fetched successfully",
            success: true,
            result: item,
        });
    }),

    updateMISType: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { mis_type_name, isActive, subsidiary_id } = req.body;
        const userId = req.user?.id;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid MIS Type ID is required");
        }

        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const item = await MISTypeMaster.findByPk(Number(id));
        if (!item) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("MIS Type not found");
        }

        const company = await findCompanyForUser(req.user);
        if (!company || item.CompanyId !== company.id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Unauthorized: Cannot modify MIS Type for this company");
        }

        // validate subsidiary if provided
        if (subsidiary_id !== undefined) {
            if (subsidiary_id === null || String(subsidiary_id).trim() === "") {
                item.subsidiary_id = null;
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
                item.subsidiary_id = subsidiary.id;
            }
        }

        item.mis_type_name = mis_type_name ?? item.mis_type_name;
        item.isActive = isActive !== undefined ? isActive : item.isActive;

        await item.save();

        res.status(StatusCodes.OK).json({
            message: "MIS Type updated successfully",
            success: true,
            result: item,
        });
    }),

    deleteMISType: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid MIS Type ID is required");
        }

        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const item = await MISTypeMaster.findByPk(Number(id));
        if (!item) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("MIS Type not found");
        }

        const company = await findCompanyForUser(req.user);
        if (!company || item.CompanyId !== company.id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Unauthorized: Cannot delete MIS Type for this company");
        }

        await item.destroy();

        res.status(StatusCodes.OK).json({
            message: "MIS Type deleted successfully",
            success: true,
            result: null,
        });
    }),
};

export default MISTypeController;