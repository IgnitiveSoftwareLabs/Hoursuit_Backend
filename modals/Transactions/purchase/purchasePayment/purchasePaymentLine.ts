import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import PurchaseInvoiceHeader from "../purchaseInvoice/purchaseInvoiceHeader";
import PurchasePaymentHeader from "./purchasePaymentHeader";
import sequelize from "../../../../dbconfig/dbconfig";
import Company from "../../../company/company";
import User from "../../../user/user";
import { PurchaseInvoiceLine } from "../purchaseInvoice";

export interface PurchasePaymentLineAttributes {
    id: number;
    paymentHeaderId: number;
    purchaseInvoiceLineId: number;
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
    public purchaseInvoiceLineId!: number;
    public amountPaid!: number;
    public remarks!: string | null;
    public CompanyId!: number;
    public user_id!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    public static validatePurchasePaymentLine(line: PurchasePaymentLineCreationAttributes) {
        const schema = Joi.object({
            paymentHeaderId: Joi.number().integer().positive().required(),
            purchaseInvoiceLineId: Joi.number().integer().positive().required(),
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
        purchaseInvoiceLineId: {
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

// ============================================================
// PurchasePaymentLine <-> PurchasePaymentHeader
// ============================================================

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


// ============================================================
// PurchasePaymentLine <-> PurchaseInvoiceLine
// ============================================================

PurchasePaymentLine.belongsTo(PurchaseInvoiceLine, {
    foreignKey: "purchaseInvoiceLineId",
    as: "purchaseInvoiceLine",
    onDelete: "CASCADE",
});

PurchaseInvoiceLine.hasMany(PurchasePaymentLine, {
    foreignKey: "purchaseInvoiceLineId",
    as: "paymentLines",
    onDelete: "CASCADE",
});


// ============================================================
// PurchasePaymentLine <-> Company
// ============================================================

PurchasePaymentLine.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
    onDelete: "CASCADE",
});

Company.hasMany(PurchasePaymentLine, {
    foreignKey: "CompanyId",
    as: "purchasePaymentLines",
});


// ============================================================
// PurchasePaymentLine <-> User
// ============================================================

PurchasePaymentLine.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "CASCADE",
});

User.hasMany(PurchasePaymentLine, {
    foreignKey: "user_id",
    as: "purchasePaymentLines",
});


export default PurchasePaymentLine;