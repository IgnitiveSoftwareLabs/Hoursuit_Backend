import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../../../../dbconfig/dbconfig";
import Company from "../../../company/company";
import User from "../../../user/user";
import VendorDetails from "../../../masters/vendorDetails/vendorDetails";
import PurchaseReturnHeader from "../purchaseReturn/purchaseReturnHeader";
import PurchaseReturnFulfillmentHeader from "../purchaseReturn/purchaseReturnFulfillmentHeader";
import { PurchaseInvoiceHeader } from "../purchaseInvoice/index";

export interface VendorCreditHeaderAttributes {
    id: number;
    companyId: number;
    creditNoteNumber: string;
    vendorId: number;
    purchaseReturnHeaderId?: number | null;
    fulfillmentHeaderId?: number | null;
    purchaseInvoiceHeaderId?: number | null;
    creditDate: Date;
    totalAmount: number;
    status: "DRAFT" | "POSTED" | "CANCELLED";
    remarks?: string | null;
    user_id: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface VendorCreditHeaderCreationAttributes
    extends Optional<
        VendorCreditHeaderAttributes,
        | "id"
        | "companyId"
        | "creditNoteNumber"
        | "purchaseReturnHeaderId"
        | "fulfillmentHeaderId"
        | "purchaseInvoiceHeaderId"
        | "status"
        | "remarks"
        | "createdAt"
        | "updatedAt"
    > { }

export class VendorCreditHeader
    extends Model<
        VendorCreditHeaderAttributes,
        VendorCreditHeaderCreationAttributes
    >
    implements VendorCreditHeaderAttributes {
    public id!: number;
    public companyId!: number;
    public creditNoteNumber!: string;
    public vendorId!: number;
    public purchaseReturnHeaderId!: number | null;
    public fulfillmentHeaderId!: number | null;
    public purchaseInvoiceHeaderId!: number | null;
    public creditDate!: Date;
    public totalAmount!: number;
    public status!: "DRAFT" | "POSTED" | "CANCELLED";
    public remarks!: string | null;
    public user_id!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

VendorCreditHeader.init(
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
        creditNoteNumber: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },
        vendorId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        purchaseReturnHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        fulfillmentHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        purchaseInvoiceHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        creditDate: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        totalAmount: {
            type: DataTypes.DECIMAL(15, 4),
            allowNull: false,
            defaultValue: 0,
        },
        status: {
            type: DataTypes.ENUM("DRAFT", "POSTED", "CANCELLED"),
            allowNull: false,
            defaultValue: "POSTED",
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
        modelName: "VendorCreditHeader",
        tableName: "vendor_credit_headers",
        timestamps: true,
    }
);

VendorCreditHeader.belongsTo(PurchaseReturnHeader, { foreignKey: "purchaseReturnHeaderId", as: "purchaseReturnHeader", onDelete: "CASCADE" });
PurchaseReturnHeader.hasMany(VendorCreditHeader, { foreignKey: "purchaseReturnHeaderId", as: "vendorCredits", onDelete: "CASCADE" });

VendorCreditHeader.belongsTo(PurchaseReturnFulfillmentHeader, { foreignKey: "fulfillmentHeaderId", as: "fulfillmentHeader", onDelete: "CASCADE" });
PurchaseReturnFulfillmentHeader.hasMany(VendorCreditHeader, { foreignKey: "fulfillmentHeaderId", as: "vendorCredits", onDelete: "CASCADE" });

VendorCreditHeader.belongsTo(PurchaseInvoiceHeader, { foreignKey: "purchaseInvoiceHeaderId", as: "purchaseInvoiceHeader", onDelete: "CASCADE" });

VendorCreditHeader.belongsTo(Company, { foreignKey: "companyId", as: "company", onDelete: "CASCADE" });
VendorCreditHeader.belongsTo(User, { foreignKey: "user_id", as: "user", onDelete: "CASCADE" });
VendorCreditHeader.belongsTo(VendorDetails, { foreignKey: "vendorId", as: "vendor", onDelete: "CASCADE" });

export default VendorCreditHeader;
