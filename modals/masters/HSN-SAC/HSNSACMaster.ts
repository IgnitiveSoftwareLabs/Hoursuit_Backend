import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";
import sequelize from "../../../dbconfig/dbconfig";
import Company from "../../company/company";
import User from "../../user/user";
import SubsidiaryMaster from "../subsidiaries/subsdiaryMaster";

interface HSNSACMasterAttributes {
    id: number;
    code: string;
    type: "HSN" | "SAC";
    description?: string;
    taxPercentage?: number;
    subsidiary_id?: number | null;
    CompanyId: number;
    user_id: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface HSNSACMasterCreationAttributes
    extends Optional<HSNSACMasterAttributes, "id"> { }

class HSNSACMaster
    extends Model<HSNSACMasterAttributes, HSNSACMasterCreationAttributes>
    implements HSNSACMasterAttributes {
    public id!: number;
    public code!: string;
    public type!: "HSN" | "SAC";
    public description?: string;
    public taxPercentage?: number;
    public subsidiary_id?: number | null;
    public CompanyId!: number;
    public user_id!: number;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateHSNSACMaster(hsnsac: HSNSACMasterAttributes) {
        const schema = Joi.object({
            code: Joi.string().min(4).max(20).required(),
            type: Joi.string().valid("HSN", "SAC").required(),
            description: Joi.string().min(2).max(500).optional().allow(""),
            taxPercentage: Joi.number()
                .min(0)
                .max(100)
                .precision(2)
                .optional()
                .allow(null),
            subsidiary_id: Joi.number().integer().positive().optional().allow(null),
            CompanyId: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(hsnsac);
    }
}

HSNSACMaster.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        code: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },
        type: {
            type: DataTypes.ENUM("HSN", "SAC"),
            allowNull: false,
        },
        description: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        taxPercentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            validate: {
                min: 0,
                max: 100,
            },
        },
        subsidiary_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: SubsidiaryMaster,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
        },
        CompanyId: {
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
        tableName: "hsn_sac_masters",
        sequelize,
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ["code", "CompanyId"],
            },
        ],
    }
);

// Associations
HSNSACMaster.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
    onDelete: "CASCADE",
});

HSNSACMaster.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "RESTRICT",
});

Company.hasMany(HSNSACMaster, {
    foreignKey: "CompanyId",
    as: "hsnSacCodes",
    onDelete: "CASCADE",
});

User.hasMany(HSNSACMaster, {
    foreignKey: "user_id",
    as: "hsnSacCodes",
    onDelete: "RESTRICT",
});

// Association to subsidiary (optional)
HSNSACMaster.belongsTo(SubsidiaryMaster, {
    foreignKey: "subsidiary_id",
    as: "subsidiary",
    onDelete: "SET NULL",
});

export default HSNSACMaster;