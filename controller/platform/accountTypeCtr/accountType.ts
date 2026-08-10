import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { CustomRequest } from "../../../typeRequest/customReq";
import AccountTypeMaster from "../../../modals/platform/accountType/accountType";

const AccountTypeController = {
    createAccountType: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { account_type_name, mis_type_id, isActive } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const accountType = await AccountTypeMaster.create({
            account_type_name,
            mis_type_id,
            user_id: userId,
            isActive: isActive !== undefined ? isActive : true,
        });

        res.status(StatusCodes.CREATED).json({
            message: "Account Type created successfully",
            success: true,
            result: accountType,
        });
    }),

    getAccountTypes: asyncHandler(async (req: CustomRequest, res: Response) => {
        const userId = req.user?.id;
        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const items = await AccountTypeMaster.findAll({
            include: [
                { association: "misType", attributes: ["id", "mis_type_name"] },
                { association: "user", attributes: ["id", "FirstName", "LastName", "Email"] },
            ],
        });
        res.status(StatusCodes.OK).json({
            message: "Account Types fetched successfully",
            success: true,
            result: items,
        });
    }),

    getAccountTypeById: asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const { id } = req.params;
            const userId = req.user?.id;
            if (!id || isNaN(Number(id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid Account Type ID is required");
            }
            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            const item = await AccountTypeMaster.findByPk(Number(id), {
                include: [
                    { association: "misType", attributes: ["id", "mis_type_name"] },
                    { association: "user", attributes: ["id", "FirstName", "LastName", "Email"] },
                ],
            });
            if (!item) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Account Type not found");
            }

            res.status(StatusCodes.OK).json({
                message: "Account Type fetched successfully",
                success: true,
                result: item,
            });
        }
    ),

    updateAccountType: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { account_type_name, mis_type_id, isActive } = req.body;
        const userId = req.user?.id;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid Account Type ID is required");
        }
        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const item = await AccountTypeMaster.findByPk(Number(id));
        if (!item) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Account Type not found");
        }

        item.account_type_name = account_type_name ?? item.account_type_name;
        item.mis_type_id = mis_type_id ?? item.mis_type_id;
        item.user_id = userId;
        item.isActive = isActive !== undefined ? isActive : item.isActive;

        await item.save();

        res.status(StatusCodes.OK).json({
            message: "Account Type updated successfully",
            success: true,
            result: item,
        });
    }),

    deleteAccountType: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid Account Type ID is required");
        }
        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const item = await AccountTypeMaster.findByPk(Number(id));
        if (!item) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Account Type not found");
        }

        await item.destroy();

        res.status(StatusCodes.OK).json({
            message: "Account Type deleted successfully",
            success: true,
            result: null,
        });
    }),
};

export default AccountTypeController;