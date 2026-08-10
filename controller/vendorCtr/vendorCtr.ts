import { Response } from "express";

import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op, Sequelize } from "sequelize";
import bcrypt from "bcryptjs";

import SubsidiaryMaster from "../../modals/masters/subsidiaries/subsdiaryMaster";
import VendorDetails from "../../modals/masters/vendorDetails/vendorDetails";
import UserPermission from "../../modals/userPermission/userPermission";
import { findCompanyForUser } from "../../utils/findCompanyForUser";
import { CustomRequest } from "../../typeRequest/customReq";
import Permission from "../../modals/permission/permission";
import sequelize from "../../dbconfig/dbconfig";
import User from "../../modals/user/user";

const VendorController = {
    // Create a new vendor
    createVendor: asyncHandler(async (req: CustomRequest, res: Response) => {
        const transaction = await sequelize.transaction(); //  Start transaction

        try {
            const {
                vendor_name,
                gstin,
                address,
                city_id,
                subsidiary_id,
                state_code_id,
                FirstName,
                LastName,
                Email,
                Password,
                Phone,
            } = req.body;

            const userId = req.user?.id;

            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("User not authenticated");
            }

            // Find company of logged-in admin
            const company = await findCompanyForUser(req.user);
            if (!company) {
                res.status(StatusCodes.UNAUTHORIZED);
                throw new Error("Unauthorized: Company not found for user");
            }
            const existingUser = await User.findOne({
                where: {
                    Email: Email,
                    company_id: company.id,
                },
            });

            if (existingUser) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("A user with this email already exists in the company");
            }
            const hashedPassword = await bcrypt.hash(Password, 10);

            // Create new user for the vendor
            const vendorUser = await User.create(
                {
                    FirstName,
                    LastName,
                    Email,
                    Password: hashedPassword,
                    Phone,
                    Type: "vendor",
                    created_by: userId,
                    company_id: company.id,
                },
                { transaction }
            );

            // Assign default permissions to the vendor user
            try {
                const vendorConsPermissions = await Permission.findAll({
                    where: {
                        module: "vendorCons",
                        action: ["create", "read", "update", "delete"],
                    },
                });

                const vendorIssuePermission = await Permission.findOne({
                    where: {
                        module: "vendorIssue",
                        action: "read",
                    },
                });

                const permissionEntries = [];

                for (const permission of vendorConsPermissions) {
                    permissionEntries.push({
                        userId: vendorUser.id,
                        permissionId: permission.id,
                    });
                }

                if (vendorIssuePermission) {
                    permissionEntries.push({
                        userId: vendorUser.id,
                        permissionId: vendorIssuePermission.id,
                    });
                }

                if (permissionEntries.length > 0) {
                    await UserPermission.bulkCreate(permissionEntries, { transaction }); //  inside transaction
                }
            } catch (permissionError) {
                console.error(
                    "Error assigning default permissions to vendor:",
                    permissionError
                );
                // Continue even if permission assignment fails
            }

            // Validate subsidiary
            let validatedSubsidiaryId: number | null = null;
            if (
                subsidiary_id !== undefined &&
                subsidiary_id !== null &&
                subsidiary_id !== ""
            ) {
                const sub = await SubsidiaryMaster.findByPk(Number(subsidiary_id));
                if (!sub || sub.CompanyId !== company.id) {
                    await transaction.rollback(); //  rollback on invalid subsidiary
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error("Invalid subsidiary for this company");
                }
                validatedSubsidiaryId = Number(subsidiary_id);
            }

            const normalizedGstin =
                gstin && gstin.trim() !== "" ? gstin : null;

            const vendor = await VendorDetails.create(
                {
                    vendor_name,
                    gstin: normalizedGstin,
                    address,
                    city_id,
                    subsidiary_id: validatedSubsidiaryId,
                    state_code_id,
                    company_id: company.id,
                    user_id: vendorUser.id,
                    isActive: true,
                },
                { transaction } //  inside transaction
            );

            await transaction.commit(); //  commit if everything succeeded

            res.status(StatusCodes.CREATED).json({
                message: "Vendor created successfully with default permissions",
                success: true,
                result: {
                    vendor,
                    assignedPermissions: {
                        vendorCons: ["create", "read", "update", "delete"],
                        vendorIssue: ["read"],
                    },
                },
            });
        } catch (error: any) {
            await transaction.rollback(); //  rollback on any error

            res.status(StatusCodes.INTERNAL_SERVER_ERROR);
            throw new Error(error.message || "Failed to create vendor");
        }
    }),

    // Get all vendors for current user's company
    getVendors: asyncHandler(async (req: CustomRequest, res: Response) => {
        const user = await User.findByPk(req.user?.id);

        if (!user) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const company = await findCompanyForUser(req.user);
        if (!company) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Unauthorized: Company not found for user");
        }

        // Option parameter to control whether to return all vendors or paginate
        const option = req.query.option === "true";
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;
        const search = (req.query.search as string)?.trim().toLowerCase() || "";

        const where: any = { company_id: company.id };
        if (user.Type === "employee" || user.Type === "vendor") {
            where.user_id = user.id;
        }

        if (search) {
            where[Op.or] = [
                Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("vendor_name")), {
                    [Op.like]: `%${search}%`,
                }),
                Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("gstin")), {
                    [Op.like]: `%${search}%`,
                }),
                Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("address")), {
                    [Op.like]: `%${search}%`,
                }),
            ];
        }

        const vendorAttributes = [
            "id",
            "vendor_name",
            "gstin",
            "address",
            "city_id",
            "state_code_id",
            "subsidiary_id",
            "company_id",
            "user_id",
            "isActive",
            "createdAt",
            "updatedAt",
        ];

        const vendorInclude = [
            {
                association: "city",
                attributes: ["id", "city_name"],
                required: false,
            },
            {
                association: "state",
                attributes: ["id", "state_code"],
                required: false,
            },
            {
                association: "user",
                attributes: ["id", "FirstName", "LastName", "Email", "Phone", "Type"],
                required: false,
            },
            {
                association: "subsidiary",
                attributes: ["id", "subsidiary_name"],
                required: false,
            },
        ];

        let vendors;
        if (option) {
            vendors = await VendorDetails.findAll({
                where,
                attributes: vendorAttributes,
                include: vendorInclude,
                order: [["createdAt", "DESC"]],
            });

            res.status(StatusCodes.OK).json({
                message: "All vendors fetched successfully",
                success: true,
                result: vendors,
            });
            return;
        }

        const { rows, count } = await VendorDetails.findAndCountAll({
            where,
            attributes: vendorAttributes,
            include: vendorInclude,
            distinct: true,
            offset,
            limit,
            order: [["createdAt", "DESC"]],
        });

        res.status(StatusCodes.OK).json({
            message: "Vendors fetched successfully",
            success: true,
            result: rows,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit),
            },
        });
    }),

    // Get a single vendor by ID
    getVendorById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid vendor ID is required");
        }

        const vendor = await VendorDetails.findByPk(Number(id), {
            include: ["city", "state", "user", "subsidiary"],
        });

        if (!vendor) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Vendor not found");
        }

        res.status(StatusCodes.OK).json({
            message: "Vendor fetched successfully",
            success: true,
            result: vendor,
        });
    }),

    // Update vendor
    updateVendor: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const {
            vendor_name,
            gstin,
            address,
            city_id,
            state_code_id,
            isActive,
            Password,
            FirstName,
            LastName,
            Email,
            Phone,
        } = req.body;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid vendor ID is required");
        }

        const transaction = await sequelize.transaction(); //  add transaction here too

        try {
            const vendor: any = await VendorDetails.findByPk(Number(id), {
                include: [
                    {
                        model: User,
                        as: "user",
                    },
                ],
                transaction,
            });
            if (!vendor) {
                await transaction.rollback();
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Vendor not found");
            }

            let validatedSubsidiaryId: number | null = vendor.subsidiary_id ?? null;
            if (req.body.subsidiary_id !== undefined) {
                const incoming = req.body.subsidiary_id;
                if (incoming === null || incoming === "") {
                    validatedSubsidiaryId = null;
                } else {
                    const sub = await SubsidiaryMaster.findByPk(Number(incoming));
                    if (!sub || sub.CompanyId !== vendor.company_id) {
                        await transaction.rollback();
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error("Invalid subsidiary for this company");
                    }
                    validatedSubsidiaryId = Number(incoming);
                }
            }

            vendor.vendor_name = vendor_name ?? vendor.vendor_name;
            vendor.gstin = gstin ?? vendor.gstin;
            vendor.address = address ?? vendor.address;
            vendor.city_id = city_id ?? vendor.city_id;
            vendor.state_code_id = state_code_id ?? vendor.state_code_id;
            vendor.subsidiary_id = validatedSubsidiaryId;
            vendor.isActive = isActive ?? vendor.isActive;
            if (FirstName) vendor.user.FirstName = FirstName;
            if (LastName) vendor.user.LastName = LastName;
            if (Email) vendor.user.Email = Email;
            if (Phone) vendor.user.Phone = Phone;
            if (Password) {
                const hashedPassword = await bcrypt.hash(Password, 10);
                vendor.user.Password = hashedPassword;
            }

            await vendor.user.save({ transaction });
            await vendor.save({ transaction });
            await transaction.commit();

            res.status(StatusCodes.OK).json({
                message: "Vendor updated successfully",
                success: true,
                result: vendor,
            });
        } catch (err: any) {
            await transaction.rollback();
            throw new Error(err.message || "Error updating vendor");
        }
    }),

    // Delete vendor
    deleteVendor: asyncHandler(async (req: CustomRequest, res: Response) => {
        const transaction = await sequelize.transaction(); //  transaction added here too
        try {
            const { id } = req.params;

            if (!id || isNaN(Number(id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid vendor ID is required");
            }

            const vendor = await VendorDetails.findByPk(Number(id), { transaction });
            const user = await User.findByPk(vendor?.user_id || 0, { transaction });

            if (!vendor) {
                await transaction.rollback();
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Vendor not found");
            }
            if (user) {
                await vendor.destroy({ transaction });
                await user.destroy({ transaction });
            }

            await transaction.commit();

            res.status(StatusCodes.OK).json({
                message: "Vendor deleted successfully",
                success: true,
                result: null,
            });
        } catch (error: any) {
            await transaction.rollback();
            throw new Error(error.message || "Failed to delete vendor");
        }
    }),
};

export default VendorController;