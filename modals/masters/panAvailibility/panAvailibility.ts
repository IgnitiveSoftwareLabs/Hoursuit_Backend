import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import sequelize from "../../../dbconfig/dbconfig";
import Company from "../../company/company";
import User from "../../user/user";

interface PanAvailibilityAttributes {
    id: number;
    name: string;
    user_id: number;
    CompanyId: number;
    isActive?: boolean | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface PanAvailibilityCreationAttributes extends Optional<PanAvailibilityAttributes, "id"> { }

class PanAvailibility extends Model<PanAvailibilityAttributes, PanAvailibilityCreationAttributes>
    implements PanAvailibilityAttributes {
    public id!: number;
    public name!: string;
    public isActive!: boolean;
    public user_id!: number;
    public CompanyId!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validatePanAvailibility(panAvailibility: PanAvailibilityAttributes) {
        const schema = Joi.object({
            name: Joi.string().min(2).max(100).required(),
            CompanyId: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(panAvailibility);
    }
}

PanAvailibility.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
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
        tableName: "pan_availibilities",
        sequelize,
        timestamps: true,
    }
);

// Associations
PanAvailibility.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
    onDelete: "CASCADE",
});

PanAvailibility.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "RESTRICT",
});

Company.hasMany(PanAvailibility, {
    foreignKey: "CompanyId",
    as: "panAvailibilities",
    onDelete: "CASCADE",
});

User.hasMany(PanAvailibility, {
    foreignKey: "user_id",
    as: "panAvailibilities",
    onDelete: "RESTRICT",
});

export default PanAvailibility;