import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { CustomRequest } from "../../typeRequest/customReq";
import ChartOfAccountMaster from "../../modals/masters/chartOfAccount/chartOfAccount";
import { findCompanyForUser } from "../../utils/findCompanyForUser";

const ChartController = {
    createChartAccount: asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const {
                account_number,
                account_name,
                account_type_id,
                subsidiary_id,
                parent_account_number,
                currency_id,
                isActive,
            } = req.body;
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

            const item = await ChartOfAccountMaster.create({
                account_number,
                account_name,
                account_type_id,
                // allow subsidiary_id to be optional/null
                subsidiary_id:
                    subsidiary_id === undefined || subsidiary_id === ""
                        ? null
                        : subsidiary_id,
                parent_account_number: parent_account_number ?? null,
                currency_id,
                CompanyId: company.id,
                user_id: userId,
                isActive: isActive !== undefined ? isActive : true,
            });

            res.status(StatusCodes.CREATED).json({
                message: "Chart account created successfully",
                success: true,
                result: item,
            });
        }
    ),

    getChartAccounts: asyncHandler(async (req: CustomRequest, res: Response) => {
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

        const items = await ChartOfAccountMaster.findAll({
            where: { CompanyId: company.id },
            include: [
                { association: "accountType", attributes: ["id", "account_type_name"] },
                { association: "subsidiary", attributes: ["id", "subsidiary_name"] },
                {
                    association: "currency",
                    attributes: ["id", "currency_name", "currency_code"],
                },
            ],
        });

        res.status(StatusCodes.OK).json({
            message: "Chart accounts fetched successfully",
            success: true,
            result: items,
        });
    }),

    getChartAccountById: asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const { id } = req.params;
            const userId = req.user?.id;
            if (!id || isNaN(Number(id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid Chart Account ID is required");
            }
            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            const item = await ChartOfAccountMaster.findByPk(Number(id), {
                include: [
                    {
                        association: "accountType",
                        attributes: ["id", "account_type_name"],
                    },
                    { association: "subsidiary", attributes: ["id", "subsidiary_name"] },
                    {
                        association: "currency",
                        attributes: ["id", "currency_name", "currency_code"],
                    },
                ],
            });

            if (!item) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Chart account not found");
            }

            res.status(StatusCodes.OK).json({
                message: "Chart account fetched successfully",
                success: true,
                result: item,
            });
        }
    ),

    updateChartAccount: asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const { id } = req.params;
            const {
                account_number,
                account_name,
                account_type_id,
                subsidiary_id,
                parent_account_number,
                currency_id,
                isActive,
            } = req.body;
            const userId = req.user?.id;
            if (!id || isNaN(Number(id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid Chart Account ID is required");
            }
            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            const item = await ChartOfAccountMaster.findByPk(Number(id));
            if (!item) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Chart account not found");
            }

            const company = await findCompanyForUser(req.user);
            if (!company || item.CompanyId !== company.id) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error(
                    "Unauthorized: Cannot modify Chart Account for this company"
                );
            }

            item.account_number = account_number ?? item.account_number;
            item.account_name = account_name ?? item.account_name;
            item.account_type_id = account_type_id ?? item.account_type_id;
            item.subsidiary_id =
                subsidiary_id === undefined
                    ? item.subsidiary_id
                    : subsidiary_id === ""
                        ? null
                        : subsidiary_id;
            item.parent_account_number =
                parent_account_number ?? item.parent_account_number;
            item.currency_id = currency_id ?? item.currency_id;
            item.isActive = isActive !== undefined ? isActive : item.isActive;

            await item.save();

            res.status(StatusCodes.OK).json({
                message: "Chart account updated successfully",
                success: true,
                result: item,
            });
        }
    ),

    deleteChartAccount: asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const { id } = req.params;
            const userId = req.user?.id;
            if (!id || isNaN(Number(id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid Chart Account ID is required");
            }
            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            const item = await ChartOfAccountMaster.findByPk(Number(id));
            if (!item) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Chart account not found");
            }

            const company = await findCompanyForUser(req.user);
            if (!company || item.CompanyId !== company.id) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error(
                    "Unauthorized: Cannot delete Chart Account for this company"
                );
            }

            await item.destroy();

            res.status(StatusCodes.OK).json({
                message: "Chart account deleted successfully",
                success: true,
                result: null,
            });
        }
    ),
};

export default ChartController;