import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op, Sequelize } from "sequelize";
import bcrypt from "bcryptjs";

import SubsidiaryMaster from "../../modals/masters/subsidiaries/subsdiaryMaster";
import VendorDetails, { VendorAddressBook, VendorSubsidiary } from "../../modals/masters/vendorDetails/vendorDetails";
import UserPermission from "../../modals/userPermission/userPermission";
import { findCompanyForUser } from "../../utils/findCompanyForUser";
import { CustomRequest } from "../../typeRequest/customReq";
import Permission from "../../modals/permission/permission";
import sequelize from "../../dbconfig/dbconfig";
import User from "../../modals/user/user";
import CurrencyMaster from "../../modals/masters/currency/currencyMaster";
import ChartOfAccountMaster from "../../modals/masters/chartOfAccount/chartOfAccount";

const VendorController = {
    // Create a new vendor (with NetSuite architecture & sublists)
    createVendor: asyncHandler(async (req: CustomRequest, res: Response) => {
        const transaction = await sequelize.transaction();

        try {
            const {
                // NetSuite Primary Info
                entity_id,
                vendor_type,
                salutation,
                first_name,
                middle_name,
                last_name,
                company_name,
                legal_name,
                category_id,
                web_address,
                comments,
                email,
                phone,
                alt_phone,
                fax,

                // Financial Defaults & AP Config
                terms_id,
                credit_limit,
                opening_balance,
                opening_balance_account_id,
                default_payables_account_id,
                default_payment_account_id,
                primary_subsidiary_id,
                subsidiary_id,
                currency_id,

                // Tax & Statutory
                gstin,
                aadhar_no,
                tin_no,
                pan_avl_id,
                registration_type_id,

                // Sublists
                addressBook,
                subsidiaryAssignments,

                // Legacy flat address support
                address,
                city_id,
                state_code_id,

                // Vendor User credentials
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

            const resolvedEmail = Email || email;
            if (resolvedEmail) {
                const existingUser = await User.findOne({
                    where: {
                        Email: resolvedEmail,
                        company_id: company.id,
                    },
                });

                if (existingUser) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error("A user with this email already exists in the company");
                }
            }

            const resolvedPassword = Password || "Vendor@12345";
            const hashedPassword = await bcrypt.hash(resolvedPassword, 10);
            const resolvedFirstName = FirstName || company_name || "Vendor";
            const resolvedLastName = LastName || "Master";

            // Create user account for vendor portal access
            const vendorUser = await User.create(
                {
                    FirstName: resolvedFirstName,
                    LastName: resolvedLastName,
                    Email: resolvedEmail || `vendor_${Date.now()}@temp.com`,
                    Password: hashedPassword,
                    Phone: Phone || phone || null,
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
                    await UserPermission.bulkCreate(permissionEntries, { transaction });
                }
            } catch (permissionError) {
                console.error("Error assigning default permissions to vendor:", permissionError);
            }

            // Validate primary subsidiary
            const incomingSubId = primary_subsidiary_id || subsidiary_id;
            let validatedSubsidiaryId: number | null = null;
            if (incomingSubId !== undefined && incomingSubId !== null && incomingSubId !== "") {
                const sub = await SubsidiaryMaster.findByPk(Number(incomingSubId));
                if (!sub || sub.CompanyId !== company.id) {
                    await transaction.rollback();
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error("Invalid subsidiary for this company");
                }
                validatedSubsidiaryId = Number(incomingSubId);
            }

            const selectedVendorType = vendor_type || "COMPANY";
            if (selectedVendorType === "COMPANY" && (!company_name || !String(company_name).trim())) {
                await transaction.rollback();
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Company name is mandatory when vendor type is COMPANY");
            }

            const resolvedCompanyName = selectedVendorType === "COMPANY"
                ? String(company_name).trim()
                : (company_name && String(company_name).trim() !== "" ? String(company_name).trim() : null);

            const normalizedGstin = gstin && gstin.trim() !== "" ? gstin.trim() : null;

            // Create Vendor Details Entity
            const vendor = await VendorDetails.create(
                {
                    entity_id: entity_id || null,
                    vendor_type: vendor_type || "COMPANY",
                    salutation: salutation || null,
                    first_name: first_name || null,
                    middle_name: middle_name || null,
                    last_name: last_name || null,
                    company_name: resolvedCompanyName,
                    legal_name: legal_name || null,
                    category_id: category_id ? Number(category_id) : null,
                    web_address: web_address || null,
                    comments: comments || null,
                    email: email || resolvedEmail || null,
                    phone: phone || Phone || null,
                    alt_phone: alt_phone || null,
                    fax: fax || null,

                    terms_id: terms_id ? Number(terms_id) : null,
                    credit_limit: credit_limit ? Number(credit_limit) : 0.00,
                    opening_balance: opening_balance ? Number(opening_balance) : 0.00,
                    opening_balance_account_id: opening_balance_account_id ? Number(opening_balance_account_id) : null,
                    default_payables_account_id: default_payables_account_id ? Number(default_payables_account_id) : null,
                    default_payment_account_id: default_payment_account_id ? Number(default_payment_account_id) : null,
                    primary_subsidiary_id: validatedSubsidiaryId,
                    subsidiary_id: validatedSubsidiaryId,
                    currency_id: currency_id ? Number(currency_id) : null,

                    gstin: normalizedGstin,
                    aadhar_no: aadhar_no || null,
                    tin_no: tin_no || null,
                    pan_avl_id: pan_avl_id ? Number(pan_avl_id) : null,
                    registration_type_id: registration_type_id ? Number(registration_type_id) : null,

                    address: address || undefined,
                    city_id: city_id ? Number(city_id) : undefined,
                    state_code_id: state_code_id ? Number(state_code_id) : undefined,

                    company_id: company.id,
                    user_id: vendorUser.id,
                    isActive: true,
                },
                { transaction }
            );

            // Handle AddressBook Sublist
            let addressBookInput = req.body.addressBook;
            if (typeof addressBookInput === "string") {
                try { addressBookInput = JSON.parse(addressBookInput); } catch (e) {}
            }

            if (Array.isArray(addressBookInput) && addressBookInput.length > 0) {
                const addressEntries = addressBookInput.map((addr: any, index: number) => ({
                    vendor_id: vendor.id,
                    label: addr.label || (index === 0 ? "Primary Address" : `Address ${index + 1}`),
                    attention: addr.attention || null,
                    addressee: addr.addressee || resolvedCompanyName || "Vendor",
                    addr1: addr.addr1 || addr.address || "N/A",
                    addr2: addr.addr2 || null,
                    city_id: addr.city_id ? Number(addr.city_id) : null,
                    state_code_id: addr.state_code_id ? Number(addr.state_code_id) : null,
                    zip: addr.zip || null,
                    country_id: addr.country_id ? Number(addr.country_id) : null,
                    default_billing: Boolean(addr.default_billing ?? addr.defaultBilling ?? (index === 0)),
                    default_shipping: Boolean(addr.default_shipping ?? addr.defaultShipping ?? (index === 0)),
                }));

                await VendorAddressBook.bulkCreate(addressEntries, { transaction });
            } else if (address || addr1Fallback(req.body)) {
                await VendorAddressBook.create(
                    {
                        vendor_id: vendor.id,
                        label: "Primary Address",
                        addressee: resolvedCompanyName,
                        addr1: address || req.body.addr1 || "Default Address",
                        city_id: city_id ? Number(city_id) : null,
                        state_code_id: state_code_id ? Number(state_code_id) : null,
                        default_billing: true,
                        default_shipping: true,
                    },
                    { transaction }
                );
            }

            // Handle SubsidiaryAssignments Sublist
            let subAssignmentsInput = req.body.subsidiaryAssignments;
            if (typeof subAssignmentsInput === "string") {
                try { subAssignmentsInput = JSON.parse(subAssignmentsInput); } catch (e) {}
            }

            if (Array.isArray(subAssignmentsInput) && subAssignmentsInput.length > 0) {
                const subEntries = subAssignmentsInput.map((sub: any) => ({
                    vendor_id: vendor.id,
                    subsidiary_id: Number(sub.subsidiary_id || sub.subsidiary),
                    credit_limit: sub.credit_limit ? Number(sub.credit_limit) : null,
                    tax_code_id: sub.tax_code_id ? Number(sub.tax_code_id) : null,
                    is_primary: Boolean(sub.is_primary || (validatedSubsidiaryId === Number(sub.subsidiary_id || sub.subsidiary))),
                }));

                await VendorSubsidiary.bulkCreate(subEntries, { transaction });
            } else if (validatedSubsidiaryId) {
                await VendorSubsidiary.create(
                    {
                        vendor_id: vendor.id,
                        subsidiary_id: validatedSubsidiaryId,
                        is_primary: true,
                    },
                    { transaction }
                );
            }

            await transaction.commit();

            const createdVendor = await VendorDetails.findByPk(vendor.id, {
                include: [
                    { association: "addressBook", include: ["city", "state"] },
                    { association: "subsidiaryAssignments", include: [{ association: "subsidiary", attributes: ["id", "subsidiary_name"] }] },
                    { association: "primarySubsidiary", attributes: ["id", "subsidiary_name"] },
                    { association: "user", attributes: ["id", "FirstName", "LastName", "Email", "Phone", "Type"] },
                ],
            });

            res.status(StatusCodes.CREATED).json({
                message: "Vendor created successfully with NetSuite architecture",
                success: true,
                result: createdVendor,
            });
        } catch (error: any) {
            await transaction.rollback();
            res.status(StatusCodes.INTERNAL_SERVER_ERROR);
            throw new Error(error.message || "Failed to create vendor");
        }
    }),

    // Get all vendors with NetSuite includes and pagination
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
                Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("company_name")), {
                    [Op.like]: `%${search}%`,
                }),
                Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("entity_id")), {
                    [Op.like]: `%${search}%`,
                }),
                Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("legal_name")), {
                    [Op.like]: `%${search}%`,
                }),
                Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("email")), {
                    [Op.like]: `%${search}%`,
                }),
                Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("gstin")), {
                    [Op.like]: `%${search}%`,
                }),
            ];
        }

        const vendorInclude = [
            {
                association: "addressBook",
                include: ["city", "state"],
                required: false,
            },
            {
                association: "subsidiaryAssignments",
                include: [{ association: "subsidiary", attributes: ["id", "subsidiary_name"] }],
                required: false,
            },
            {
                association: "primarySubsidiary",
                attributes: ["id", "subsidiary_name"],
                required: false,
            },
            {
                association: "user",
                attributes: ["id", "FirstName", "LastName", "Email", "Phone", "Type"],
                required: false,
            },
            {
                association: "currency",
                attributes: ["id", "currency_name", "currency_code", "currency_symbol"],
                required: false,
            },
            {
                association: "defaultPayablesAccount",
                attributes: ["id", "account_number", "account_name"],
                required: false,
            },
            {
                association: "defaultPaymentAccount",
                attributes: ["id", "account_number", "account_name"],
                required: false,
            },
            {
                association: "openingBalanceAccount",
                attributes: ["id", "account_number", "account_name"],
                required: false,
            },
            {
                association: "registration_type",
                attributes: ["id", "registration_type"],
                required: false,
            },
            {
                association: "pan_availability",
                attributes: ["id", "name"],
                required: false,
            },
            {
                association: "terms",
                attributes: ["id", "name", "term_type", "days_till_net_due", "discount_percent", "days_till_discount_expires"],
                required: false,
            },
        ];

        if (option) {
            const vendors = await VendorDetails.findAll({
                where,
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
            include: [
                { association: "addressBook", include: ["city", "state"] },
                { association: "subsidiaryAssignments", include: [{ association: "subsidiary", attributes: ["id", "subsidiary_name"] }] },
                { association: "primarySubsidiary", attributes: ["id", "subsidiary_name"] },
                { association: "user", attributes: ["id", "FirstName", "LastName", "Email", "Phone", "Type"] },
                { association: "currency", attributes: ["id", "currency_name", "currency_code", "currency_symbol"] },
                { association: "defaultPayablesAccount", attributes: ["id", "account_number", "account_name"] },
                { association: "defaultPaymentAccount", attributes: ["id", "account_number", "account_name"] },
                { association: "openingBalanceAccount", attributes: ["id", "account_number", "account_name"] },
                { association: "registration_type", attributes: ["id", "registration_type"] },
                { association: "pan_availability", attributes: ["id", "name"] },
                { association: "terms", attributes: ["id", "name", "term_type", "days_till_net_due", "discount_percent", "days_till_discount_expires"] },
            ],
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
        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid vendor ID is required");
        }

        const transaction = await sequelize.transaction();

        try {
            const vendor: any = await VendorDetails.findByPk(Number(id), {
                include: [{ model: User, as: "user" }],
                transaction,
            });

            if (!vendor) {
                await transaction.rollback();
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Vendor not found");
            }

            const {
                entity_id,
                vendor_type,
                salutation,
                first_name,
                middle_name,
                last_name,
                company_name,
                legal_name,
                category_id,
                web_address,
                comments,
                email,
                phone,
                alt_phone,
                fax,
                terms_id,
                credit_limit,
                opening_balance,
                opening_balance_account_id,
                default_payables_account_id,
                default_payment_account_id,
                primary_subsidiary_id,
                subsidiary_id,
                currency_id,
                gstin,
                aadhar_no,
                tin_no,
                pan_avl_id,
                registration_type_id,
                isActive,
                Password,
                FirstName,
                LastName,
                Email,
                Phone,
            } = req.body;

            const incomingSubId = primary_subsidiary_id !== undefined ? primary_subsidiary_id : subsidiary_id;
            let validatedSubsidiaryId = vendor.primary_subsidiary_id;

            if (incomingSubId !== undefined) {
                if (incomingSubId === null || incomingSubId === "") {
                    validatedSubsidiaryId = null;
                } else {
                    const sub = await SubsidiaryMaster.findByPk(Number(incomingSubId));
                    if (!sub || sub.CompanyId !== vendor.company_id) {
                        await transaction.rollback();
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error("Invalid subsidiary for this company");
                    }
                    validatedSubsidiaryId = Number(incomingSubId);
                }
            }

            const effectiveVendorType = vendor_type !== undefined ? vendor_type : vendor.vendor_type;
            const effectiveCompanyName = company_name !== undefined ? company_name : vendor.company_name;

            if (effectiveVendorType === "COMPANY" && (!effectiveCompanyName || !String(effectiveCompanyName).trim())) {
                await transaction.rollback();
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Company name is mandatory when vendor type is COMPANY");
            }

            if (entity_id !== undefined) vendor.entity_id = entity_id;
            if (vendor_type !== undefined) vendor.vendor_type = vendor_type;
            if (salutation !== undefined) vendor.salutation = salutation;
            if (first_name !== undefined) vendor.first_name = first_name;
            if (middle_name !== undefined) vendor.middle_name = middle_name;
            if (last_name !== undefined) vendor.last_name = last_name;
            if (company_name !== undefined) {
                vendor.company_name = effectiveVendorType === "INDIVIDUAL" && (!company_name || !String(company_name).trim())
                    ? null
                    : company_name;
            }
            if (legal_name !== undefined) vendor.legal_name = legal_name;
            if (category_id !== undefined) vendor.category_id = category_id ? Number(category_id) : null;
            if (web_address !== undefined) vendor.web_address = web_address;
            if (comments !== undefined) vendor.comments = comments;
            if (email !== undefined) vendor.email = email;
            if (phone !== undefined) vendor.phone = phone;
            if (alt_phone !== undefined) vendor.alt_phone = alt_phone;
            if (fax !== undefined) vendor.fax = fax;

            if (terms_id !== undefined) vendor.terms_id = terms_id ? Number(terms_id) : null;
            if (credit_limit !== undefined) vendor.credit_limit = credit_limit ? Number(credit_limit) : 0.00;
            if (opening_balance !== undefined) vendor.opening_balance = opening_balance ? Number(opening_balance) : 0.00;
            if (opening_balance_account_id !== undefined) vendor.opening_balance_account_id = opening_balance_account_id ? Number(opening_balance_account_id) : null;
            if (default_payables_account_id !== undefined) vendor.default_payables_account_id = default_payables_account_id ? Number(default_payables_account_id) : null;
            if (default_payment_account_id !== undefined) vendor.default_payment_account_id = default_payment_account_id ? Number(default_payment_account_id) : null;
            if (currency_id !== undefined) vendor.currency_id = currency_id ? Number(currency_id) : null;
            vendor.primary_subsidiary_id = validatedSubsidiaryId;

            if (gstin !== undefined) vendor.gstin = gstin && gstin.trim() !== "" ? gstin.trim() : null;
            if (aadhar_no !== undefined) vendor.aadhar_no = aadhar_no;
            if (tin_no !== undefined) vendor.tin_no = tin_no;
            if (pan_avl_id !== undefined) vendor.pan_avl_id = pan_avl_id ? Number(pan_avl_id) : null;
            if (registration_type_id !== undefined) vendor.registration_type_id = registration_type_id ? Number(registration_type_id) : null;
            if (req.body.address !== undefined) vendor.address = req.body.address;
            if (req.body.city_id !== undefined) vendor.city_id = req.body.city_id ? Number(req.body.city_id) : null;
            if (req.body.state_code_id !== undefined) vendor.state_code_id = req.body.state_code_id ? Number(req.body.state_code_id) : null;
            if (isActive !== undefined) vendor.isActive = isActive;

            if (vendor.user) {
                if (FirstName) vendor.user.FirstName = FirstName;
                if (LastName) vendor.user.LastName = LastName;
                if (Email) vendor.user.Email = Email;
                if (Phone) vendor.user.Phone = Phone;
                if (Password) {
                    vendor.user.Password = await bcrypt.hash(Password, 10);
                }
                await vendor.user.save({ transaction });
            }

            let subAssignmentsInput = req.body.subsidiaryAssignments;
            if (typeof subAssignmentsInput === "string") {
                try { subAssignmentsInput = JSON.parse(subAssignmentsInput); } catch (e) {}
            }

            if (Array.isArray(subAssignmentsInput)) {
                await VendorSubsidiary.destroy({ where: { vendor_id: vendor.id }, transaction });
                if (subAssignmentsInput.length > 0) {
                    const subEntries = subAssignmentsInput.map((sub: any) => ({
                        vendor_id: vendor.id,
                        subsidiary_id: Number(sub.subsidiary_id || sub.subsidiary),
                        credit_limit: sub.credit_limit ? Number(sub.credit_limit) : null,
                        tax_code_id: sub.tax_code_id ? Number(sub.tax_code_id) : null,
                        is_primary: Boolean(sub.is_primary || (validatedSubsidiaryId === Number(sub.subsidiary_id || sub.subsidiary))),
                    }));
                    await VendorSubsidiary.bulkCreate(subEntries, { transaction });
                }
            }

            if (validatedSubsidiaryId) {
                const hasPrimary = Array.isArray(subAssignmentsInput) && subAssignmentsInput.some(
                    (s: any) => Number(s.subsidiary_id || s.subsidiary) === validatedSubsidiaryId
                );
                if (!hasPrimary) {
                    await VendorSubsidiary.findOrCreate({
                        where: { vendor_id: vendor.id, subsidiary_id: validatedSubsidiaryId },
                        defaults: { vendor_id: vendor.id, subsidiary_id: validatedSubsidiaryId, is_primary: true },
                        transaction,
                    });
                }
            }

            let addressBookInput = req.body.addressBook;
            if (typeof addressBookInput === "string") {
                try { addressBookInput = JSON.parse(addressBookInput); } catch (e) {}
            }

            if (Array.isArray(addressBookInput)) {
                await VendorAddressBook.destroy({ where: { vendor_id: vendor.id }, transaction });
                if (addressBookInput.length > 0) {
                    const addressEntries = addressBookInput.map((addr: any, index: number) => ({
                        vendor_id: vendor.id,
                        label: addr.label || (index === 0 ? "Primary Address" : `Address ${index + 1}`),
                        attention: addr.attention || null,
                        addressee: addr.addressee || effectiveCompanyName || "Vendor",
                        addr1: addr.addr1 || addr.address || "N/A",
                        addr2: addr.addr2 || null,
                        city_id: addr.city_id ? Number(addr.city_id) : null,
                        state_code_id: addr.state_code_id ? Number(addr.state_code_id) : null,
                        zip: addr.zip || null,
                        country_id: addr.country_id ? Number(addr.country_id) : null,
                        default_billing: Boolean(addr.default_billing ?? addr.defaultBilling ?? (index === 0)),
                        default_shipping: Boolean(addr.default_shipping ?? addr.defaultShipping ?? (index === 0)),
                    }));
                    await VendorAddressBook.bulkCreate(addressEntries, { transaction });
                }
            }

            await vendor.save({ transaction });
            await transaction.commit();

            const updatedVendor = await VendorDetails.findByPk(vendor.id, {
                include: [
                    { association: "addressBook", include: ["city", "state"] },
                    { association: "subsidiaryAssignments", include: [{ association: "subsidiary", attributes: ["id", "subsidiary_name"] }] },
                    { association: "primarySubsidiary", attributes: ["id", "subsidiary_name"] },
                    { association: "user", attributes: ["id", "FirstName", "LastName", "Email", "Phone", "Type"] },
                ],
            });

            res.status(StatusCodes.OK).json({
                message: "Vendor updated successfully",
                success: true,
                result: updatedVendor,
            });
        } catch (err: any) {
            await transaction.rollback();
            throw new Error(err.message || "Error updating vendor");
        }
    }),

    // Delete vendor
    deleteVendor: asyncHandler(async (req: CustomRequest, res: Response) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;

            if (!id || isNaN(Number(id))) {
                res.status(StatusCodes.BAD_REQUEST);
                throw new Error("Valid vendor ID is required");
            }

            const vendor = await VendorDetails.findByPk(Number(id), { transaction });
            if (!vendor) {
                await transaction.rollback();
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("Vendor not found");
            }

            const user = await User.findByPk(vendor.user_id, { transaction });
            await vendor.destroy({ transaction });
            if (user) {
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

    // Add address book sublist entry
    addAddress: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const vendor = await VendorDetails.findByPk(Number(id));
        if (!vendor) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Vendor not found");
        }

        const { label, attention, addressee, addr1, addr2, city_id, state_code_id, zip, country_id, default_billing, default_shipping } = req.body;
        if (!addr1) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Address line 1 (addr1) is required");
        }

        const newAddress = await VendorAddressBook.create({
            vendor_id: vendor.id,
            label: label || "Branch Address",
            attention: attention || null,
            addressee: addressee || vendor.company_name,
            addr1,
            addr2: addr2 || null,
            city_id: city_id ? Number(city_id) : null,
            state_code_id: state_code_id ? Number(state_code_id) : null,
            zip: zip || null,
            country_id: country_id ? Number(country_id) : null,
            default_billing: !!default_billing,
            default_shipping: !!default_shipping,
        });

        res.status(StatusCodes.CREATED).json({
            message: "Address added successfully to vendor address book",
            success: true,
            result: newAddress,
        });
    }),

    // Update address book sublist entry
    updateAddress: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id, addressId } = req.params;
        const address = await VendorAddressBook.findOne({
            where: { id: Number(addressId), vendor_id: Number(id) },
        });

        if (!address) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Address entry not found for vendor");
        }

        await address.update(req.body);

        res.status(StatusCodes.OK).json({
            message: "Address updated successfully",
            success: true,
            result: address,
        });
    }),

    // Delete address book sublist entry
    deleteAddress: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id, addressId } = req.params;
        const address = await VendorAddressBook.findOne({
            where: { id: Number(addressId), vendor_id: Number(id) },
        });

        if (!address) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Address entry not found for vendor");
        }

        await address.destroy();

        res.status(StatusCodes.OK).json({
            message: "Address entry deleted successfully",
            success: true,
            result: null,
        });
    }),

    // Assign subsidiary to vendor
    assignSubsidiary: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { subsidiary_id, credit_limit, tax_code_id, is_primary } = req.body;

        const vendor = await VendorDetails.findByPk(Number(id));
        if (!vendor) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Vendor not found");
        }

        const sub = await SubsidiaryMaster.findByPk(Number(subsidiary_id));
        if (!sub || sub.CompanyId !== vendor.company_id) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Invalid subsidiary for this company");
        }

        const assignment = await VendorSubsidiary.create({
            vendor_id: vendor.id,
            subsidiary_id: Number(subsidiary_id),
            credit_limit: credit_limit ? Number(credit_limit) : null,
            tax_code_id: tax_code_id ? Number(tax_code_id) : null,
            is_primary: !!is_primary,
        });

        if (is_primary) {
            vendor.primary_subsidiary_id = Number(subsidiary_id);
            await vendor.save();
        }

        res.status(StatusCodes.CREATED).json({
            message: "Subsidiary assigned successfully to vendor",
            success: true,
            result: assignment,
        });
    }),

    // Remove subsidiary assignment from vendor
    removeSubsidiary: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id, subsidiaryId } = req.params;
        const assignment = await VendorSubsidiary.findOne({
            where: { vendor_id: Number(id), subsidiary_id: Number(subsidiaryId) },
        });

        if (!assignment) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Subsidiary assignment not found for vendor");
        }

        await assignment.destroy();

        res.status(StatusCodes.OK).json({
            message: "Subsidiary assignment removed successfully",
            success: true,
            result: null,
        });
    }),
};

function addr1Fallback(body: any): boolean {
    return !!body.addr1;
}

export default VendorController;