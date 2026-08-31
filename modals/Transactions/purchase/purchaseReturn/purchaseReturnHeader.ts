import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import VendorDetails from "../../../masters/vendorDetails/vendorDetails";
import { PurchaseInvoiceHeader } from "../purchaseInvoice/index";
import sequelize from "../../../../dbconfig/dbconfig";
import { PurchaseOrder } from "../purchaseOrder";
import Company from "../../../company/company";
import User from "../../../user/user";
import { GRN } from "../GRN/index"

export interface PurchaseReturnHeaderAttributes {
    id: number;
    companyId: number;
    returnNumber: string;
    vendorId: number;
    purchaseOrderHeaderId?: number | null;
    purchaseInvoiceHeaderId?: number | null;
    grnHeaderId?: number | null;
    returnDate: Date;
    status: "DRAFT" | "AUTHORIZED" | "APPROVED" | "PARTIALLY_FULFILLED" | "FULFILLED" | "RETURNED" | "CANCELLED";
    reason?: string | null;
    remarks?: string | null;
    user_id: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface PurchaseReturnHeaderCreationAttributes
    extends Optional<
        PurchaseReturnHeaderAttributes,
        | "id"
        | "companyId"
        | "returnNumber"
        | "purchaseOrderHeaderId"
        | "purchaseInvoiceHeaderId"
        | "vendorId"
        | "grnHeaderId"
        | "returnDate"
        | "status"
        | "reason"
        | "remarks"
        | "user_id"
        | "createdAt"
        | "updatedAt"
    > { }

class PurchaseReturnHeader
    extends Model<
        PurchaseReturnHeaderAttributes,
        PurchaseReturnHeaderCreationAttributes
    >
    implements PurchaseReturnHeaderAttributes {
    public id!: number;
    public companyId!: number;
    public returnNumber!: string;
    public purchaseOrderHeaderId!: number | null;
    public purchaseInvoiceHeaderId!: number | null;
    public vendorId!: number;
    public grnHeaderId!: number | null;
    public returnDate!: Date;
    public status!: "DRAFT" | "AUTHORIZED" | "APPROVED" | "PARTIALLY_FULFILLED" | "FULFILLED" | "RETURNED" | "CANCELLED";
    public reason!: string | null;
    public remarks!: string | null;
    public user_id!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    public static validatePurchaseReturnHeader(header: PurchaseReturnHeaderCreationAttributes) {
        const schema = Joi.object({
            companyId: Joi.number().integer().positive().required(),
            returnNumber: Joi.string().min(1).max(100).required(),
            vendorId: Joi.number().integer().positive().required(),
            grnHeaderId: Joi.number().integer().positive().optional().allow(null),
            purchaseOrderHeaderId: Joi.number().integer().positive().optional().allow(null),
            purchaseInvoiceHeaderId: Joi.number().integer().positive().optional().allow(null),
            returnDate: Joi.date().required(),
            status: Joi.string().required(),
            user_id: Joi.number().integer().positive().required(),
            reason: Joi.string().max(500).optional(),
            remarks: Joi.string().max(500).optional(),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(header);
    }
}

PurchaseReturnHeader.init(
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
        returnNumber: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },
        vendorId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        grnHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        purchaseOrderHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        purchaseInvoiceHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        returnDate: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM(
                "DRAFT",
                "AUTHORIZED",
                "APPROVED",
                "PARTIALLY_FULFILLED",
                "FULFILLED",
                "RETURNED",
                "CANCELLED"
            ),
            allowNull: false,
            defaultValue: "DRAFT",
        },
        reason: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
    },
    {
        sequelize,
        modelName: "PurchaseReturnHeader",
        tableName: "purchase_return_headers",
        timestamps: true,
    }
);

PurchaseReturnHeader.belongsTo(PurchaseOrder, { foreignKey: "purchaseOrderHeaderId", as: "purchaseOrderHeader", onDelete: "CASCADE" });
PurchaseReturnHeader.belongsTo(PurchaseInvoiceHeader, { foreignKey: "purchaseInvoiceHeaderId", as: "purchaseInvoiceHeader", onDelete: "CASCADE" });
PurchaseReturnHeader.belongsTo(Company, { foreignKey: "companyId", as: "company", onDelete: "CASCADE" });
User.hasMany(PurchaseReturnHeader, { foreignKey: "user_id", as: "purchaseReturnHeaders", onDelete: "CASCADE" });
PurchaseReturnHeader.belongsTo(User, { foreignKey: "user_id", as: "user", onDelete: "CASCADE" });
PurchaseReturnHeader.belongsTo(VendorDetails, { foreignKey: "vendorId", as: "vendor", onDelete: "CASCADE" });
PurchaseReturnHeader.belongsTo(GRN, { foreignKey: "grnHeaderId", as: "grnHeader", onDelete: "CASCADE" });
Company.hasMany(PurchaseReturnHeader, { foreignKey: "companyId", as: "purchaseReturnHeaders", onDelete: "CASCADE" });
VendorDetails.hasMany(PurchaseReturnHeader, { foreignKey: "vendorId", as: "purchaseReturnHeaders", onDelete: "CASCADE" });
PurchaseOrder.hasMany(PurchaseReturnHeader, { foreignKey: "purchaseOrderHeaderId", as: "purchaseReturnHeaders", onDelete: "CASCADE" });
PurchaseInvoiceHeader.hasMany(PurchaseReturnHeader, { foreignKey: "purchaseInvoiceHeaderId", as: "purchaseReturnHeaders", onDelete: "CASCADE" });
GRN.hasMany(PurchaseReturnHeader, { foreignKey: "grnHeaderId", as: "purchaseReturnHeaders", onDelete: "CASCADE" });

export default PurchaseReturnHeader;