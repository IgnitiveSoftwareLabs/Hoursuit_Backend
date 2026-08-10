import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";
import sequelize from "../../../dbconfig/dbconfig";
import Company from "../../company/company";
import User from "../../user/user";
import SubsidiaryMaster from "../subsidiaries/subsdiaryMaster";

// Interface for the model attributes
interface TransportationModeAttributes {
    id: number;
    mode_name: string;
    subsidiary_id?: number | null;
    company_id: number;
    user_id: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

// Interface for creation attributes (id is optional on create)
interface TransportationModeCreationAttributes
    extends Optional<TransportationModeAttributes, "id"> { }

// Sequelize model class
class TransportationMode
    extends Model<
        TransportationModeAttributes,
        TransportationModeCreationAttributes
    >
    implements TransportationModeAttributes {
    public id!: number;
    public mode_name!: string;
    public subsidiary_id?: number | null;
    public company_id!: number;
    public user_id!: number;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    // Joi validation schema
    static validateTransportationMode(mode: TransportationModeAttributes) {
        const schema = Joi.object({
            mode_name: Joi.string().min(2).max(100).required(),
            subsidiary_id: Joi.number().integer().positive().optional().allow(null),
            company_id: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(mode);
    }
}

// Sequelize initialization
TransportationMode.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        mode_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
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
        tableName: "transportation_modes",
        sequelize,
        timestamps: true,
    }
);

// Model associations
TransportationMode.belongsTo(Company, {
    foreignKey: "company_id",
    as: "company",
    onDelete: "CASCADE",
});

Company.hasMany(TransportationMode, {
    foreignKey: "company_id",
    as: "transportationModes",
    onDelete: "CASCADE",
});

TransportationMode.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "RESTRICT",
});

User.hasMany(TransportationMode, {
    foreignKey: "user_id",
    as: "transportationModes",
    onDelete: "RESTRICT",
});

TransportationMode.belongsTo(SubsidiaryMaster, {
    foreignKey: "subsidiary_id",
    as: "subsidiary",
    onDelete: "RESTRICT",
});

SubsidiaryMaster.hasMany(TransportationMode, {
    foreignKey: "subsidiary_id",
    as: "transportationModes",
    onDelete: "RESTRICT",
});

export default TransportationMode;