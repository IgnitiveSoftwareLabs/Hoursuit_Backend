import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../../../../dbconfig/dbconfig";
import Company from "../../../company/company";
import User from "../../../user/user";
import VendorDetails from "../../../masters/vendorDetails/vendorDetails";
import PurchaseReturnHeader from "./purchaseReturnHeader";

export interface PurchaseReturnFulfillmentHeaderAttributes {
    id: number;
    companyId: number;
    fulfillmentNumber: string;
    purchaseReturnHeaderId: number;
    vendorId: number;
    fulfillmentDate: Date;
    status: "DRAFT" | "FULFILLED" | "CANCELLED";
    remarks?: string | null;
    user_id: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface PurchaseReturnFulfillmentHeaderCreationAttributes
    extends Optional<
        PurchaseReturnFulfillmentHeaderAttributes,
        | "id"
        | "companyId"
        | "fulfillmentNumber"
        | "status"
        | "remarks"
        | "createdAt"
        | "updatedAt"
    > { }

export class PurchaseReturnFulfillmentHeader
    extends Model<
        PurchaseReturnFulfillmentHeaderAttributes,
        PurchaseReturnFulfillmentHeaderCreationAttributes
    >
    implements PurchaseReturnFulfillmentHeaderAttributes {
    public id!: number;
    public companyId!: number;
    public fulfillmentNumber!: string;
    public purchaseReturnHeaderId!: number;
    public vendorId!: number;
    public fulfillmentDate!: Date;
    public status!: "DRAFT" | "FULFILLED" | "CANCELLED";
    public remarks!: string | null;
    public user_id!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

PurchaseReturnFulfillmentHeader.init(
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
        fulfillmentNumber: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },
        purchaseReturnHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        vendorId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        fulfillmentDate: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM("DRAFT", "FULFILLED", "CANCELLED"),
            allowNull: false,
            defaultValue: "FULFILLED",
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
        modelName: "PurchaseReturnFulfillmentHeader",
        tableName: "purchase_return_fulfillment_headers",
        timestamps: true,
    }
);

PurchaseReturnFulfillmentHeader.belongsTo(PurchaseReturnHeader, { foreignKey: "purchaseReturnHeaderId", as: "purchaseReturnHeader", onDelete: "CASCADE" });
PurchaseReturnHeader.hasMany(PurchaseReturnFulfillmentHeader, { foreignKey: "purchaseReturnHeaderId", as: "fulfillments", onDelete: "CASCADE" });

PurchaseReturnFulfillmentHeader.belongsTo(Company, { foreignKey: "companyId", as: "company", onDelete: "CASCADE" });
PurchaseReturnFulfillmentHeader.belongsTo(User, { foreignKey: "user_id", as: "user", onDelete: "CASCADE" });
PurchaseReturnFulfillmentHeader.belongsTo(VendorDetails, { foreignKey: "vendorId", as: "vendor", onDelete: "CASCADE" });

export default PurchaseReturnFulfillmentHeader;
