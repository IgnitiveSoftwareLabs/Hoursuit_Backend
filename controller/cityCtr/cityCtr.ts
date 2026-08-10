import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Op } from "sequelize";

import StateCode from "../../modals/masters/state/state";
import CityMaster from "../../modals/masters/city/city";
import { StatusCodes } from "http-status-codes";

const CityMasterController = {
    // Create new city
    createCity: asyncHandler(async (req: Request, res: Response) => {
        const { city_name, state_code_id } = req.body;

        // Check if StateCode exists
        const state = await StateCode.findByPk(state_code_id);
        if (!state) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Associated StateCode not found");
        }

        // Check for duplicate city name in the same state
        const existingCity = await CityMaster.findOne({
            where: {
                city_name,
                state_code_id,
            },
        });

        if (existingCity) {
            res.status(StatusCodes.CONFLICT);
            throw new Error("City with this name already exists in the specified state");
        }

        // Create city
        const city = await CityMaster.create({ city_name, state_code_id });

        res.status(StatusCodes.CREATED).json({
            message: "City created successfully",
            success: true,
            result: city,
        });
    }),

    // Get all cities (with optional filtering by state_code_id)
    getAllCities: asyncHandler(async (req: Request, res: Response) => {
        const { state_code_id } = req.query;

        const filter: any = {};
        if (state_code_id) {
            filter.state_code_id = Number(state_code_id);
        }

        const cities = await CityMaster.findAll({
            where: filter,
            include: [
                {
                    model: StateCode,
                    as: "state",
                    attributes: ["id", "state_name", "state_code"],
                },
            ],
            order: [["city_name", "ASC"]],
        });

        res.status(StatusCodes.OK).json({
            message: "Cities fetched successfully",
            success: true,
            result: cities,
        });
    }),

    // Get city by ID
    getCityById: asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid city ID is required");
        }

        const city = await CityMaster.findByPk(Number(id), {
            include: [
                {
                    model: StateCode,
                    as: "state",
                    attributes: ["id", "state_name", "state_code"],
                },
            ],
        });

        if (!city) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("City not found");
        }

        res.status(StatusCodes.OK).json({
            message: "City fetched successfully",
            success: true,
            result: city,
        });
    }),

    // Update city
    updateCity: asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { city_name, state_code_id } = req.body;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid city ID is required");
        }

        const city = await CityMaster.findByPk(Number(id));
        if (!city) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("City not found");
        }

        if (state_code_id !== undefined) {
            const state = await StateCode.findByPk(state_code_id);
            if (!state) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Associated StateCode not found");
            }
            city.state_code_id = state_code_id;
        }

        if (city_name !== undefined) {
            city.city_name = city_name;
        }

        // Check duplicate city in state (excluding current city)
        const conflict = await CityMaster.findOne({
            where: {
                city_name: city.city_name,
                state_code_id: city.state_code_id,
                id: { [Op.ne]: city.id },
            },
        });
        if (conflict) {
            res.status(StatusCodes.CONFLICT);
            throw new Error("City with this name already exists in the specified state");
        }

        await city.save();

        res.status(StatusCodes.OK).json({
            message: "City updated successfully",
            success: true,
            result: city,
        });
    }),

    // Delete city
    deleteCity: asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid city ID is required");
        }

        const city = await CityMaster.findByPk(Number(id));
        if (!city) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("City not found");
        }

        await city.destroy();

        res.status(StatusCodes.OK).json({
            message: "City deleted successfully",
            success: true,
            result: null,
        });
    }),
};

export default CityMasterController;