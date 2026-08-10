import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import StateCode from "../../modals/masters/state/state";
import { Op } from "sequelize";

const StateCodeController = {
    // Create new state code
    createStateCode: asyncHandler(async (req: Request, res: Response) => {
        const { state_name, state_code } = req.body;

        // Check if state_name or state_code already exists
        const existingState = await StateCode.findOne({
            where: {
                [Op.or]: [
                    { state_name },
                    { state_code },
                ],
            },
        });

        if (existingState) {
            res.status(StatusCodes.CONFLICT);
            throw new Error("State name or code already exists");
        }

        // Create new state code
        const newStateCode = await StateCode.create({ state_name, state_code });

        res.status(StatusCodes.CREATED).json({
            message: "State code created successfully",
            success: true,
            result: newStateCode,
        });
    }),

    // Get all state codes
    getAllStateCodes: asyncHandler(async (req: Request, res: Response) => {
        const stateCodes = await StateCode.findAll({
            order: [["state_name", "ASC"]],
        });

        res.status(StatusCodes.OK).json({
            message: "State codes fetched successfully",
            success: true,
            result: stateCodes,
        });
    }),

    // Get a state code by ID
    getStateCodeById: asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid state code ID is required");
        }

        const stateCode = await StateCode.findByPk(Number(id));

        if (!stateCode) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("State code not found");
        }

        res.status(StatusCodes.OK).json({
            message: "State code fetched successfully",
            success: true,
            result: stateCode,
        });
    }),

    // Update a state code
    updateStateCode: asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { state_name, state_code } = req.body;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid state code ID is required");
        }

        const stateCode = await StateCode.findByPk(Number(id));
        if (!stateCode) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("State code not found");
        }

        // Update fields if provided
        if (state_name !== undefined) stateCode.state_name = state_name;
        if (state_code !== undefined) stateCode.state_code = state_code;


        // Check for uniqueness conflicts excluding current record
        const conflict = await StateCode.findOne({
            // where: {
            //     id: { [Op.ne]: id },
            //     [Op.or]: [
            //         { state_name: stateCode.state_name },
            //         { state_code: stateCode.state_code },
            //     ],
            // },
        });

        if (conflict) {
            res.status(StatusCodes.CONFLICT);
            throw new Error("State name or code conflicts with another record");
        }

        await stateCode.save();

        res.status(StatusCodes.OK).json({
            message: "State code updated successfully",
            success: true,
            result: stateCode,
        });
    }),

    // Delete a state code
    deleteStateCode: asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid state code ID is required");
        }

        const stateCode = await StateCode.findByPk(Number(id));
        if (!stateCode) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("State code not found");
        }

        await stateCode.destroy();

        res.status(StatusCodes.OK).json({
            message: "State code deleted successfully",
            success: true,
            result: null,
        });
    }),
};

export default StateCodeController;