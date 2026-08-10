import { Response } from "express";
import { CustomRequest } from "../../typeRequest/customReq";

import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import PaymentMethod from "../../modals/masters/paymentMethod/paymentMethod";
import { findCompanyForUser } from "../../utils/findCompanyForUser";

const PaymentMethodController = {
    createPaymentMethod: asyncHandler(async (req: CustomRequest, res: Response) => {
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
        
        const { name } = req.body;

        const existing = await PaymentMethod.findOne({
            where: {
                name,
                CompanyId: company.id,
            },
        });

        if (existing) {
            res.status(StatusCodes.CONFLICT);
            throw new Error("Payment method with this name already exists for this company");
        }

        const paymentMethod = await PaymentMethod.create({
            name,
            CompanyId: company.id,
            user_id: userId,
            isActive: true,
        });

        res.status(StatusCodes.CREATED).json({
            message: "Payment method created successfully",
            success: true,
            result: paymentMethod,
        });
    }),

    getAllPaymentMethods: asyncHandler(async (req: CustomRequest, res: Response) => {
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

        const methods = await PaymentMethod.findAll({
            order: [["name", "ASC"]],
        });

        res.status(StatusCodes.OK).json({
            message: "Payment methods fetched successfully",
            success: true,
            result: methods,
        });
    }),

    getPaymentMethodById: asyncHandler(async (req: CustomRequest, res: Response) => {
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
            throw new Error("Valid payment method ID is required");
        }

        const method = await PaymentMethod.findByPk(Number(id));
        if (!method) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Payment method not found");
        }

        res.status(StatusCodes.OK).json({
            message: "Payment method fetched successfully",
            success: true,
            result: method,
        });
    }),

    updatePaymentMethod: asyncHandler(async (req: CustomRequest, res: Response) => {
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
            throw new Error("Valid payment method ID is required");
        }

        const method = await PaymentMethod.findByPk(Number(id));
        if (!method) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Payment method not found");
        }

        if (name !== undefined) {
            method.name = name;
            const conflict = await PaymentMethod.findOne({
                where: {
                    name: method.name,
                    CompanyId: method.CompanyId,
                    id: { [Op.ne]: method.id },
                },
            });
            if (conflict) {
                res.status(StatusCodes.CONFLICT);
                throw new Error("Payment method with this name already exists for this company");
            }
        }

        if (isActive !== undefined) {
            method.isActive = isActive;
        }

        await method.save();

        res.status(StatusCodes.OK).json({
            message: "Payment method updated successfully",
            success: true,
            result: method,
        });
    }),

    deletePaymentMethod: asyncHandler(async (req: CustomRequest, res: Response) => {
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
            throw new Error("Valid payment method ID is required");
        }

        const method = await PaymentMethod.findByPk(Number(id));
        if (!method) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Payment method not found");
        }

        await method.destroy();

        res.status(StatusCodes.OK).json({
            message: "Payment method deleted successfully",
            success: true,
            result: null,
        });
    }),
};

export default PaymentMethodController;