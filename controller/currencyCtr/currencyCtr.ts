import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";

import CurrencyMaster from "../../modals/masters/currency/currencyMaster";
import { findCompanyForUser } from "../../utils/findCompanyForUser";
import { CustomRequest } from "../../typeRequest/customReq";

const CurrencyController = {
    createCurrency: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        if (!company) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Unauthorized or invalid company");
        }

        const {
            currency_code,
            currency_name,
            currency_symbol,
            country_name,
            decimal_places,
            isActive,
        } = req.body;
        const currency = await CurrencyMaster.create({
            currency_code,
            currency_name,
            currency_symbol: currency_symbol ?? null,
            country_name: country_name ?? null,
            decimal_places: decimal_places ?? 2,
            // global currency; no CompanyId or user_id
            isActive: isActive !== undefined ? isActive : true,
        });

        res.status(StatusCodes.CREATED).json({
            message: "Currency created successfully",
            success: true,
            result: currency,
        });
    }),

    getCurrencies: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        if (!company) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Unauthorized or invalid company");
        }

        // fetch all currencies (global)
        const currencies = await CurrencyMaster.findAll();

        res.status(StatusCodes.OK).json({
            message: "Currencies fetched successfully",
            success: true,
            result: currencies,
        });
    }),

    getCurrencyById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        if (!company) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Unauthorized or invalid company");
        }

        const { id } = req.params;
        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid currency ID is required");
        }

        const currency = await CurrencyMaster.findByPk(Number(id));

        if (!currency) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Currency not found");
        }

        res.status(StatusCodes.OK).json({
            message: "Currency fetched successfully",
            success: true,
            result: currency,
        });
    }),

    updateCurrency: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        if (!company) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Unauthorized or invalid company");
        }

        const { id } = req.params;
        const {
            currency_code,
            currency_name,
            currency_symbol,
            country_name,
            decimal_places,
            isActive,
        } = req.body;
        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid currency ID is required");
        }

        const currency = await CurrencyMaster.findByPk(Number(id));
        if (!currency) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Currency not found");
        }

        currency.currency_code = currency_code ?? currency.currency_code;
        currency.currency_name = currency_name ?? currency.currency_name;
        currency.currency_symbol = currency_symbol ?? currency.currency_symbol;
        currency.country_name = country_name ?? currency.country_name;
        currency.decimal_places = decimal_places ?? currency.decimal_places;
        currency.isActive = isActive !== undefined ? isActive : currency.isActive;

        await currency.save();

        res.status(StatusCodes.OK).json({
            message: "Currency updated successfully",
            success: true,
            result: currency,
        });
    }),

    deleteCurrency: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        if (!company) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Unauthorized or invalid company");
        }

        const { id } = req.params;
        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid currency ID is required");
        }

        const currency = await CurrencyMaster.findByPk(Number(id));
        if (!currency) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Currency not found");
        }

        await currency.destroy();
        res.status(StatusCodes.OK).json({
            message: "Currency deleted successfully",
            success: true,
            result: null,
        });
    }),
};

export default CurrencyController;