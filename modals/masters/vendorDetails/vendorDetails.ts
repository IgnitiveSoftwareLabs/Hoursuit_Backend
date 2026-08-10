import { Model, DataTypes, Optional, Op } from "sequelize";
import Joi from "joi";

import RegistrationType from "../registrationType/registrationType";
import PanAvailability from "../panAvailibility/panAvailibility";
import SubsidiaryMaster from "../subsidiaries/subsdiaryMaster";
import CurrencyMaster from "../currency/currencyMaster";
import sequelize from "../../../dbconfig/dbconfig";
import Company from "../../company/company";
import StateCode from "../state/state";
import CityMaster from "../city/city";
import User from "../../user/user";

// Interface definition
interface VendorDetailsAttributes {
    id: number;
    vendor_name: string;
    gstin: string | null;
    address: string;
    city_id: number;
    state_code_id: number;
    subsidiary_id?: number | null;
    currency_id?: number | null;
    registration_type_id?: number | null;
    pan_avl_id?: number | null;
    company_id: number;
    user_id: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface VendorDetailsCreationAttributes
    extends Optional<VendorDetailsAttributes, "id"> { }

class VendorDetails
    extends Model<VendorDetailsAttributes, VendorDetailsCreationAttributes>
    implements VendorDetailsAttributes {
    public id!: number;
    public vendor_name!: string;
    public gstin!: string | null;
    public address!: string;
    public city_id!: number;
    public state_code_id!: number;
    public subsidiary_id?: number | null;
    public currency_id?: number | null;
    public registration_type_id?: number | null;
    public pan_avl_id?: number | null;
    public company_id!: number;
    public user_id!: number;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateVendorDetails(vendor: VendorDetailsAttributes) {
        const schema = Joi.object({
            vendor_name: Joi.string().min(2).max(200).required(),
            gstin: Joi.string()
                .pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
                .optional()
                .allow("", null),
            address: Joi.string().min(5).max(500).required(),
            city_id: Joi.number().integer().positive().required(),
            subsidiary_id: Joi.number().integer().positive().optional().allow(null),
            state_code_id: Joi.number().integer().positive().required(),
            company_id: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
            currency_id: Joi.number().integer().positive().optional().allow(null),
            registration_type_id: Joi.number().integer().positive().optional().allow(null),
            pan_avl_id: Joi.number().integer().positive().optional().allow(null),
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
        vendor_name: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        gstin: {
            type: DataTypes.STRING(15),
            allowNull: true,
            validate: {
                len: [0, 15],
            },
        },
        address: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        city_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: CityMaster,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        subsidiary_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: SubsidiaryMaster,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        state_code_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: StateCode,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
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
        currency_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: CurrencyMaster,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        registration_type_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: RegistrationType,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        pan_avl_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: PanAvailability,
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
                fields: ["vendor_name", "company_id"],
            },
            {
                unique: true,
                fields: ["gstin"],
                where: {
                    gstin: {
                        [Op.ne]: null,
                    },
                },
            },
        ],
    }
);

// Associations
VendorDetails.belongsTo(Company, {
    foreignKey: "company_id",
    as: "company",
    onDelete: "CASCADE",
});

VendorDetails.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "RESTRICT",
});

VendorDetails.belongsTo(CityMaster, {
    foreignKey: "city_id",
    as: "city",
    onDelete: "RESTRICT",
});

VendorDetails.belongsTo(StateCode, {
    foreignKey: "state_code_id",
    as: "state",
    onDelete: "RESTRICT",
});

// Reverse Associations
Company.hasMany(VendorDetails, {
    foreignKey: "company_id",
    as: "vendors",
    onDelete: "CASCADE",
});

User.hasMany(VendorDetails, {
    foreignKey: "user_id",
    as: "vendors",
    onDelete: "RESTRICT",
});

CityMaster.hasMany(VendorDetails, {
    foreignKey: "city_id",
    as: "vendors",
    onDelete: "RESTRICT",
});

StateCode.hasMany(VendorDetails, {
    foreignKey: "state_code_id",
    as: "vendors",
    onDelete: "RESTRICT",
});

// Subsidiary association
VendorDetails.belongsTo(SubsidiaryMaster, {
    foreignKey: "subsidiary_id",
    as: "subsidiary",
    onDelete: "RESTRICT",
});

SubsidiaryMaster.hasMany(VendorDetails, {
    foreignKey: "subsidiary_id",
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

export default VendorDetails;