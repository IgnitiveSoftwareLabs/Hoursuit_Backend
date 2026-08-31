import { Model, DataTypes, Optional, Op } from "sequelize";
import Joi from "joi";

import RegistrationType from "../registrationType/registrationType";
import PanAvailability from "../panAvailibility/panAvailibility";
import SubsidiaryMaster from "../subsidiaries/subsdiaryMaster";
import CurrencyMaster from "../currency/currencyMaster";
import ChartOfAccountMaster from "../chartOfAccount/chartOfAccount";
import PaymentMethod from "../paymentMethod/paymentMethod";
import PaymentTerm from "../paymentTerms/paymentTerm";
import sequelize from "../../../dbconfig/dbconfig";
import Company from "../../company/company";
import User from "../../user/user";
import VendorAddressBook from "./VendorAddressBook";
import VendorSubsidiary from "./VendorSubsidiary";

// Interface definition matching NetSuite standard architecture
export interface VendorDetailsAttributes {
    id: number;
    entity_id?: string | null;
    vendor_type: "COMPANY" | "INDIVIDUAL";
    salutation?: string | null;
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
    legal_name?: string | null;
    category_id?: number | null;
    web_address?: string | null;
    comments?: string | null;
    email?: string | null;
    phone?: string | null;
    alt_phone?: string | null;
    fax?: string | null;
    terms_id?: number | null;
    credit_limit?: number | null;
    opening_balance?: number | null;
    opening_balance_account_id?: number | null;
    default_payables_account_id?: number | null;
    default_payment_account_id?: number | null;
    primary_subsidiary_id?: number | null;
    subsidiary_id?: number | null;
    currency_id?: number | null;
    gstin?: string | null;
    aadhar_no?: string | null;
    tin_no?: string | null;
    pan_avl_id?: number | null;
    registration_type_id?: number | null;
    address?: string;
    city_id?: number;
    state_code_id?: number;
    company_id: number;
    user_id: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface VendorDetailsCreationAttributes
    extends Optional<VendorDetailsAttributes, "id" | "vendor_type" | "company_name"> { }

export class VendorDetails
    extends Model<VendorDetailsAttributes, VendorDetailsCreationAttributes>
    implements VendorDetailsAttributes {
    public id!: number;
    public entity_id?: string | null;
    public vendor_type!: "COMPANY" | "INDIVIDUAL";
    public salutation?: string | null;
    public first_name?: string | null;
    public middle_name?: string | null;
    public last_name?: string | null;
    public company_name?: string | null;
    public legal_name?: string | null;
    public category_id?: number | null;
    public web_address?: string | null;
    public comments?: string | null;
    public email?: string | null;
    public phone?: string | null;
    public alt_phone?: string | null;
    public fax?: string | null;
    public terms_id?: number | null;
    public credit_limit?: number | null;
    public opening_balance?: number | null;
    public opening_balance_account_id?: number | null;
    public default_payables_account_id?: number | null;
    public default_payment_account_id?: number | null;
    public primary_subsidiary_id?: number | null;
    public currency_id?: number | null;
    public gstin?: string | null;
    public aadhar_no?: string | null;
    public tin_no?: string | null;
    public pan_avl_id?: number | null;
    public registration_type_id?: number | null;
    public address?: string;
    public city_id?: number;
    public state_code_id?: number;
    public subsidiary_id?: number | null;
    public company_id!: number;
    public user_id!: number;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateVendorDetails(vendor: VendorDetailsAttributes) {
        const schema = Joi.object({
            entity_id: Joi.string().max(50).optional().allow("", null),
            vendor_type: Joi.string().valid("COMPANY", "INDIVIDUAL").default("COMPANY").optional(),
            salutation: Joi.string().max(20).optional().allow("", null),
            first_name: Joi.string().max(100).optional().allow("", null),
            middle_name: Joi.string().max(100).optional().allow("", null),
            last_name: Joi.string().max(100).optional().allow("", null),
            company_name: Joi.when("vendor_type", {
                is: "COMPANY",
                then: Joi.string().min(2).max(255).required().messages({
                    "any.required": "Company name is required when vendor type is COMPANY",
                    "string.empty": "Company name cannot be empty when vendor type is COMPANY",
                }),
                otherwise: Joi.string().max(255).optional().allow("", null),
            }),
            legal_name: Joi.string().max(255).optional().allow("", null),
            category_id: Joi.number().integer().positive().optional().allow(null),
            web_address: Joi.string().uri().max(255).optional().allow("", null),
            comments: Joi.string().optional().allow("", null),
            email: Joi.string().email().max(100).optional().allow("", null),
            phone: Joi.string().max(30).optional().allow("", null),
            alt_phone: Joi.string().max(30).optional().allow("", null),
            fax: Joi.string().max(30).optional().allow("", null),
            address: Joi.string().optional().allow("", null),
            city_id: Joi.number().integer().positive().optional().allow(null, ""),
            state_code_id: Joi.number().integer().positive().optional().allow(null, ""),
            terms_id: Joi.number().integer().positive().optional().allow(null),
            credit_limit: Joi.number().precision(2).min(0).optional().allow(null),
            opening_balance: Joi.number().precision(2).optional().allow(null),
            opening_balance_account_id: Joi.number().integer().positive().optional().allow(null),
            default_payables_account_id: Joi.number().integer().positive().optional().allow(null),
            default_payment_account_id: Joi.number().integer().positive().optional().allow(null),
            primary_subsidiary_id: Joi.number().integer().positive().optional().allow(null),
            subsidiary_id: Joi.number().integer().positive().optional().allow(null),
            currency_id: Joi.number().integer().positive().optional().allow(null),
            gstin: Joi.string().optional().allow("", null),
            aadhar_no: Joi.string().max(20).optional().allow("", null),
            tin_no: Joi.string().max(30).optional().allow("", null),
            pan_avl_id: Joi.number().integer().positive().optional().allow(null),
            registration_type_id: Joi.number().integer().positive().optional().allow(null),
            company_id: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(vendor);
    }
}

VendorDetails.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        entity_id: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true,
        },
        vendor_type: {
            type: DataTypes.ENUM("COMPANY", "INDIVIDUAL"),
            allowNull: false,
            defaultValue: "COMPANY",
        },
        salutation: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        first_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        middle_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        last_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        company_name: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        legal_name: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        category_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
        },
        web_address: {
            type: DataTypes.STRING(255),
            allowNull: true,
            validate: {
                isUrl: true,
            },
        },
        comments: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: true,
            validate: {
                isEmail: true,
            },
        },
        phone: {
            type: DataTypes.STRING(30),
            allowNull: true,
        },
        alt_phone: {
            type: DataTypes.STRING(30),
            allowNull: true,
        },
        fax: {
            type: DataTypes.STRING(30),
            allowNull: true,
        },
        terms_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
        },
        credit_limit: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: 0.00,
        },
        opening_balance: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: 0.00,
        },
        opening_balance_account_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: ChartOfAccountMaster,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
        },
        default_payables_account_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: ChartOfAccountMaster,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
        },
        default_payment_account_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: ChartOfAccountMaster,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
        },
        primary_subsidiary_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: SubsidiaryMaster,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        currency_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: CurrencyMaster,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
        },
        gstin: {
            type: DataTypes.STRING(15),
            allowNull: true,
            validate: {
                len: [0, 15],
            },
        },
        aadhar_no: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        tin_no: {
            type: DataTypes.STRING(30),
            allowNull: true,
        },
        pan_avl_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: PanAvailability,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
        },
        registration_type_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: RegistrationType,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
        },
        company_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: Company,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: User,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        tableName: "vendor_details",
        sequelize,
        timestamps: true,
        indexes: [
            {
                unique: true,
                name: "unique_entity_id",
                fields: ["entity_id"],
            },
            {
                unique: true,
                name: "unique_gstin_non_null",
                fields: ["gstin"],
                where: {
                    gstin: {
                        [Op.ne]: null,
                    },
                },
            },
            {
                name: "idx_vendor_company",
                fields: ["company_id"],
            },
            {
                name: "idx_vendor_primary_subsidiary",
                fields: ["primary_subsidiary_id"],
            },
        ],
        hooks: {
            beforeValidate: (instance: any) => {
                if (!instance.primary_subsidiary_id && instance.subsidiary_id) {
                    instance.primary_subsidiary_id = instance.subsidiary_id;
                }
            },
        },
    }
);

// Model Associations
VendorDetails.hasMany(VendorAddressBook, {
    foreignKey: "vendor_id",
    as: "addressBook",
    onDelete: "CASCADE",
});
VendorAddressBook.belongsTo(VendorDetails, {
    foreignKey: "vendor_id",
    as: "vendor",
});

VendorDetails.hasMany(VendorSubsidiary, {
    foreignKey: "vendor_id",
    as: "subsidiaryAssignments",
    onDelete: "CASCADE",
});
VendorSubsidiary.belongsTo(VendorDetails, {
    foreignKey: "vendor_id",
    as: "vendor",
});

VendorDetails.belongsToMany(SubsidiaryMaster, {
    through: VendorSubsidiary,
    foreignKey: "vendor_id",
    otherKey: "subsidiary_id",
    as: "subsidiaries",
});
SubsidiaryMaster.belongsToMany(VendorDetails, {
    through: VendorSubsidiary,
    foreignKey: "subsidiary_id",
    otherKey: "vendor_id",
    as: "vendors",
});

VendorDetails.belongsTo(SubsidiaryMaster, {
    foreignKey: "primary_subsidiary_id",
    as: "primarySubsidiary",
    onDelete: "RESTRICT",
});

VendorDetails.belongsTo(Company, {
    foreignKey: "company_id",
    as: "company",
    onDelete: "CASCADE",
});
Company.hasMany(VendorDetails, {
    foreignKey: "company_id",
    as: "vendors",
    onDelete: "CASCADE",
});

VendorDetails.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "RESTRICT",
});
User.hasMany(VendorDetails, {
    foreignKey: "user_id",
    as: "vendors",
    onDelete: "RESTRICT",
});

VendorDetails.belongsTo(RegistrationType, {
    foreignKey: "registration_type_id",
    as: "registration_type",
    onDelete: "SET NULL",
});
RegistrationType.hasMany(VendorDetails, {
    foreignKey: "registration_type_id",
    as: "vendors",
    onDelete: "SET NULL",
});

VendorDetails.belongsTo(PanAvailability, {
    foreignKey: "pan_avl_id",
    as: "pan_availability",
    onDelete: "SET NULL",
});
PanAvailability.hasMany(VendorDetails, {
    foreignKey: "pan_avl_id",
    as: "vendors",
    onDelete: "SET NULL",
});

VendorDetails.belongsTo(CurrencyMaster, {
    foreignKey: "currency_id",
    as: "currency",
    onDelete: "SET NULL",
});
CurrencyMaster.hasMany(VendorDetails, {
    foreignKey: "currency_id",
    as: "vendors",
    onDelete: "SET NULL",
});

VendorDetails.belongsTo(ChartOfAccountMaster, {
    foreignKey: "default_payables_account_id",
    as: "defaultPayablesAccount",
    onDelete: "SET NULL",
});
VendorDetails.belongsTo(ChartOfAccountMaster, {
    foreignKey: "default_payment_account_id",
    as: "defaultPaymentAccount",
    onDelete: "SET NULL",
});
VendorDetails.belongsTo(ChartOfAccountMaster, {
    foreignKey: "opening_balance_account_id",
    as: "openingBalanceAccount",
    onDelete: "SET NULL",
});

VendorDetails.belongsTo(PaymentTerm, {
    foreignKey: "terms_id",
    as: "terms",
    onDelete: "SET NULL",
});
PaymentTerm.hasMany(VendorDetails, {
    foreignKey: "terms_id",
    as: "vendors",
    onDelete: "SET NULL",
});

export { VendorAddressBook, VendorSubsidiary };
export default VendorDetails;