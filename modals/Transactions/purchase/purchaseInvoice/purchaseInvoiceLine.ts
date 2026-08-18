import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import { PurchaseOrderLine } from "../purchaseOrder/index";
import ItemMaster from "../../../masters/items/itemMaster";
import sequelize from "../../../../dbconfig/dbconfig";
import { PurchaseInvoiceHeader } from "./index";
import Company from "../../../company/company";
import { GRNLine } from "../GRN/index";
import User from "../../../user/user";

interface PurchaseInvoiceLineAttributes {
    id: number;
    invoiceHeaderId: number;
    poLineId?: number | null;
    grnLineId?: number | null;
    itemId: number;
    description?: string | null;
    batchNo?: string | null;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    discountAmount?: number;
    taxPercent?: number;
    taxAmount?: number;
    lineTotal: number;
    remarks?: string | null;
    CompanyId: number;
    user_id: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface PurchaseInvoiceLineCreationAttributes
    extends Optional<
        PurchaseInvoiceLineAttributes,
        | "id"
        | "poLineId"
        | "grnLineId"
        | "description"
        | "batchNo"
        | "discountPercent"
        | "discountAmount"
        | "taxPercent"
        | "taxAmount"
        | "remarks"
        | "CompanyId"
        | "user_id"
        | "createdAt"
        | "updatedAt"
    > { }

class PurchaseInvoiceLine
    extends Model<
        PurchaseInvoiceLineAttributes,
        PurchaseInvoiceLineCreationAttributes
    >
    implements PurchaseInvoiceLineAttributes {
    public id!: number;
    public invoiceHeaderId!: number;
    public poLineId!: number | null;
    public grnLineId!: number | null;
    public itemId!: number;
    public description!: string | null;
    public batchNo!: string | null;
    public quantity!: number;
    public unitPrice!: number;
    public discountPercent!: number;
    public discountAmount!: number;
    public taxPercent!: number;
    public taxAmount!: number;
    public lineTotal!: number;
    public CompanyId!: number;
    public user_id!: number;
    public remarks!: string | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateDeliveryChallanLine(line: PurchaseInvoiceLineAttributes) {
        const schema = Joi.object({
            invoiceHeaderId: Joi.number().integer().positive().required(),
            poLineId: Joi.number().integer().positive().required(),
            grnLineId: Joi.number().integer().positive().required(),
            itemId: Joi.number().integer().positive().required(),
            description: Joi.string().min(1).max(100).required(),
            batchNo: Joi.string().min(1).max(100).required(),
            quantity: Joi.number().required(),
            unitPrice: Joi.number().required(),
            discountPercent: Joi.number().required(),
            discountAmount: Joi.number().required(),
            taxPercent: Joi.number().required(),
            taxAmount: Joi.number().required(),
            lineTotal: Joi.number().required(),
            user_id: Joi.number().integer().positive().required(),
            remarks: Joi.string().max(500).optional(),
            CompanyId: Joi.number().integer().positive().required()
        });
        return schema.validate(line);
    }
}

PurchaseInvoiceLine.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        invoiceHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        poLineId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        grnLineId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        itemId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        batchNo: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        quantity: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
        },
        unitPrice: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
        },
        discountPercent: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0,
        },
        discountAmount: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0,
        },
        taxPercent: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0,
        },
        taxAmount: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0,
        },
        lineTotal: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
        },
        CompanyId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        sequelize,
        modelName: "PurchaseInvoiceLine",
        tableName: "purchase_invoice_lines",
        timestamps: true,
    }
);

// PurchaseInvoiceLine.belongsTo(PurchaseInvoiceHeader, {
//     foreignKey: "invoiceHeaderId",
//     as: "invoiceHeader",
// });

PurchaseInvoiceLine.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
    onDelete: "CASCADE",
});

Company.hasMany(PurchaseInvoiceLine, {
    foreignKey: "CompanyId",
    as: "purchaseInvoiceLines",
});

PurchaseInvoiceLine.belongsTo(GRNLine, {
    foreignKey: "grnLineId",
    as: "grnLine",
    onDelete: "SET NULL",
});
GRNLine.hasMany(PurchaseInvoiceLine, {
    foreignKey: "grnLineId",
    as: "purchaseInvoiceLines",
});

PurchaseInvoiceLine.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "CASCADE",
});

User.hasMany(PurchaseInvoiceLine, {
    foreignKey: "user_id",
    as: "purchaseInvoiceLines",
});

// PurchaseInvoiceLine.belongsTo(GRNLine, {
//     foreignKey: "grnLineId",
//     as: "grnLine",
// });

PurchaseInvoiceLine.belongsTo(ItemMaster, {
    foreignKey: "itemId",
    as: "item",
});

export default PurchaseInvoiceLine;