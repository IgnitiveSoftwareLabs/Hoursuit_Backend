import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../../../../dbconfig/dbconfig";
import Company from "../../../company/company";
import User from "../../../user/user";
import VendorCreditHeader from "./vendorCreditHeader";
import { PurchaseInvoiceHeader } from "../purchaseInvoice/index";

export interface VendorCreditBillApplyAttributes {
    id: number;
    companyId: number;
    vendorCreditId: number;
    purchaseInvoiceId: number;
    appliedAmount: number;
    applyDate: Date;
    remarks?: string | null;
    user_id: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface VendorCreditBillApplyCreationAttributes
    extends Optional<
        VendorCreditBillApplyAttributes,
        "id" | "remarks" | "applyDate" | "createdAt" | "updatedAt"
    > { }

export class VendorCreditBillApply
    extends Model<
        VendorCreditBillApplyAttributes,
        VendorCreditBillApplyCreationAttributes
    >
    implements VendorCreditBillApplyAttributes {
    public id!: number;
    public companyId!: number;
    public vendorCreditId!: number;
    public purchaseInvoiceId!: number;
    public appliedAmount!: number;
    public applyDate!: Date;
    public remarks!: string | null;
    public user_id!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

VendorCreditBillApply.init(
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
        vendorCreditId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        purchaseInvoiceId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        appliedAmount: {
            type: DataTypes.DECIMAL(15, 4),
            allowNull: false,
            defaultValue: 0,
        },
        applyDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
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
        modelName: "VendorCreditBillApply",
        tableName: "vendor_credit_bill_applies",
        timestamps: true,
    }
);

VendorCreditBillApply.belongsTo(VendorCreditHeader, { foreignKey: "vendorCreditId", as: "vendorCredit", onDelete: "CASCADE" });
VendorCreditHeader.hasMany(VendorCreditBillApply, { foreignKey: "vendorCreditId", as: "billApplies", onDelete: "CASCADE" });

VendorCreditBillApply.belongsTo(PurchaseInvoiceHeader, { foreignKey: "purchaseInvoiceId", as: "purchaseInvoice", onDelete: "CASCADE" });
PurchaseInvoiceHeader.hasMany(VendorCreditBillApply, { foreignKey: "purchaseInvoiceId", as: "creditApplies", onDelete: "CASCADE" });

VendorCreditBillApply.belongsTo(Company, { foreignKey: "companyId", as: "company", onDelete: "CASCADE" });
VendorCreditBillApply.belongsTo(User, { foreignKey: "user_id", as: "user", onDelete: "CASCADE" });

export default VendorCreditBillApply;
