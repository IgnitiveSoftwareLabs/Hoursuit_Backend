import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import sequelize from "../../../dbconfig/dbconfig";
import Company from "../../company/company";
import User from "../../user/user";

interface PaymentMethodAttributes {
    id: number;
    name: string;
    user_id: number;
    CompanyId: number;
    isActive?: boolean | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface PaymentMethodCreationAttributes extends Optional<PaymentMethodAttributes, "id"> { }

class PaymentMethod extends Model<PaymentMethodAttributes, PaymentMethodCreationAttributes>
    implements PaymentMethodAttributes {
    public id!: number;
    public name!: string;
    public isActive!: boolean;
    public user_id!: number;
    public CompanyId!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validatePaymentMethod(paymentMethod: PaymentMethodAttributes) {
        const schema = Joi.object({
            name: Joi.string().min(2).max(100).required(),
            CompanyId: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(paymentMethod);
    }
}

PaymentMethod.init(
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
        tableName: "payment_methods",
        sequelize,
        timestamps: true,
    }
);

// Associations
PaymentMethod.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
    onDelete: "CASCADE",
});

PaymentMethod.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "RESTRICT",
});

Company.hasMany(PaymentMethod, {
    foreignKey: "CompanyId",
    as: "paymentMethods",
    onDelete: "CASCADE",
});

User.hasMany(PaymentMethod, {
    foreignKey: "user_id",
    as: "paymentMethods",
    onDelete: "RESTRICT",
});

export default PaymentMethod;