import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import { PurchaseOrderLine } from "../purchaseOrder/index";
import ItemMaster from "../../../masters/items/itemMaster";
import sequelize from "../../../../dbconfig/dbconfig";
import Company from "../../../company/company";
import User from "../../../user/user";
import GRN from "./GRNHeader";

interface GRNLineAttributes {
    id: number;
    grnHeaderId: number;
    purchaseOrderLineId?: number | null;
    itemId: number;
    orderedQty: number;
    receivedQty: number;
    acceptedQty: number;
    rejectedQty: number;
    batchNo?: string | null;
    serialNo?: string | null;
    manufacturingDate?: Date | null;
    expiryDate?: Date | null;
    qcRequired: boolean;
    status:
    | "PENDING"
    | "QC_PENDING"
    | "ACCEPTED"
    | "REJECTED"
    | "PARTIAL_ACCEPTED";
    remarks?: string | null;
    CompanyId: number;
    user_id: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface GRNLineCreationAttributes
    extends Optional<
        GRNLineAttributes,
        | "id"
        | "purchaseOrderLineId"
        | "orderedQty"
        | "receivedQty"
        | "acceptedQty"
        | "rejectedQty"
        | "qcRequired"
        | "status"
        | "batchNo"
        | "serialNo"
        | "manufacturingDate"
        | "expiryDate"
        | "remarks"
        | "user_id"
    > { }

class GRNLine
    extends Model<GRNLineAttributes, GRNLineCreationAttributes>
    implements GRNLineAttributes {
    public id!: number;
    public grnHeaderId!: number;
    public purchaseOrderLineId?: number | null;
    public itemId!: number;
    public orderedQty!: number;
    public receivedQty!: number;
    public acceptedQty!: number;
    public rejectedQty!: number;
    public batchNo?: string | null;
    public serialNo?: string | null;
    public manufacturingDate?: Date | null;
    public expiryDate?: Date | null;
    public qcRequired!: boolean;
    public status!:
        | "PENDING"
        | "QC_PENDING"
        | "ACCEPTED"
        | "REJECTED"
        | "PARTIAL_ACCEPTED";
    public remarks?: string | null;
    public CompanyId!: number;
    public user_id!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateGRNLine(data: GRNLineCreationAttributes) {
        const schema = Joi.object({
            grnHeaderId: Joi.number().integer().positive().required(),
            purchaseOrderLineId: Joi.number().integer().positive().optional().allow(null),
            itemId: Joi.number().integer().positive().required(),
            orderedQty: Joi.number().positive().required(),
            receivedQty: Joi.number().positive().required(),
            acceptedQty: Joi.number().min(0).required(),
            rejectedQty: Joi.number().min(0).required(),
            batchNo: Joi.string().max(100).optional().allow(null, ""),
            serialNo: Joi.string().max(100).optional().allow(null, ""),
            manufacturingDate: Joi.date().optional().allow(null),
            expiryDate: Joi.date().optional().allow(null),
            qcRequired: Joi.boolean().optional().required(),
            status: Joi.string().valid(
                "PENDING",
                "QC_PENDING",
                "ACCEPTED",
                "REJECTED",
                "PARTIAL_ACCEPTED"
            ).required(),
            remarks: Joi.string().max(1000).optional().allow(null, ""),
            CompanyId: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
        });
        return schema.validate(data);
    }
}

GRNLine.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        grnHeaderId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: GRN,
                key: "id",
            },
        },
        purchaseOrderLineId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: PurchaseOrderLine,
                key: "id",
            },
        },
        itemId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: ItemMaster,
                key: "id",
            },
        },
        orderedQty: {
            type: DataTypes.DECIMAL(15, 4),
            allowNull: false,
            defaultValue: 0,
        },
        receivedQty: {
            type: DataTypes.DECIMAL(15, 4),
            allowNull: false,
            defaultValue: 0,
        },
        acceptedQty: {
            type: DataTypes.DECIMAL(15, 4),
            allowNull: false,
            defaultValue: 0,
        },
        rejectedQty: {
            type: DataTypes.DECIMAL(15, 4),
            allowNull: false,
            defaultValue: 0,
        },
        batchNo: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        serialNo: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        manufacturingDate: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        expiryDate: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        qcRequired: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false,
        },
        status: {
            type: DataTypes.ENUM(
                "PENDING",
                "QC_PENDING",
                "ACCEPTED",
                "REJECTED",
                "PARTIAL_ACCEPTED"
            ),
            allowNull: false,
            defaultValue: "PENDING",
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        CompanyId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: Company,
                key: "id",
            },
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
    },
    {
        sequelize,
        modelName: "GRNLine",
        tableName: "grn_lines",
        timestamps: true,
        indexes: [
            {
                fields: ["grnHeaderId"],
            },
            {
                fields: ["purchaseOrderLineId"],
            },
            {
                fields: ["itemId"],
            },
            {
                fields: ["status"],
            },
        ],
    }
);

// ASSOCIATIONS
GRNLine.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
    onDelete: "CASCADE",
});
User.hasMany(GRNLine, {
    foreignKey: "user_id",
    as: "grnLines",
});
GRNLine.belongsTo(User, { foreignKey: "user_id", as: "user", onDelete: "CASCADE" });
Company.hasMany(GRNLine, {
    foreignKey: "CompanyId",
    as: "grnLines",
});
GRNLine.belongsTo(GRN, {
    foreignKey: "grnHeaderId",
    as: "grnHeader",
    onDelete: "CASCADE",
});
GRN.hasMany(GRNLine, {
    foreignKey: "grnHeaderId",
    as: "lineItems",
});
GRNLine.belongsTo(PurchaseOrderLine, {
    foreignKey: "purchaseOrderLineId",
    as: "purchaseOrderLine",
    onDelete: "SET NULL",
});
PurchaseOrderLine.hasMany(GRNLine, {
    foreignKey: "purchaseOrderLineId",
    as: "grnLines",
});
GRNLine.belongsTo(ItemMaster, {
    foreignKey: "itemId",
    as: "item",
});
ItemMaster.hasMany(GRNLine, {
    foreignKey: "itemId",
    as: "grnLines",
});

export default GRNLine;