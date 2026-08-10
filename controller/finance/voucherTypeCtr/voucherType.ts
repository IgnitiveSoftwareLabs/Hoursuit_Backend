import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { CustomRequest } from "../../../typeRequest/customReq";
import { findCompanyForUser } from "../../../utils/findCompanyForUser";
import VoucherTypeMaster from "../../../modals/finance/voucherType";

const VoucherTypeController = {
    createVoucherType: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { code, name, description, isActive } = req.body;
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

        const voucherType = await VoucherTypeMaster.create({
            code,
            name,
            description: description ?? null,
            CompanyId: company.id,
            user_id: userId,
            isActive: isActive !== undefined ? isActive : true,
        });

        res.status(StatusCodes.CREATED).json({
            message: "Voucher type created successfully",
            success: true,
            result: voucherType,
        });
    }),

    getVoucherTypes: asyncHandler(async (req: CustomRequest, res: Response) => {
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

        const voucherTypes = await VoucherTypeMaster.findAll({
            where: { CompanyId: company.id },
            order: [["name", "ASC"]],
        });

        res.status(StatusCodes.OK).json({
            message: "Voucher types fetched successfully",
            success: true,
            result: voucherTypes,
        });
    }),

    getVoucherTypeById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid voucher type ID is required");
        }
        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const company = await findCompanyForUser(req.user);
        if (!company) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Unauthorized: Company not found for user");
        }

        const voucherType = await VoucherTypeMaster.findOne({
            where: { id: Number(id), CompanyId: company.id },
        });
        if (!voucherType) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Voucher type not found");
        }

        res.status(StatusCodes.OK).json({
            message: "Voucher type fetched successfully",
            success: true,
            result: voucherType,
        });
    }),

    updateVoucherType: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { code, name, description, isActive } = req.body;
        const userId = req.user?.id;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid voucher type ID is required");
        }
        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const company = await findCompanyForUser(req.user);
        if (!company) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Unauthorized: Company not found for user");
        }

        const voucherType = await VoucherTypeMaster.findOne({
            where: { id: Number(id), CompanyId: company.id },
        });
        if (!voucherType) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Voucher type not found");
        }

        voucherType.code = code ?? voucherType.code;
        voucherType.name = name ?? voucherType.name;
        voucherType.description = description ?? voucherType.description;
        voucherType.isActive = isActive !== undefined ? isActive : voucherType.isActive;
        voucherType.user_id = userId;

        await voucherType.save();

        res.status(StatusCodes.OK).json({
            message: "Voucher type updated successfully",
            success: true,
            result: voucherType,
        });
    }),

    deleteVoucherType: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid voucher type ID is required");
        }
        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const company = await findCompanyForUser(req.user);
        if (!company) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Unauthorized: Company not found for user");
        }

        const voucherType = await VoucherTypeMaster.findOne({
            where: { id: Number(id), CompanyId: company.id },
        });
        if (!voucherType) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Voucher type not found");
        }

        await voucherType.destroy();

        res.status(StatusCodes.OK).json({
            message: "Voucher type deleted successfully",
            success: true,
            result: null,
        });
    }),
};

export default VoucherTypeController;
