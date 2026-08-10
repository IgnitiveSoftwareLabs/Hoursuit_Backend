import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import ChartOfAccountMaster from "../masters/chartOfAccount/chartOfAccount";
import sequelize from "../../dbconfig/dbconfig";
import Company from "../company/company";
import User from "../user/user";

interface GLBalanceAttributes {
    id: number;
    CompanyId: number;
    account_id: number;
    opening_balance: number;
    debit_amount: number;
    credit_amount: number;
    closing_balance: number;
    period_month: number;
    period_year: number;
    user_id: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface GLBalanceCreationAttributes
    extends Optional<GLBalanceAttributes, "id"> { }

class GLBalance
    extends Model<GLBalanceAttributes, GLBalanceCreationAttributes>
    implements GLBalanceAttributes {
    public id!: number;
    public CompanyId!: number;
    public account_id!: number;
    public opening_balance!: number;
    public debit_amount!: number;
    public credit_amount!: number;
    public closing_balance!: number;
    public period_month!: number;
    public period_year!: number;
    public user_id!: number;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateGLBalance(m: GLBalanceAttributes) {
        const schema = Joi.object({
            CompanyId: Joi.number().integer().positive().required(),
            account_id: Joi.number().integer().positive().required(),
            opening_balance: Joi.number().required(),
            debit_amount: Joi.number().required(),
            credit_amount: Joi.number().required(),
            closing_balance: Joi.number().required(),
            period_month: Joi.number().integer().min(1).max(12).required(),
            period_year: Joi.number().integer().min(2000).required(),
            user_id: Joi.number().integer().positive().required(),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(m);
    }
}

GLBalance.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        CompanyId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: Company, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        },
        account_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: ChartOfAccountMaster, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        opening_balance: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        debit_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        credit_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        closing_balance: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        period_month: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        period_year: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
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
        tableName: "gl_balances",
        sequelize,
        timestamps: true,
        indexes: [
            {
                unique: true,
                name: "unique_gl_balance_per_period",
                fields: ["account_id", "CompanyId", "period_year", "period_month"],
            },
        ],
    }
);

GLBalance.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
    onDelete: "CASCADE",
});

GLBalance.belongsTo(ChartOfAccountMaster, {
    foreignKey: "account_id",
    as: "account",
    onDelete: "RESTRICT",
});

GLBalance.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "RESTRICT",
});

Company.hasMany(GLBalance, {
    foreignKey: "CompanyId",
    as: "glBalances",
    onDelete: "CASCADE",
});

ChartOfAccountMaster.hasMany(GLBalance, {
    foreignKey: "account_id",
    as: "glBalances",
    onDelete: "RESTRICT",
});

User.hasMany(GLBalance, {
    foreignKey: "user_id",
    as: "glBalances",
    onDelete: "RESTRICT",
});

export default GLBalance;