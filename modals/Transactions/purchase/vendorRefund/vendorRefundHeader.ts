import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../../../../dbconfig/dbconfig";
import Company from "../../../company/company";
import User from "../../../user/user";
import VendorDetails from "../../../masters/vendorDetails/vendorDetails";
import VendorCreditHeader from "../vendorCredit/vendorCreditHeader";
import ChartOfAccountMaster from "../../../masters/chartOfAccount/chartOfAccount";

export interface VendorRefundHeaderAttributes {
    id: number;
    companyId: number;
    refundNumber: string;
    vendorCreditId: number;
    vendorId: number;
    bankAccountId?: number | null;
    refundDate: Date;
    refundAmount: number;
    currency?: string;
    paymentMode?: string | null;
    referenceNumber?: string | null;
    remarks?: string | null;
    status: "DRAFT" | "POSTED" | "CANCELLED";
    user_id: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface VendorRefundHeaderCreationAttributes
    extends Optional<
        VendorRefundHeaderAttributes,
        | "id"
        | "bankAccountId"
        | "currency"
        | "paymentMode"
        | "referenceNumber"
        | "remarks"
        | "status"
        | "createdAt"
        | "updatedAt"
    > { }

export class VendorRefundHeader
    extends Model<
        VendorRefundHeaderAttributes,
        VendorRefundHeaderCreationAttributes
    >
    implements VendorRefundHeaderAttributes {
    public id!: number;
    public companyId!: number;
    public refundNumber!: string;
    public vendorCreditId!: number;
    public vendorId!: number;
    public bankAccountId!: number | null;
    public refundDate!: Date;
    public refundAmount!: number;
    public currency!: string;
    public paymentMode!: string | null;
    public referenceNumber!: string | null;
    public remarks!: string | null;
    public status!: "DRAFT" | "POSTED" | "CANCELLED";
    public user_id!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

VendorRefundHeader.init(
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
        refundNumber: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },
        vendorCreditId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        vendorId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        bankAccountId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        refundDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        refundAmount: {
            type: DataTypes.DECIMAL(15, 4),
            allowNull: false,
            defaultValue: 0,
        },
        currency: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: "INR",
        },
        paymentMode: {
            type: DataTypes.STRING(50),
            allowNull: true,
            defaultValue: "Bank Transfer",
        },
        referenceNumber: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM("DRAFT", "POSTED", "CANCELLED"),
            allowNull: false,
            defaultValue: "POSTED",
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    {
        sequelize,
        modelName: "VendorRefundHeader",
        tableName: "vendor_refund_headers",
        timestamps: true,
    }
);

VendorRefundHeader.belongsTo(VendorCreditHeader, { foreignKey: "vendorCreditId", as: "vendorCredit", onDelete: "CASCADE" });
VendorCreditHeader.hasMany(VendorRefundHeader, { foreignKey: "vendorCreditId", as: "refunds", onDelete: "CASCADE" });

VendorRefundHeader.belongsTo(VendorDetails, { foreignKey: "vendorId", as: "vendor", onDelete: "CASCADE" });
VendorRefundHeader.belongsTo(ChartOfAccountMaster, { foreignKey: "bankAccountId", as: "bankAccount", onDelete: "SET NULL" });

VendorRefundHeader.belongsTo(Company, { foreignKey: "companyId", as: "company", onDelete: "CASCADE" });
VendorRefundHeader.belongsTo(User, { foreignKey: "user_id", as: "user", onDelete: "CASCADE" });

export default VendorRefundHeader;
