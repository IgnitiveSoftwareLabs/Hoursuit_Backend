import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import PurchaseInvoiceHeader from "../purchaseInvoice/purchaseInvoiceHeader";
import PurchasePaymentHeader from "./purchasePaymentHeader";
import sequelize from "../../../../dbconfig/dbconfig";
import Company from "../../../company/company";
import User from "../../../user/user";

export interface PurchasePaymentLineAttributes {
    id: number;
    paymentHeaderId: number;
    purchaseInvoiceHeaderId: number;
    amountPaid: number;
    remarks?: string | null;
    CompanyId: number;
    user_id: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface PurchasePaymentLineCreationAttributes
    extends Optional<
        PurchasePaymentLineAttributes,
        "id" | "remarks" | "createdAt" | "updatedAt"
    > { }

class PurchasePaymentLine
    extends Model<
        PurchasePaymentLineAttributes,
        PurchasePaymentLineCreationAttributes
    >
    implements PurchasePaymentLineAttributes {
    public id!: number;
    public paymentHeaderId!: number;
    public purchaseInvoiceHeaderId!: number;
    public amountPaid!: number;
    public remarks!: string | null;
    public CompanyId!: number;
    public user_id!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    public static validatePurchasePaymentLine(line: PurchasePaymentLineCreationAttributes) {
        const schema = Joi.object({
            paymentHeaderId: Joi.number().integer().positive().required(),
            purchaseInvoiceHeaderId: Joi.number().integer().positive().required(),
            amountPaid: Joi.number().positive().required(),
            remarks: Joi.string().max(500).optional().allow(null, ""),
            CompanyId: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
        });
        return schema.validate(line);
    }
}

PurchasePaymentLine.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        paymentHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        purchaseInvoiceHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        amountPaid: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        CompanyId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    {
        sequelize,
        modelName: "PurchasePaymentLine",
        tableName: "purchase_payment_lines",
        timestamps: true,
    }
);

PurchasePaymentLine.belongsTo(PurchasePaymentHeader, {
    foreignKey: "paymentHeaderId",
    as: "paymentHeader",
    onDelete: "CASCADE",
});
PurchasePaymentHeader.hasMany(PurchasePaymentLine, {
    foreignKey: "paymentHeaderId",
    as: "paymentLines",
    onDelete: "CASCADE",
});

PurchasePaymentLine.belongsTo(PurchaseInvoiceHeader, {
    foreignKey: "purchaseInvoiceHeaderId",
    as: "purchaseInvoiceHeader",
    onDelete: "CASCADE",
});
PurchaseInvoiceHeader.hasMany(PurchasePaymentLine, {
    foreignKey: "purchaseInvoiceHeaderId",
    as: "paymentLines",
    onDelete: "CASCADE",
});

PurchasePaymentLine.belongsTo(Company, { foreignKey: "CompanyId", as: "company", onDelete: "CASCADE" });
PurchasePaymentLine.belongsTo(User, { foreignKey: "user_id", as: "user", onDelete: "CASCADE" });

export default PurchasePaymentLine;
