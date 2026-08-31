import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import sequelize from "../../../dbconfig/dbconfig";
import Company from "../../company/company";
import User from "../../user/user";

export interface PaymentTermAttributes {
    id: number;
    name: string;
    term_type: "STANDARD" | "DATE_DRIVEN";
    days_till_net_due?: number | null;
    discount_percent?: number | null;
    days_till_discount_expires?: number | null;
    day_of_month_net_due?: number | null;
    due_next_month_if_within_days?: number | null;
    date_discount_percent?: number | null;
    day_discount_expires?: number | null;
    is_installment?: boolean;
    is_preferred?: boolean;
    isActive?: boolean;
    user_id: number;
    CompanyId: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface PaymentTermCreationAttributes extends Optional<PaymentTermAttributes, "id"> { }

export class PaymentTerm extends Model<PaymentTermAttributes, PaymentTermCreationAttributes>
    implements PaymentTermAttributes {
    public id!: number;
    public name!: string;
    public term_type!: "STANDARD" | "DATE_DRIVEN";
    public days_till_net_due?: number | null;
    public discount_percent?: number | null;
    public days_till_discount_expires?: number | null;
    public day_of_month_net_due?: number | null;
    public due_next_month_if_within_days?: number | null;
    public date_discount_percent?: number | null;
    public day_discount_expires?: number | null;
    public is_installment!: boolean;
    public is_preferred!: boolean;
    public isActive!: boolean;
    public user_id!: number;
    public CompanyId!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validatePaymentTerm(paymentTerm: PaymentTermAttributes) {
        const schema = Joi.object({
            name: Joi.string().min(1).max(100).required(),
            term_type: Joi.string().valid("STANDARD", "DATE_DRIVEN").optional(),
            days_till_net_due: Joi.number().integer().min(0).allow(null, "").optional(),
            discount_percent: Joi.number().min(0).max(100).allow(null, "").optional(),
            days_till_discount_expires: Joi.number().integer().min(0).allow(null, "").optional(),
            day_of_month_net_due: Joi.number().integer().min(1).max(31).allow(null, "").optional(),
            due_next_month_if_within_days: Joi.number().integer().min(0).allow(null, "").optional(),
            date_discount_percent: Joi.number().min(0).max(100).allow(null, "").optional(),
            day_discount_expires: Joi.number().integer().min(1).max(31).allow(null, "").optional(),
            is_installment: Joi.boolean().optional(),
            is_preferred: Joi.boolean().optional(),
            isActive: Joi.boolean().optional(),
            CompanyId: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
        });
        return schema.validate(paymentTerm);
    }
}

PaymentTerm.init(
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
        term_type: {
            type: DataTypes.ENUM("STANDARD", "DATE_DRIVEN"),
            allowNull: false,
            defaultValue: "STANDARD",
        },
        days_till_net_due: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 30,
        },
        discount_percent: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            defaultValue: 0,
        },
        days_till_discount_expires: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
        },
        day_of_month_net_due: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        due_next_month_if_within_days: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        date_discount_percent: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
        },
        day_discount_expires: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        is_installment: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        is_preferred: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
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
    },
    {
        tableName: "payment_terms",
        sequelize,
        timestamps: true,
    }
);

PaymentTerm.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
    onDelete: "CASCADE",
});

PaymentTerm.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "RESTRICT",
});

Company.hasMany(PaymentTerm, {
    foreignKey: "CompanyId",
    as: "paymentTerms",
});

export default PaymentTerm;
