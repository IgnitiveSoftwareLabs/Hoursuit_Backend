import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { CustomRequest } from "../../typeRequest/customReq";
import SubsidiaryMaster from "../../modals/masters/subsidiaries/subsdiaryMaster";
import { findCompanyForUser } from "../../utils/findCompanyForUser";

const SubsidiaryController = {
    createSubsidiary: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { subsidiary_name, currency_id, parent_subsidiary_id, isActive } =
            req.body;
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

        const parentValue =
            parent_subsidiary_id === ""
                ? null
                : parent_subsidiary_id === undefined
                    ? null
                    : parent_subsidiary_id;

        const subsidiary = await SubsidiaryMaster.create({
            subsidiary_name,
            currency_id,
            parent_subsidiary_id: parentValue,
            CompanyId: company.id,
            user_id: userId,
            isActive: isActive !== undefined ? isActive : true,
        });

        res.status(StatusCodes.CREATED).json({
            message: "Subsidiary created successfully",
            success: true,
            result: subsidiary,
        });
    }),

    getSubsidiaries: asyncHandler(async (req: CustomRequest, res: Response) => {
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

        const subsidiaries = await SubsidiaryMaster.findAll({
            where: { CompanyId: company.id },
            include: [
                { association: "company", attributes: ["id", "name"] },
                {
                    association: "currency",
                    attributes: ["id", "currency_name", "currency_code"],
                },
                {
                    association: "parentSubsidiary",
                    attributes: ["id", "subsidiary_name"],
                },
            ],
        });

        res.status(StatusCodes.OK).json({
            message: "Subsidiaries fetched successfully",
            success: true,
            result: subsidiaries,
        });
    }),

    getSubsidiaryById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid subsidiary ID is required");
        }

        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const subsidiary = await SubsidiaryMaster.findByPk(Number(id), {
            include: [
                { association: "company", attributes: ["id", "name"] },
                {
                    association: "currency",
                    attributes: ["id", "currency_name", "currency_code"],
                },
                {
                    association: "parentSubsidiary",
                    attributes: ["id", "subsidiary_name"],
                },
            ],
        });

        if (!subsidiary) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Subsidiary not found");
        }

        res.status(StatusCodes.OK).json({
            message: "Subsidiary fetched successfully",
            success: true,
            result: subsidiary,
        });
    }),

    updateSubsidiary: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { subsidiary_name, currency_id, parent_subsidiary_id, isActive } =
            req.body;
        const userId = req.user?.id;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid subsidiary ID is required");
        }

        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const subsidiary = await SubsidiaryMaster.findByPk(Number(id));
        if (!subsidiary) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Subsidiary not found");
        }

        // Company scoping: ensure updating only within same company
        const company = await findCompanyForUser(req.user);
        if (!company || subsidiary.CompanyId !== company.id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error(
                "Unauthorized: Cannot modify subsidiary for this company"
            );
        }

        const parentValue =
            parent_subsidiary_id === ""
                ? null
                : parent_subsidiary_id !== undefined
                    ? parent_subsidiary_id
                    : subsidiary.parent_subsidiary_id;

        subsidiary.subsidiary_name = subsidiary_name ?? subsidiary.subsidiary_name;
        subsidiary.currency_id = currency_id ?? subsidiary.currency_id;
        subsidiary.parent_subsidiary_id = parentValue as any;
        subsidiary.isActive =
            isActive !== undefined ? isActive : subsidiary.isActive;

        await subsidiary.save();

        res.status(StatusCodes.OK).json({
            message: "Subsidiary updated successfully",
            success: true,
            result: subsidiary,
        });
    }),

    deleteSubsidiary: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid subsidiary ID is required");
        }

        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const subsidiary = await SubsidiaryMaster.findByPk(Number(id));
        if (!subsidiary) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Subsidiary not found");
        }

        // Company scoping: ensure deleting only within same company
        const company = await findCompanyForUser(req.user);
        if (!company || subsidiary.CompanyId !== company.id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error(
                "Unauthorized: Cannot delete subsidiary for this company"
            );
        }

        await subsidiary.destroy();

        res.status(StatusCodes.OK).json({
            message: "Subsidiary deleted successfully",
            success: true,
            result: null,
        });
    }),
};

export default SubsidiaryController;