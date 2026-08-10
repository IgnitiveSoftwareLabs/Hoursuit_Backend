import { Model, DataTypes, Optional } from "sequelize";

import ItemMaster from "../../../masters/items/itemMaster";
import sequelize from "../../../../dbconfig/dbconfig";
import { SalesOrderHeader } from "./index";

export interface SalesOrderLineAttributes {
    id: number;
    salesOrderHeaderId: number;
    itemId: number;
    orderedQty: number;
    dispatchedQty?: number;
    pendingQty?: number;
    unitPrice?: number;
    discountPercent?: number;
    discountAmount?: number;
    taxPercent?: number;
    taxAmount?: number;
    lineTotal?: number;
    remarks?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface SalesOrderLineCreationAttributes
    extends Optional<
        SalesOrderLineAttributes,
        | "id"
        | "dispatchedQty"
        | "pendingQty"
        | "unitPrice"
        | "discountPercent"
        | "discountAmount"
        | "taxPercent"
        | "taxAmount"
        | "lineTotal"
        | "remarks"
        | "createdAt"
        | "updatedAt"
    > { }

class SalesOrderLine
    extends Model<
        SalesOrderLineAttributes,
        SalesOrderLineCreationAttributes
    >
    implements SalesOrderLineAttributes {
    public id!: number;
    public salesOrderHeaderId!: number;
    public itemId!: number;
    public orderedQty!: number;
    public dispatchedQty!: number;
    public pendingQty!: number;
    public unitPrice!: number;
    public discountPercent!: number;
    public discountAmount!: number;
    public taxPercent!: number;
    public taxAmount!: number;
    public lineTotal!: number;
    public remarks!: string | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

SalesOrderLine.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        salesOrderHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        itemId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        orderedQty: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
        },
        dispatchedQty: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0,
        },
        pendingQty: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0,
        },
        unitPrice: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0,
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
            defaultValue: 0,
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        sequelize,
        modelName: "SalesOrderLine",
        tableName: "sales_order_lines",
        timestamps: true,
    }
);

SalesOrderLine.belongsTo(SalesOrderHeader, { foreignKey: "salesOrderHeaderId", as: "salesOrderHeader", onDelete: "CASCADE" });
SalesOrderHeader.hasMany(SalesOrderLine, { foreignKey: "salesOrderHeaderId", as: "salesOrderLines", onDelete: "CASCADE" });
SalesOrderLine.belongsTo(ItemMaster, { foreignKey: "itemId", as: "item", onDelete: "CASCADE" });
ItemMaster.hasMany(SalesOrderLine, { foreignKey: "itemId", as: "salesOrderLines", onDelete: "CASCADE" });

export default SalesOrderLine;