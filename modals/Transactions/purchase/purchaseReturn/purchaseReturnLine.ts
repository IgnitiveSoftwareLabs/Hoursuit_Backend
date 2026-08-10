import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import ItemMaster from "../../../masters/items/itemMaster";
import sequelize from "../../../../dbconfig/dbconfig";
import { PurchaseReturnHeader } from "./index";
import { GRNLine } from "../GRN";

export interface PurchaseReturnLineAttributes {
    id: number;
    returnHeaderId: number;
    grnLineId?: number | null;
    itemId: number;
    batchNo?: string | null;
    returnQty: number;
    rejectedQty?: number;
    damagedQty?: number;
    unitPrice: number;
    reason?: string | null;
    remarks?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface PurchaseReturnLineCreationAttributes
    extends Optional<
        PurchaseReturnLineAttributes,
        | "id"
        | "grnLineId"
        | "batchNo"
        | "rejectedQty"
        | "damagedQty"
        | "reason"
        | "unitPrice"
        | "remarks"
        | "createdAt"
        | "updatedAt"
    > { }

class PurchaseReturnLine
    extends Model<
        PurchaseReturnLineAttributes,
        PurchaseReturnLineCreationAttributes
    >
    implements PurchaseReturnLineAttributes {
    public id!: number;
    public returnHeaderId!: number;
    public grnLineId!: number | null;
    public itemId!: number;
    public batchNo!: string | null;
    public returnQty!: number;
    public rejectedQty!: number;
    public damagedQty!: number;
    public unitPrice!: number;
    public reason!: string | null;
    public remarks!: string | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    public static validatePurchaseReturnLine(line: PurchaseReturnLineCreationAttributes) {
        const schema = Joi.object({
            returnHeaderId: Joi.number().integer().positive().required(),
            grnLineId: Joi.number().integer().positive().optional().allow(null),
            itemId: Joi.number().integer().positive().required(),
            batchNo: Joi.string().max(100).optional(),
            returnQty: Joi.number().positive().required(),
            rejectedQty: Joi.number().positive().optional(),
            damagedQty: Joi.number().positive().optional(),
            unitPrice: Joi.number().positive().required(),
            reason: Joi.string().max(500).optional(),
            remarks: Joi.string().max(500).optional(),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(line);
    }
}

PurchaseReturnLine.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        returnHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        grnLineId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        itemId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        batchNo: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        returnQty: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
        },
        rejectedQty: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0,
        },
        damagedQty: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0,
        },
        unitPrice: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
        },
        reason: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        sequelize,
        modelName: "PurchaseReturnLine",
        tableName: "purchase_return_lines",
        timestamps: true,
    }
);

PurchaseReturnLine.belongsTo(PurchaseReturnHeader, { foreignKey: "returnHeaderId", as: "purchaseReturnHeader", onDelete: "CASCADE" });
PurchaseReturnLine.belongsTo(GRNLine, { foreignKey: "grnLineId", as: "grnLine", onDelete: "CASCADE" });
PurchaseReturnLine.belongsTo(ItemMaster, { foreignKey: "itemId", as: "item", onDelete: "CASCADE" });
PurchaseReturnHeader.hasMany(PurchaseReturnLine, { foreignKey: "returnHeaderId", as: "purchaseReturnLines", onDelete: "CASCADE" });
GRNLine.hasMany(PurchaseReturnLine, { foreignKey: "grnLineId", as: "purchaseReturnLines", onDelete: "CASCADE" });
ItemMaster.hasMany(PurchaseReturnLine, { foreignKey: "itemId", as: "purchaseReturnLines", onDelete: "CASCADE" });

export default PurchaseReturnLine;