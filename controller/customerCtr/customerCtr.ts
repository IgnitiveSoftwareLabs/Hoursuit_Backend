import { Response } from "express";

import { UniqueConstraintError, ValidationError } from "sequelize";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op, Sequelize } from "sequelize";

import { findCompanyForUser } from "../../utils/findCompanyForUser";
import Customer from "../../modals/masters/customer/customer";
import Attachment from "../../modals/attachments/attachment";
import { CustomRequest } from "../../typeRequest/customReq";
// import Ledger from "../../modals/masters/ledger/ledger";

const CustomerController = {
    createCustomer: asyncHandler(async (req: CustomRequest, res: Response) => {
        const {
            name,
            category,
            contact,
            email,
            gstNumber,
            contactPersonName,
            contactPersonEmail,
            contactPersonPhoneNumber,
            state,
            city,
            address,
            pin_code,
            currency_id,
            registration_type_id,
            credit_limit,
            customer_type,
            pan_no,
            pan_avl_id,
            officeAddress,
            village,
            tehsil,
            post,
            fatherName,
            district,
            aadharNumber,
            subsidiary_id,
        } = req.body;

        const company = await findCompanyForUser(req.user);

        const companyId = company?.id;
        if (!companyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated or company not found");
        }

        const validAttachments: { [key: string]: string[] } = {
            Farmer: [
                "farmer_photo",
                "rin_pustika",
                "signature",
                "auth_letter",
                "sign_verification",
            ],
            Trader: [
                "license",
                "gst",
                "udhayam_aadhar",
                "sign_verification",
                "auth_letter",
            ],
            "Seed Company": [
                "license",
                "gst",
                "aggrement_letter",
                "udhayam_aadhar",
                "auth_letter",
                "sign_verification",
            ],
            "Government Organization": [
                "license",
                "gst",
                "udhayam_aadhar",
                "sign_verification",
                "auth_letter",
            ],
            "Corporate/Service agency": [
                "license",
                "gst",
                "aggrement_letter",
                "udhayam_aadhar",
                "auth_letter",
                "sign_verification",
            ],
            Supervisor: [],
            splicer: [],
            "Cable lying": [],
        };

        try {
            const customerData: any = {
                name,
                category,
                contact,
                email,
                contactPersonName,
                contactPersonEmail,
                contactPersonPhoneNumber,
                pin_code,
                currency_id,
                registration_type_id,
                credit_limit,
                customer_type,
                pan_no,
                pan_avl_id,
                state,
                address,
                officeAddress,
                CompanyId: companyId,
            };

            if (category === "Farmer") {
                customerData.village = village;
                customerData.tehsil = tehsil;
                customerData.post = post;
                customerData.district = district;
                customerData.aadharNumber = aadharNumber;
                customerData.fatherName = fatherName;
            } else {
                customerData.city = city;
                customerData.district = district;
                if (
                    [
                        "Trader",
                        "Seed Company",
                        "Government Organization",
                        "Corporate/Service agency",
                    ].includes(category)
                ) {
                    customerData.gstNumber = gstNumber;
                }
            }

            // Set subsidiary if provided (keep null if empty/undefined)
            if (subsidiary_id !== undefined && subsidiary_id !== "") {
                customerData.subsidiary_id = Number(subsidiary_id);
            }

            const customer = await Customer.create(customerData);

            // Create opening balance ledger entry for the new customer
            //   await Ledger.create({
            //     transaction_date: new Date(),
            //     particular: "Opening Balance",
            //     voucher_type: "opening_balance",
            //     reference_number: `OB-${customer.id}`,
            //     debit_amount: 0.0,
            //     credit_amount: 0.0,
            //     balance: 0.0,
            //     customer_id: customer.id,
            //     CompanyId: companyId,
            //   });

            const files = req.files as
                | { [fieldname: string]: Express.Multer.File[] }
                | undefined;
            if (files && Object.keys(files).length > 0) {
                const attachmentsData = [];
                const allowedAttachments = validAttachments[category] || [];

                for (const fieldName in files) {
                    if (
                        allowedAttachments.includes(fieldName) &&
                        files[fieldName] &&
                        files[fieldName][0]
                    ) {
                        const file = files[fieldName][0];
                        const validTillField = `${fieldName}_validTill`;
                        const validTill = req.body[validTillField];

                        attachmentsData.push({
                            fileName: file.originalname,
                            filePath: file.path,
                            mimeType: file.mimetype,
                            type: fieldName,
                            relatedId: customer.id,
                            relatedType: "Customer",
                            validTill: validTill ? new Date(validTill) : undefined,
                        });
                    }
                }

                if (attachmentsData.length > 0) {
                    await Attachment.bulkCreate(attachmentsData);
                }
            }

            res.status(StatusCodes.CREATED).json({
                message: "Customer created successfully",
                success: true,
                result: customer,
            });
        } catch (error: any) {
            if (error instanceof UniqueConstraintError) {
                const field = error.errors?.[0]?.path;
                const message = `${field} must be unique`;
                res
                    .status(StatusCodes.BAD_REQUEST)
                    .json({ message, field, success: false });
            } else if (error instanceof ValidationError) {
                res.status(StatusCodes.BAD_REQUEST).json({
                    message: "Validation error",
                    success: false,
                    errors: error.errors.map((e: { path: any; message: any }) => ({
                        field: e.path,
                        message: e.message,
                    })),
                });
            }

            console.error("Unexpected Error:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                message: "Internal server error",
                success: false,
            });
        }
    }),

    getCustomers: asyncHandler(async (req: CustomRequest, res: Response) => {
        const userId = req.user?.id;

        if (!userId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated");
        }

        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        if (!companyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Company not found");
        }

        // Option parameter to control whether to return all customers or paginate
        const option = req.query.option === "true"; // Will be true if option=true

        // Pagination variables
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        // Search condition
        const search = (req.query.search as string)?.toLowerCase() || "";
        const searchCondition = search
            ? {
                [Op.or]: [
                    Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("name")), {
                        [Op.like]: `%${search}%`,
                    }),
                    Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("category")), {
                        [Op.like]: `%${search}%`,
                    }),
                    Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("contact")), {
                        [Op.like]: `%${search}%`,
                    }),
                    Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("email")), {
                        [Op.like]: `%${search}%`,
                    }),
                    Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("address")), {
                        [Op.like]: `%${search}%`,
                    }),
                    Sequelize.where(
                        Sequelize.fn("LOWER", Sequelize.col("contactPersonName")),
                        { [Op.like]: `%${search}%` }
                    ),
                    Sequelize.where(
                        Sequelize.fn("LOWER", Sequelize.col("contactPersonEmail")),
                        { [Op.like]: `%${search}%` }
                    ),
                    Sequelize.where(
                        Sequelize.fn("LOWER", Sequelize.col("contactPersonPhoneNumber")),
                        { [Op.like]: `%${search}%` }
                    ),
                    Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("state")), {
                        [Op.like]: `%${search}%`,
                    }),
                    Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("city")), {
                        [Op.like]: `%${search}%`,
                    }),
                    Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("village")), {
                        [Op.like]: `%${search}%`,
                    }),
                    Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("post")), {
                        [Op.like]: `%${search}%`,
                    }),
                    Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("tehsil")), {
                        [Op.like]: `%${search}%`,
                    }),
                    Sequelize.where(
                        Sequelize.fn("LOWER", Sequelize.col("fatherName")),
                        { [Op.like]: `%${search}%` }
                    ),
                    Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("district")), {
                        [Op.like]: `%${search}%`,
                    }),
                    Sequelize.where(
                        Sequelize.fn("LOWER", Sequelize.col("aadharNumber")),
                        { [Op.like]: `%${search}%` }
                    ),
                    Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("gstNumber")), {
                        [Op.like]: `%${search}%`,
                    }),
                ],
            }
            : {};

        if (option) {
            // If option is true, return only id, name, and address attributes
            const customers = await Customer.findAll({
                where: {
                    CompanyId: companyId,
                    ...searchCondition,
                },
                attributes: ["id", "name", "address"], // Only these attributes
                order: [["createdAt", "DESC"]],
            });

            res.status(StatusCodes.OK).json({
                message: "Customers fetched successfully",
                success: true,
                result: customers,
            });
        } else {
            // Default pagination behavior if option is false or not provided
            const { rows: customers, count: total } = await Customer.findAndCountAll({
                where: {
                    CompanyId: companyId,
                    ...searchCondition,
                },
                include: [
                    {
                        model: Attachment,
                        as: "attachments",
                        attributes: [
                            "id",
                            "fileName",
                            "filePath",
                            "mimeType",
                            "type",
                            "validTill",
                        ],
                        where: { relatedType: "Customer" },
                        required: false,
                    },
                    {
                        model: (await import("../../modals/masters/subsidiaries/subsdiaryMaster")).default,
                        as: "subsidiary",
                        attributes: ["id", "subsidiary_name"],
                        required: false,
                    },
                ],
                distinct: true,
                offset,
                limit,
                order: [["createdAt", "DESC"]],
            });

            res.status(StatusCodes.OK).json({
                message: "Customers fetched successfully",
                success: true,
                result: customers,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            });
        }
    }),

    getCustomerById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const company = await findCompanyForUser(req.user);
        const companyId = company?.id;
        if (!companyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated or company not found");
        }

        const customer = await Customer.findOne({
            where: { id: Number(id), CompanyId: companyId },
            attributes: { exclude: ["CompanyId"] },
            include: [
                {
                    model: Attachment,
                    as: "attachments",
                    attributes: [
                        "id",
                        "fileName",
                        "filePath",
                        "mimeType",
                        "type",
                        "validTill",
                    ],
                    where: { relatedType: "Customer" },
                    required: false,
                },
                {
                    model: (await import("../../modals/masters/subsidiaries/subsdiaryMaster")).default,
                    as: "subsidiary",
                    attributes: ["id", "subsidiary_name"],
                    required: false,
                },
            ],
        });

        if (!customer) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Customer not found");
        }

        res.status(StatusCodes.OK).json({
            message: "Customer fetched successfully",
            success: true,
            result: customer,
        });
    }),

    updateCustomer: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const {
            name,
            category,
            contact,
            email,
            gstNumber,
            contactPersonName,
            contactPersonEmail,
            contactPersonPhoneNumber,
            state,
            city,
            address,
            officeAddress,
            pin_code,
            currency_id,
            registration_type_id,
            credit_limit,
            customer_type,
            pan_no,
            pan_avl_id,
            village,
            tehsil,
            post,
            district,
            aadharNumber,
            fatherName,
            subsidiary_id,
        } = req.body;

        const company = await findCompanyForUser(req.user);

        const companyId = company?.id;
        if (!companyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated or company not found");
        }

        const customer = await Customer.findOne({
            where: { id: Number(id), CompanyId: companyId },
        });

        if (!customer) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Customer not found");
        }

        const validAttachments: { [key: string]: string[] } = {
            Farmer: [
                "farmer_photo",
                "rin_pustika",
                "signature",
                "auth_letter",
                "sign_verification",
            ],
            Trader: [
                "license",
                "gst",
                "udhayam_aadhar",
                "sign_verification",
                "auth_letter",
            ],
            "Seed Company": [
                "license",
                "gst",
                "aggrement_letter",
                "udhayam_aadhar",
                "auth_letter",
                "sign_verification",
            ],
            "Government Organization": [
                "license",
                "gst",
                "udhayam_aadhar",
                "sign_verification",
                "auth_letter",
            ],
            "Corporate/Service agency": [
                "license",
                "gst",
                "aggrement_letter",
                "udhayam_aadhar",
                "auth_letter",
                "sign_verification",
            ],
            Supervisor: [],
            splicer: [],
            "Cable lying": [],
        };

        try {
            const customerData: any = {
                name,
                category,
                contact,
                email,
                contactPersonName,
                contactPersonEmail,
                contactPersonPhoneNumber,
                pin_code,
                currency_id,
                registration_type_id,
                credit_limit,
                customer_type,
                pan_no,
                pan_avl_id,
                state,
                address,
                officeAddress,
            };

            if (category === "Farmer") {
                customerData.village = village;
                customerData.tehsil = tehsil;
                customerData.post = post;
                customerData.district = district;
                customerData.aadharNumber = aadharNumber;
                customerData.fatherName = fatherName;
                customerData.gstNumber = null;
            } else {
                customerData.city = city;
                customerData.district = district;
                if (
                    [
                        "Trader",
                        "Seed Company",
                        "Government Organization",
                        "Corporate/Service agency",
                    ].includes(category)
                ) {
                    customerData.gstNumber = gstNumber;
                }
            }

            // Update subsidiary reference if provided (allow setting to null if empty string)
            if (subsidiary_id !== undefined) {
                customerData.subsidiary_id =
                    subsidiary_id === "" ? null : Number(subsidiary_id);
            }

            await customer.update(customerData);

            const files = req.files as
                | { [fieldname: string]: Express.Multer.File[] }
                | undefined;
            if (files && Object.keys(files).length > 0) {
                const attachmentTypes = Object.keys(files);
                const allowedAttachments = validAttachments[category] || [];

                await Attachment.destroy({
                    where: {
                        relatedId: customer.id,
                        relatedType: "Customer",
                        type: attachmentTypes,
                    },
                });

                const attachmentsData = [];

                for (const fieldName of attachmentTypes) {
                    if (allowedAttachments.includes(fieldName) && files[fieldName][0]) {
                        const file = files[fieldName][0];
                        const validTillField = `${fieldName}_validTill`;
                        const validTill = req.body[validTillField];

                        attachmentsData.push({
                            fileName: file.originalname,
                            filePath: file.path,
                            mimeType: file.mimetype,
                            type: fieldName,
                            relatedId: customer.id,
                            relatedType: "Customer",
                            validTill: validTill ? new Date(validTill) : undefined,
                        });
                    }
                }

                if (attachmentsData.length > 0) {
                    await Attachment.bulkCreate(attachmentsData);
                }
            }

            res.status(StatusCodes.OK).json({
                message: "Customer updated successfully",
                success: true,
                result: customer,
            });
        } catch (error: any) {
            if (error instanceof UniqueConstraintError) {
                const field = error.errors?.[0]?.path;
                const message = `${field} must be unique`;
                res
                    .status(StatusCodes.BAD_REQUEST)
                    .json({ message, field, success: false });
            } else if (error instanceof ValidationError) {
                res.status(StatusCodes.BAD_REQUEST).json({
                    message: "Validation error",
                    success: false,
                    errors: error.errors.map((e) => ({
                        field: e.path,
                        message: e.message,
                    })),
                });
            }

            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                message: "Internal server error",
                success: false,
            });
        }
    }),

    deleteCustomer: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;

        const company = await findCompanyForUser(req.user);

        const companyId = company?.id;
        if (!companyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User not authenticated or company not found");
        }

        const customer = await Customer.findOne({
            where: { id: Number(id), CompanyId: companyId },
        });

        if (!customer) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Customer not found");
        }

        await Attachment.destroy({
            where: {
                relatedId: customer.id,
                relatedType: "Customer",
            },
        });

        await customer.destroy();
        res.status(StatusCodes.OK).json({
            message: "Customer deleted successfully",
            success: true,
            result: null,
        });
    }),
};

export default CustomerController;