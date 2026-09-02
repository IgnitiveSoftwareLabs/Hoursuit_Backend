import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import VendorDetails from "../../../masters/vendorDetails/vendorDetails";
import PaymentMethod from "../../../masters/paymentMethod/paymentMethod";
import sequelize from "../../../../dbconfig/dbconfig";
import Company from "../../../company/company";
import User from "../../../user/user";
import { PurchaseInvoiceHeader } from "../purchaseInvoice";

import ChartOfAccountMaster from "../../../masters/chartOfAccount/chartOfAccount";

export interface PurchasePaymentHeaderAttributes {
    id: number;
    companyId: number;
    purchaseInvoiceHeaderId: number;
    paymentNumber: string;
    paymentDate: Date;
    vendorId: number;
    paymentMethodId?: number | null;
    bankAccountId?: number | null;
    apAccountId?: number | null;
    totalAmount: number;
    currency?: string;
    exchangeRate?: number;
    referenceNo?: string | null;
    status: "DRAFT" | "POSTED" | "CANCELLED";
    remarks?: string | null;
    user_id: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface PurchasePaymentHeaderCreationAttributes
    extends Optional<
        PurchasePaymentHeaderAttributes,
        | "id"
        | "purchaseInvoiceHeaderId"
        | "paymentMethodId"
        | "bankAccountId"
        | "apAccountId"
        | "currency"
        | "exchangeRate"
        | "referenceNo"
        | "status"
        | "remarks"
        | "createdAt"
        | "updatedAt"
    > { }

class PurchasePaymentHeader
    extends Model<
        PurchasePaymentHeaderAttributes,
        PurchasePaymentHeaderCreationAttributes
    >
    implements PurchasePaymentHeaderAttributes {
    public id!: number;
    public companyId!: number;
    public purchaseInvoiceHeaderId!: number;
    public paymentNumber!: string;
    public paymentDate!: Date;
    public vendorId!: number;
    public paymentMethodId!: number | null;
    public bankAccountId!: number | null;
    public apAccountId!: number | null;
    public totalAmount!: number;
    public currency!: string;
    public exchangeRate!: number;
    public referenceNo!: string | null;
    public status!: "DRAFT" | "POSTED" | "CANCELLED";
    public remarks!: string | null;
    public user_id!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    public static validatePurchasePaymentHeader(header: PurchasePaymentHeaderCreationAttributes) {
        const schema = Joi.object({
            companyId: Joi.number().integer().positive().required(),
            purchaseInvoiceHeaderId: Joi.number().integer().positive().required(),
            paymentNumber: Joi.string().min(1).max(100).required(),
            paymentDate: Joi.date().required(),
            vendorId: Joi.number().integer().positive().required(),
            paymentMethodId: Joi.number().integer().positive().optional().allow(null),
            bankAccountId: Joi.number().integer().positive().optional().allow(null),
            apAccountId: Joi.number().integer().positive().optional().allow(null),
            totalAmount: Joi.number().positive().required(),
            currency: Joi.string().max(10).optional(),
            exchangeRate: Joi.number().positive().optional(),
            referenceNo: Joi.string().max(100).optional().allow(null, ""),
            status: Joi.string().valid("DRAFT", "POSTED", "CANCELLED").optional(),
            remarks: Joi.string().max(500).optional().allow(null, ""),
            user_id: Joi.number().integer().positive().required(),
        });
        return schema.validate(header);
    }
}

PurchasePaymentHeader.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        companyId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        purchaseInvoiceHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        paymentNumber: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },
        paymentDate: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        vendorId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: "vendor_id",
        },
        paymentMethodId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        bankAccountId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        apAccountId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: "ap_account_id",
        },
        totalAmount: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
        },
        currency: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: "INR",
        },
        exchangeRate: {
            type: DataTypes.DECIMAL(18, 6),
            allowNull: false,
            defaultValue: 1,
        },
        referenceNo: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM("DRAFT", "POSTED", "CANCELLED"),
            allowNull: false,
            defaultValue: "DRAFT",
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    {
        sequelize,
        modelName: "PurchasePaymentHeader",
        tableName: "purchase_payment_headers",
        timestamps: true,
    }
);

PurchasePaymentHeader.belongsTo(Company, { foreignKey: "companyId", as: "company", onDelete: "CASCADE" });
Company.hasMany(PurchasePaymentHeader, { foreignKey: "companyId", as: "purchasePaymentHeaders", onDelete: "CASCADE" });

PurchasePaymentHeader.belongsTo(PurchaseInvoiceHeader, {
    foreignKey: "purchaseInvoiceHeaderId",
    as: "purchaseInvoice",
    onDelete: "SET NULL",
});
PurchaseInvoiceHeader.hasMany(PurchasePaymentHeader, {
    foreignKey: "purchaseInvoiceHeaderId",
    as: "purchasePaymentHeaders",
});

PurchasePaymentHeader.belongsTo(User, { foreignKey: "user_id", as: "user", onDelete: "CASCADE" });
User.hasMany(PurchasePaymentHeader, { foreignKey: "user_id", as: "purchasePaymentHeaders", onDelete: "CASCADE" });

PurchasePaymentHeader.belongsTo(VendorDetails, { foreignKey: "vendorId", as: "vendor", onDelete: "CASCADE" });
VendorDetails.hasMany(PurchasePaymentHeader, { foreignKey: "vendorId", as: "purchasePaymentHeaders", onDelete: "CASCADE" });

PurchasePaymentHeader.belongsTo(PaymentMethod, { foreignKey: "paymentMethodId", as: "paymentMethod", onDelete: "SET NULL" });
PurchasePaymentHeader.belongsTo(ChartOfAccountMaster, { foreignKey: "bankAccountId", as: "bankAccount", onDelete: "SET NULL" });
PurchasePaymentHeader.belongsTo(ChartOfAccountMaster, { foreignKey: "apAccountId", as: "apAccount", onDelete: "SET NULL" });

export default PurchasePaymentHeader;
