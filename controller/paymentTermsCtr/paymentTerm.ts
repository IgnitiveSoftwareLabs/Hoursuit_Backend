import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import PaymentTerm from "../../modals/masters/paymentTerms/paymentTerm";
import { findCompanyForUser } from "../../utils/findCompanyForUser";
import { CustomRequest } from "../../typeRequest/customReq";

const defaultTerms: { name: string; term_type: "STANDARD" | "DATE_DRIVEN"; days_till_net_due: number; discount_percent: number; days_till_discount_expires: number }[] = [
    { name: "Net 30", term_type: "STANDARD", days_till_net_due: 30, discount_percent: 0, days_till_discount_expires: 0 },
    { name: "Net 15", term_type: "STANDARD", days_till_net_due: 15, discount_percent: 0, days_till_discount_expires: 0 },
    { name: "Net 60", term_type: "STANDARD", days_till_net_due: 60, discount_percent: 0, days_till_discount_expires: 0 },
    { name: "Due on Receipt", term_type: "STANDARD", days_till_net_due: 0, discount_percent: 0, days_till_discount_expires: 0 },
    { name: "2% 10 Net 30", term_type: "STANDARD", days_till_net_due: 30, discount_percent: 2, days_till_discount_expires: 10 },
    { name: "1% 10 Net 30", term_type: "STANDARD", days_till_net_due: 30, discount_percent: 1, days_till_discount_expires: 10 },
    { name: "Cash on Delivery (COD)", term_type: "STANDARD", days_till_net_due: 0, discount_percent: 0, days_till_discount_expires: 0 },
];

const PaymentTermController = {
    createPaymentTerm: asyncHandler(async (req: CustomRequest, res: Response) => {
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

        await PaymentTerm.sync();

        const {
            name,
            term_type = "STANDARD",
            days_till_net_due,
            discount_percent,
            days_till_discount_expires,
            day_of_month_net_due,
            due_next_month_if_within_days,
            date_discount_percent,
            day_discount_expires,
            is_installment = false,
            is_preferred = false,
            isActive = true,
        } = req.body;

        if (!name || !name.trim()) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Term name is required");
        }

        const existing = await PaymentTerm.findOne({
            where: {
                name: name.trim(),
                CompanyId: company.id,
            },
        });

        if (existing) {
            res.status(StatusCodes.CONFLICT);
            throw new Error("Payment term with this name already exists");
        }

        const newTerm = await PaymentTerm.create({
            name: name.trim(),
            term_type,
            days_till_net_due: days_till_net_due !== undefined && days_till_net_due !== "" ? Number(days_till_net_due) : null,
            discount_percent: discount_percent !== undefined && discount_percent !== "" ? Number(discount_percent) : 0,
            days_till_discount_expires: days_till_discount_expires !== undefined && days_till_discount_expires !== "" ? Number(days_till_discount_expires) : 0,
            day_of_month_net_due: day_of_month_net_due !== undefined && day_of_month_net_due !== "" ? Number(day_of_month_net_due) : null,
            due_next_month_if_within_days: due_next_month_if_within_days !== undefined && due_next_month_if_within_days !== "" ? Number(due_next_month_if_within_days) : null,
            date_discount_percent: date_discount_percent !== undefined && date_discount_percent !== "" ? Number(date_discount_percent) : null,
            day_discount_expires: day_discount_expires !== undefined && day_discount_expires !== "" ? Number(day_discount_expires) : null,
            is_installment: Boolean(is_installment),
            is_preferred: Boolean(is_preferred),
            isActive: Boolean(isActive),
            CompanyId: company.id,
            user_id: userId,
        });

        res.status(StatusCodes.CREATED).json({
            message: "Payment term created successfully",
            success: true,
            result: newTerm,
        });
    }),

    getAllPaymentTerms: asyncHandler(async (req: CustomRequest, res: Response) => {
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

        await PaymentTerm.sync();

        let terms = await PaymentTerm.findAll({
            where: { CompanyId: company.id },
            order: [["id", "ASC"]],
        });

        // Seed default standard terms if empty
        if (terms.length === 0) {
            const seedData = defaultTerms.map((t) => ({
                ...t,
                is_installment: false,
                is_preferred: false,
                isActive: true,
                CompanyId: company.id,
                user_id: userId,
            }));
            await PaymentTerm.bulkCreate(seedData);
            terms = await PaymentTerm.findAll({
                where: { CompanyId: company.id },
                order: [["id", "ASC"]],
            });
        }

        res.status(StatusCodes.OK).json({
            message: "Payment terms retrieved successfully",
            success: true,
            result: terms,
        });
    }),

    getPaymentTermById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const company = await findCompanyForUser(req.user);
        if (!company) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Unauthorized");
        }

        const term = await PaymentTerm.findOne({
            where: { id, CompanyId: company.id },
        });

        if (!term) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Payment term not found");
        }

        res.status(StatusCodes.OK).json({
            message: "Payment term fetched successfully",
            success: true,
            result: term,
        });
    }),

    updatePaymentTerm: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const company = await findCompanyForUser(req.user);
        if (!company) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Unauthorized");
        }

        const term = await PaymentTerm.findOne({
            where: { id, CompanyId: company.id },
        });

        if (!term) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Payment term not found");
        }

        const {
            name,
            term_type,
            days_till_net_due,
            discount_percent,
            days_till_discount_expires,
            day_of_month_net_due,
            due_next_month_if_within_days,
            date_discount_percent,
            day_discount_expires,
            is_installment,
            is_preferred,
            isActive,
        } = req.body;

        if (name) term.name = name.trim();
        if (term_type) term.term_type = term_type;
        if (days_till_net_due !== undefined) term.days_till_net_due = days_till_net_due !== "" ? Number(days_till_net_due) : null;
        if (discount_percent !== undefined) term.discount_percent = discount_percent !== "" ? Number(discount_percent) : 0;
        if (days_till_discount_expires !== undefined) term.days_till_discount_expires = days_till_discount_expires !== "" ? Number(days_till_discount_expires) : 0;
        if (day_of_month_net_due !== undefined) term.day_of_month_net_due = day_of_month_net_due !== "" ? Number(day_of_month_net_due) : null;
        if (due_next_month_if_within_days !== undefined) term.due_next_month_if_within_days = due_next_month_if_within_days !== "" ? Number(due_next_month_if_within_days) : null;
        if (date_discount_percent !== undefined) term.date_discount_percent = date_discount_percent !== "" ? Number(date_discount_percent) : null;
        if (day_discount_expires !== undefined) term.day_discount_expires = day_discount_expires !== "" ? Number(day_discount_expires) : null;
        if (is_installment !== undefined) term.is_installment = Boolean(is_installment);
        if (is_preferred !== undefined) term.is_preferred = Boolean(is_preferred);
        if (isActive !== undefined) term.isActive = Boolean(isActive);

        await term.save();

        res.status(StatusCodes.OK).json({
            message: "Payment term updated successfully",
            success: true,
            result: term,
        });
    }),

    deletePaymentTerm: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const company = await findCompanyForUser(req.user);
        if (!company) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Unauthorized");
        }

        const term = await PaymentTerm.findOne({
            where: { id, CompanyId: company.id },
        });

        if (!term) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Payment term not found");
        }

        await term.destroy();

        res.status(StatusCodes.OK).json({
            message: "Payment term deleted successfully",
            success: true,
        });
    }),
};

export default PaymentTermController;
