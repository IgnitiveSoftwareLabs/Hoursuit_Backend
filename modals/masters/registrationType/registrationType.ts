import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import sequelize from "../../../dbconfig/dbconfig";
import Company from "../../company/company";
import User from "../../user/user";

interface RegistrationTypeAttributes {
    id: number;
    registration_type: string;
    user_id: number;
    CompanyId: number;
    isActive?: boolean | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface RegistrationTypeCreationAttributes extends Optional<RegistrationTypeAttributes, "id"> { }

class RegistrationType extends Model<RegistrationTypeAttributes, RegistrationTypeCreationAttributes>
    implements RegistrationTypeAttributes {
    public id!: number;
    public registration_type!: string;
    public isActive!: boolean;
    public user_id!: number;
    public CompanyId!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateRegistrationType(registrationType: RegistrationTypeAttributes) {
        const schema = Joi.object({
            registration_type: Joi.string().min(2).max(100).required(),
            CompanyId: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(registrationType);
    }
}

RegistrationType.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        registration_type: {
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
        tableName: "registration_types",
        sequelize,
        timestamps: true,
    }
);

// Associations
RegistrationType.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
    onDelete: "CASCADE",
});

RegistrationType.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "RESTRICT",
});

Company.hasMany(RegistrationType, {
    foreignKey: "CompanyId",
    as: "registrationTypes",
    onDelete: "CASCADE",
});

User.hasMany(RegistrationType, {
    foreignKey: "user_id",
    as: "registrationTypes",
    onDelete: "RESTRICT",
});

export default RegistrationType;