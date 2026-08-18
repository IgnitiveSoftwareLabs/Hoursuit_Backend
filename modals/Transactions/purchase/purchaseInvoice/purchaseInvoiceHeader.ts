import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";
// import { PurchaseInvoiceLine } from "../../../master/";
import VendorDetails from "../../../masters/vendorDetails/vendorDetails";
import PurchaseOrder from "../purchaseOrder/purchaseOrderHeader";
import PurchaseInvoiceLine from "./purchaseInvoiceLine";
import sequelize from "../../../../dbconfig/dbconfig";
import Company from "../../../company/company";
import User from "../../../user/user";
import { GRN } from "../GRN";

interface PurchaseInvoiceHeaderAttributes {
    id: number;
    companyId: number;
    invoiceNumber: string;
    invoiceType: string;
    vendorInvoiceNumber?: string | null;
    vendorId?: number | null;
    poHeaderId?: number | null;
    grnHeaderId?: number | null;
    invoiceDate: Date;
    dueDate?: Date | null;
    currency?: string;
    exchangeRate?: number;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    // freightAmount: number;
    // otherCharges: number;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    status: "DRAFT" | "POSTED" | "PARTIAL_PAID" | "PAID" | "CANCELLED";
    user_id: number;
    remarks?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface PurchaseInvoiceHeaderCreationAttributes
    extends Optional<
        PurchaseInvoiceHeaderAttributes,
        | "id"
        | "vendorInvoiceNumber"
        | "vendorId"
        | "poHeaderId"
        | "grnHeaderId"
        | "invoiceDate"
        | "invoiceNumber"
        | "invoiceType"
        | "balanceAmount"
        | "paidAmount"
        | "totalAmount"
        | "discountAmount"
        // | "freightAmount"
        // | "otherCharges"
        | "taxAmount"
        | "subtotal"
        | "exchangeRate"
        | "currency"
        | "dueDate"
        | "remarks"
        | "user_id"
        | "createdAt"
        | "updatedAt"
    > { }

class PurchaseInvoiceHeader
    extends Model<
        PurchaseInvoiceHeaderAttributes,
        PurchaseInvoiceHeaderCreationAttributes
    >
    implements PurchaseInvoiceHeaderAttributes {
    public id!: number;
    public companyId!: number;
    public invoiceNumber!: string;
    public invoiceType!: string;
    public vendorInvoiceNumber!: string | null;
    public vendorId!: number | null;
    public poHeaderId!: number | null;
    public grnHeaderId!: number | null;
    public invoiceDate!: Date;
    public dueDate!: Date | null;
    public currency!: string;
    public exchangeRate!: number;
    public subtotal!: number;
    public taxAmount!: number;
    public discountAmount!: number;
    // public freightAmount!: number;
    // public otherCharges!: number;
    public totalAmount!: number;
    public paidAmount!: number;
    public balanceAmount!: number;
    public status!: "DRAFT" | "POSTED" | "PARTIAL_PAID" | "PAID" | "CANCELLED";
    public user_id!: number;
    public remarks!: string | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateDeliveryChallanLine(line: PurchaseInvoiceHeaderAttributes) {
        const schema = Joi.object({
            companyId: Joi.number().integer().positive().required(),
            invoiceType: Joi.string().required(),
            invoiceNumber: Joi.string().min(1).max(100).required(),
            invoiceDate: Joi.date().required(),
            dueDate: Joi.date().required(),
            status: Joi.string().required(),
            subtotal: Joi.number().required(),
            taxAmount: Joi.number().required(),
            discountAmount: Joi.number().required(),
            // freightAmount: Joi.number().required(),
            // otherCharges: Joi.number().required(),
            totalAmount: Joi.number().required(),
            paidAmount: Joi.number().required(),
            balanceAmount: Joi.number().required(),
            user_id: Joi.number().integer().positive().required(),
            remarks: Joi.string().max(500).optional(),
            CompanyId: Joi.number().integer().positive().required()
        });
        return schema.validate(line);
    }
}

PurchaseInvoiceHeader.init(
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
        invoiceNumber: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },
        invoiceType: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        vendorInvoiceNumber: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        poHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        grnHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        vendorId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: "vendor_id",
        },
        invoiceDate: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        dueDate: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        currency: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: "INR",
        },
        // exchangeRate: {
        //     type: DataTypes.DECIMAL(18, 6),
        //     allowNull: false,
        //     defaultValue: 1,
        // },
        subtotal: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0,
        },
        taxAmount: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0,
        },
        discountAmount: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0,
        },
        // freightAmount: {
        //     type: DataTypes.DECIMAL(18, 2),
        //     allowNull: false,
        //     defaultValue: 0,
        // },
        // otherCharges: {
        //     type: DataTypes.DECIMAL(18, 2),
        //     allowNull: false,
        //     defaultValue: 0,
        // },
        totalAmount: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
        },
        paidAmount: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0,
        },
        balanceAmount: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM(
                "DRAFT",
                "POSTED",
                "PARTIAL_PAID",
                "PAID",
                "CANCELLED"
            ),
            allowNull: false,
            defaultValue: "DRAFT",
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
        modelName: "PurchaseInvoiceHeader",
        tableName: "purchase_invoice_headers",
        timestamps: true,
    }
);

PurchaseInvoiceHeader.belongsTo(Company, {
    foreignKey: "companyId",
    as: "company",
    onDelete: "CASCADE",
});

Company.hasMany(PurchaseInvoiceHeader, {
    foreignKey: "companyId",
    as: "purchaseInvoiceHeaders",
    onDelete: "CASCADE",
});

PurchaseInvoiceHeader.belongsTo(GRN, {
    foreignKey: "grnHeaderId",
    as: "grn",
    onDelete: "SET NULL",
});
GRN.hasMany(PurchaseInvoiceHeader, {
    foreignKey: "grnHeaderId",
    as: "purchaseInvoices",
});

PurchaseInvoiceHeader.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "CASCADE",
});

User.hasMany(PurchaseInvoiceHeader, {
    foreignKey: "user_id",
    as: "purchaseInvoiceHeaders",
});

PurchaseInvoiceHeader.belongsTo(PurchaseOrder, {
    foreignKey: "poHeaderId",
    as: "purchaseOrder",
    onDelete: "CASCADE",
});

PurchaseOrder.hasMany(PurchaseInvoiceHeader, {
    foreignKey: "poHeaderId",
    as: "purchaseInvoiceHeaders",
    onDelete: "CASCADE",
});

PurchaseInvoiceHeader.belongsTo(VendorDetails, {
    foreignKey: "vendorId",
    as: "vendor",
    onDelete: "CASCADE",
});

VendorDetails.hasMany(PurchaseInvoiceHeader, {
    foreignKey: "vendorId",
    as: "purchaseInvoiceHeaders",
    onDelete: "CASCADE",
});

// Header -> Lines
// PurchaseInvoiceHeader.hasMany(PurchaseInvoiceLine, {
//     foreignKey: "invoiceHeaderId",
//     as: "purchaseInvoiceLines",
//     onDelete: "CASCADE",
// });
PurchaseInvoiceLine.belongsTo(PurchaseInvoiceHeader, {
    foreignKey: "invoiceHeaderId",
    as: "invoiceHeader",
    onDelete: "CASCADE",
});

PurchaseInvoiceHeader.hasMany(PurchaseInvoiceLine, {
    foreignKey: "invoiceHeaderId",
    as: "purchaseInvoiceLines",
    onDelete: "CASCADE",
});

export default PurchaseInvoiceHeader;