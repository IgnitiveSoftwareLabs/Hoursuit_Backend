import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";
import sequelize from "../../../dbconfig/dbconfig";
import Company from "../../company/company";
import User from "../../user/user";
import CurrencyMaster from "../currency/currencyMaster";

interface SubsidiaryAttributes {
    id: number;
    subsidiary_name: string;
    currency_id: number;
    parent_subsidiary_id?: number | null;
    CompanyId: number;
    user_id: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface SubsidiaryCreationAttributes
    extends Optional<SubsidiaryAttributes, "id"> { }

class SubsidiaryMaster
    extends Model<SubsidiaryAttributes, SubsidiaryCreationAttributes>
    implements SubsidiaryAttributes {
    public id!: number;
    public subsidiary_name!: string;
    public currency_id!: number;
    public parent_subsidiary_id?: number | null;
    public CompanyId!: number;
    public user_id!: number;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateSubsidiary(sub: SubsidiaryAttributes) {
        const schema = Joi.object({
            subsidiary_name: Joi.string().min(1).max(200).required(),
            currency_id: Joi.number().integer().positive().required(),
            parent_subsidiary_id: Joi.number()
                .integer()
                .positive()
                .optional()
                .allow(null),
            CompanyId: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(sub);
    }
}

SubsidiaryMaster.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        subsidiary_name: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        currency_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: CurrencyMaster,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        parent_subsidiary_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: "subsidiaries",
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
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
        tableName: "subsidiaries",
        sequelize,
        timestamps: true,
    }
);

// Associations
SubsidiaryMaster.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
    onDelete: "CASCADE",
});

SubsidiaryMaster.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "RESTRICT",
});

SubsidiaryMaster.belongsTo(CurrencyMaster, {
    foreignKey: "currency_id",
    as: "currency",
    onDelete: "RESTRICT",
});

// Self associations for parent subsidiary
SubsidiaryMaster.belongsTo(SubsidiaryMaster, {
    foreignKey: "parent_subsidiary_id",
    as: "parentSubsidiary",
    onDelete: "RESTRICT",
});

Company.hasMany(SubsidiaryMaster, {
    foreignKey: "CompanyId",
    as: "subsidiaries",
    onDelete: "CASCADE",
});

User.hasMany(SubsidiaryMaster, {
    foreignKey: "user_id",
    as: "subsidiaries",
    onDelete: "RESTRICT",
});

CurrencyMaster.hasMany(SubsidiaryMaster, {
    foreignKey: "currency_id",
    as: "subsidiaries",
    onDelete: "RESTRICT",
});

// Self hasMany for parent-child relation
SubsidiaryMaster.hasMany(SubsidiaryMaster, {
    foreignKey: "parent_subsidiary_id",
    as: "childSubsidiaries",
    onDelete: "RESTRICT",
});

export default SubsidiaryMaster;