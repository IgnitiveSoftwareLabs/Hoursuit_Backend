import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { CustomRequest } from "../../typeRequest/customReq";
import ServiceType from "../../modals/masters/serviceType/serviceTypeMaster";
import SubsidiaryMaster from "../../modals/masters/subsidiaries/subsdiaryMaster";
import { findCompanyForUser } from "../../utils/findCompanyForUser";

const ServiceTypeController = {
    // Create new service type
    createServiceType: asyncHandler(async (req: CustomRequest, res: Response) => {
        const {
            service_name,
            uom_id,
            service_category_id,
            subsidiary_id,
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

        // allow uom_id, service_category_id and chart_of_account_id to be optional / nullable
        const uomValue =
            uom_id === "" ? null : uom_id === undefined ? null : uom_id;
        const serviceCategoryValue =
            service_category_id === ""
                ? null
                : service_category_id === undefined
                    ? null
                    : service_category_id;

        // validate subsidiary if provided
        let validatedSubsidiaryId: number | null = null;
        if (
            subsidiary_id !== undefined &&
            subsidiary_id !== null &&
            String(subsidiary_id) !== ""
        ) {
            if (isNaN(Number(subsidiary_id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Invalid subsidiary_id");
            }
            const sub = await SubsidiaryMaster.findOne({
                where: { id: Number(subsidiary_id), CompanyId: company.id },
            });
            if (!sub) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Subsidiary not found for this company");
            }
            validatedSubsidiaryId = Number(subsidiary_id);
        }

        const serviceType = await ServiceType.create({
            service_name,
            uom_id: uomValue,
            service_category_id: serviceCategoryValue,
            subsidiary_id: validatedSubsidiaryId,
            CompanyId: company.id,
            user_id: userId,
            isActive: isActive !== undefined ? isActive : true,
        });

        res.status(StatusCodes.CREATED).json({
            message: "Service type created successfully",
            success: true,
            result: serviceType,
        });
    }),

    // Get all service types for authenticated user's company
    getServiceTypes: asyncHandler(async (req: CustomRequest, res: Response) => {
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

        const serviceTypes = await ServiceType.findAll({
            where: { CompanyId: company.id },
            include: [
                { association: "company", attributes: ["id", "name"] },
                { association: "uom", attributes: ["id", "uom_name"] }, 
                { association: "serviceCategory", attributes: ["id", "category_name"] },
                { association: "subsidiary", attributes: ["id", "subsidiary_name"] },
            ],
        });

        res.status(StatusCodes.OK).json({
            message: "Service types fetched successfully",
            success: true,
            result: serviceTypes,
        });
    }),

    // Get a single service type by ID
    getServiceTypeById: asyncHandler(
        async (req: CustomRequest, res: Response) => {
            const { id } = req.params;
            const userId = req.user?.id;

            if (!id || isNaN(Number(id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid service type ID is required");
            }

            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            const serviceType = await ServiceType.findByPk(Number(id), {
                include: [
                    { association: "company", attributes: ["id", "name"] },
                    { association: "uom", attributes: ["id", "uom_name"] },
                    {
                        association: "serviceCategory",
                        attributes: ["id", "category_name"],
                    },
                    { association: "subsidiary", attributes: ["id", "subsidiary_name"] },
                ],
            });

            if (!serviceType) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Service type not found");
            }

            res.status(StatusCodes.OK).json({
                message: "Service type fetched successfully",
                success: true,
                result: serviceType,
            });
        }
    ),

    // Update a service type
    updateServiceType: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const {
            service_name,
            uom_id,
            service_category_id,
            subsidiary_id,
            isActive,
        } = req.body;
        const userId = req.user?.id;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid service type ID is required");
        }

        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const serviceType = await ServiceType.findByPk(Number(id));
        if (!serviceType) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Service type not found");
        }

        // Prepare updated data; treat empty string as explicit null
        const newUom =
            uom_id === "" ? null : uom_id !== undefined ? uom_id : serviceType.uom_id;
        const newServiceCategory =
            service_category_id === ""
                ? null
                : service_category_id !== undefined
                    ? service_category_id
                    : (serviceType as any).service_category_id;

        const updatedData = {
            service_name: service_name ?? serviceType.service_name,
            uom_id: newUom,
            service_category_id: newServiceCategory,
            subsidiary_id: (serviceType as any).subsidiary_id ?? null,
            CompanyId: serviceType.CompanyId,
            user_id: serviceType.user_id,
            isActive: isActive !== undefined ? isActive : serviceType.isActive,
            id: serviceType.id,
        };

        serviceType.service_name = updatedData.service_name;
        serviceType.uom_id = updatedData.uom_id as any; // allow assigning null
        (serviceType as any).service_category_id =
            updatedData.service_category_id as any;
        // handle subsidiary update if provided
        if (subsidiary_id !== undefined) {
            if (subsidiary_id === null || String(subsidiary_id) === "") {
                (serviceType as any).subsidiary_id = null;
            } else {
                if (isNaN(Number(subsidiary_id))) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error("Invalid subsidiary_id");
                }
                const company = await findCompanyForUser(req.user);
                const sub = await SubsidiaryMaster.findOne({
                    where: { id: Number(subsidiary_id), CompanyId: company?.id },
                });
                if (!sub) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error("Subsidiary not found for this company");
                }
                (serviceType as any).subsidiary_id = Number(subsidiary_id);
            }
        }
        serviceType.isActive = updatedData.isActive;

        await serviceType.save();

        res.status(StatusCodes.OK).json({
            message: "Service type updated successfully",
            success: true,
            result: serviceType,
        });
    }),

    // Delete a service type
    deleteServiceType: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid service type ID is required");
        }

        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const serviceType = await ServiceType.findByPk(Number(id));
        if (!serviceType) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Service type not found");
        }

        await serviceType.destroy();

        res.status(StatusCodes.OK).json({
            message: "Service type deleted successfully",
            success: true,
            result: null,
        });
    }),
};

export default ServiceTypeController;