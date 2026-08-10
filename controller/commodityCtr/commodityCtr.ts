import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { CustomRequest } from "../../typeRequest/customReq";
import Commodity from "../../modals/commodity/commodity";
import Company from "../../modals/company/company";
import { findCompanyForUser } from "../../utils/findCompanyForUser";

interface CommodityAttributes {
    commodity_id: number;
    name: string;
    description: string;
    unit_type: "Gain" | "Loss" | "Exact";
    gain_loss_threshold: number;
    created_at?: Date;
    CompanyId: number;
    units?: string; // Optional field for commodity units
}

const CommodityController = {
    // Create commodity
    createCommodity: asyncHandler(async (req: CustomRequest, res: Response) => {
        try {
            const { name, description, unit_type, gain_loss_threshold, units } = req.body;
            const userId = req.user?.id;

            // Validate required fields
            if (
                !name ||
                !unit_type ||
                !gain_loss_threshold ||
                typeof name !== "string" ||
                !["Gain", "Loss", "Exact"].includes(unit_type) ||
                isNaN(gain_loss_threshold)
            ) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Required fields missing or invalid");
            }

            // Validate user authentication
            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            // Verify company ownership
            const company = await findCompanyForUser(req.user);

            if (!company) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("Unauthorized or invalid company");
            }

            const commodity = await Commodity.create({
                name,
                description,
                unit_type,
                gain_loss_threshold: Number(gain_loss_threshold),
                CompanyId: Number(company.id),
                units: units || null, // Optional field for commodity units
            });

            res.status(StatusCodes.CREATED).json({
                message: "Commodity created successfully",
                success: true,
                result: commodity,
            });
        } catch (error: any) {
            throw new Error(error.message);
        }
    }),

    // Get all commodities for a company
    getCommodities: asyncHandler(async (req: CustomRequest, res: Response) => {
        try {

            const userId = req.user?.id;


            const company = await findCompanyForUser(req.user);

            if (!company) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("Unauthorized or invalid company");
            }

            const commodities = await Commodity.findAll({
                where: { CompanyId: Number(company.id) },
                attributes: { exclude: ["created_at"] },
            });

            res.status(StatusCodes.OK).json({
                message: "Commodities fetched successfully",
                success: true,
                result: commodities,
            });
        } catch (error: any) {
            throw new Error(error.message);
        }
    }),

    // Get single commodity by ID
    getCommodityById: asyncHandler(async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            // Validate input
            if (!id || isNaN(Number(id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid commodity ID is required");
            }

            // Validate user authentication
            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            const commodity = await Commodity.findByPk(Number(id), {
                include: [
                    {
                        model: Company,
                        as: "company",
                        where: { UserId: userId },
                        attributes: [],
                    },
                ],
                attributes: { exclude: ["created_at"] },
            });

            if (!commodity) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Commodity not found or unauthorized");
            }

            res.status(StatusCodes.OK).json({
                message: "Commodity fetched successfully",
                success: true,
                result: commodity,
            });
        } catch (error: any) {
            throw new Error(error.message);
        }
    }),

    // Update commodity by ID
    updateCommodity: asyncHandler(async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            // Validate input
            if (!id || isNaN(Number(id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid commodity ID is required");
            }

            // Validate user authentication
            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            const commodity = await Commodity.findByPk(Number(id));

            if (!commodity) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Commodity not found");
            }

            // Verify company ownership
            const company = await findCompanyForUser(req.user);

            if (!company) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("Unauthorized access to this commodity");
            }

            // Validate and filter update fields
            const { name, description, unit_type, gain_loss_threshold, units } = req.body;
            const updateData: Partial<CommodityAttributes> = {};
            if (name && typeof name === "string") updateData.name = name;
            if (description && typeof description === "string") updateData.description = description;
            if (unit_type && ["Gain", "Loss", "Exact"].includes(unit_type)) updateData.unit_type = unit_type;
            if (gain_loss_threshold && !isNaN(gain_loss_threshold))
                updateData.gain_loss_threshold = Number(gain_loss_threshold);
            if (units && typeof units === "string") updateData.units = units; // Optional field for commodity units
            await commodity.update(updateData);

            res.status(StatusCodes.OK).json({
                message: "Commodity updated successfully",
                success: true,
                result: commodity,
            });
        } catch (error: any) {
            throw new Error(error.message);
        }
    }),

    // Delete commodity by ID
    deleteCommodity: asyncHandler(async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            // Validate input
            if (!id || isNaN(Number(id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid commodity ID is required");
            }

            // Validate user authentication
            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            const commodity = await Commodity.findByPk(Number(id));

            if (!commodity) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Commodity not found");
            }

            // Verify company ownership
            const company = await findCompanyForUser(req.user);

            if (!company) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("Unauthorized access to this commodity");
            }

            await commodity.destroy();

            res.status(StatusCodes.OK).json({
                message: "Commodity deleted successfully",
                success: true,
                result: null,
            });
        } catch (error: any) {
            throw new Error(error.message);
        }
    }),
};

export default CommodityController;