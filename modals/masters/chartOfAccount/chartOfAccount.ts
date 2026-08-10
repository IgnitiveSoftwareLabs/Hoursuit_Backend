import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";
import sequelize from "../../../dbconfig/dbconfig";
import Company from "../../company/company";
import User from "../../user/user";
import AccountTypeMaster from "../../platform/accountType/accountType";
import SubsidiaryMaster from "../subsidiaries/subsdiaryMaster";
import CurrencyMaster from "../currency/currencyMaster";

interface ChartOfAccountAttributes {
    id: number;
    account_number: string;
    account_name: string;
    account_type_id: number;
    subsidiary_id: number;
    parent_account_number?: string | null;
    currency_id: number;
    CompanyId: number;
    user_id: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ChartOfAccountCreationAttributes
    extends Optional<ChartOfAccountAttributes, "id"> { }

class ChartOfAccountMaster
    extends Model<ChartOfAccountAttributes, ChartOfAccountCreationAttributes>
    implements ChartOfAccountAttributes {
    public id!: number;
    public account_number!: string;
    public account_name!: string;
    public account_type_id!: number;
    public subsidiary_id!: number;
    public parent_account_number?: string | null;
    public currency_id!: number;
    public CompanyId!: number;
    public user_id!: number;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateChart(m: ChartOfAccountAttributes) {
        const schema = Joi.object({
            account_number: Joi.string().min(1).max(100).required(),
            account_name: Joi.string().min(1).max(200).required(),
            account_type_id: Joi.number().integer().positive().required(),
            subsidiary_id: Joi.number().integer().positive().optional().allow(null),
            parent_account_number: Joi.string().allow(null).optional(),
            currency_id: Joi.number().integer().positive().required(),
            CompanyId: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(m);
    }
}

ChartOfAccountMaster.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        account_number: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: "unique_account_per_company",
        },
        account_name: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        account_type_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: AccountTypeMaster, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        subsidiary_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: { model: SubsidiaryMaster, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        parent_account_number: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        currency_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: CurrencyMaster, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        CompanyId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            unique: "unique_account_per_company",
            references: { model: Company, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: User, key: "id" },
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
        tableName: "chart_of_accounts",
        sequelize,
        timestamps: true,
        indexes: [
            {
                unique: true,
                name: "unique_account_per_company",
                fields: ["account_number", "CompanyId"],
            },
        ],
    }
);

// Associations
ChartOfAccountMaster.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
    onDelete: "CASCADE",
});
ChartOfAccountMaster.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "RESTRICT",
});
ChartOfAccountMaster.belongsTo(AccountTypeMaster, {
    foreignKey: "account_type_id",
    as: "accountType",
    onDelete: "RESTRICT",
});
ChartOfAccountMaster.belongsTo(SubsidiaryMaster, {
    foreignKey: "subsidiary_id",
    as: "subsidiary",
    onDelete: "RESTRICT",
});
ChartOfAccountMaster.belongsTo(CurrencyMaster, {
    foreignKey: "currency_id",
    as: "currency",
    onDelete: "RESTRICT",
});

Company.hasMany(ChartOfAccountMaster, {
    foreignKey: "CompanyId",
    as: "chartOfAccounts",
    onDelete: "CASCADE",
});
User.hasMany(ChartOfAccountMaster, {
    foreignKey: "user_id",
    as: "chartOfAccounts",
    onDelete: "RESTRICT",
});
AccountTypeMaster.hasMany(ChartOfAccountMaster, {
    foreignKey: "account_type_id",
    as: "chartOfAccounts",
    onDelete: "RESTRICT",
});
SubsidiaryMaster.hasMany(ChartOfAccountMaster, {
    foreignKey: "subsidiary_id",
    as: "chartOfAccounts",
    onDelete: "RESTRICT",
});
CurrencyMaster.hasMany(ChartOfAccountMaster, {
    foreignKey: "currency_id",
    as: "chartOfAccounts",
    onDelete: "RESTRICT",
});

export default ChartOfAccountMaster;