import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../../../../dbconfig/dbconfig";
import ItemMaster from "../../../masters/items/itemMaster";
import PurchaseReturnFulfillmentHeader from "./purchaseReturnFulfillmentHeader";
import PurchaseReturnLine from "./purchaseReturnLine";

export interface PurchaseReturnFulfillmentLineAttributes {
    id: number;
    fulfillmentHeaderId: number;
    purchaseReturnLineId: number;
    itemId: number;
    fulfilledQty: number;
    unitPrice: number;
    warehouseId?: number | null;
    batchNo?: string | null;
    remarks?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface PurchaseReturnFulfillmentLineCreationAttributes
    extends Optional<
        PurchaseReturnFulfillmentLineAttributes,
        "id" | "warehouseId" | "batchNo" | "remarks" | "createdAt" | "updatedAt"
    > { }

export class PurchaseReturnFulfillmentLine
    extends Model<
        PurchaseReturnFulfillmentLineAttributes,
        PurchaseReturnFulfillmentLineCreationAttributes
    >
    implements PurchaseReturnFulfillmentLineAttributes {
    public id!: number;
    public fulfillmentHeaderId!: number;
    public purchaseReturnLineId!: number;
    public itemId!: number;
    public fulfilledQty!: number;
    public unitPrice!: number;
    public warehouseId!: number | null;
    public batchNo!: string | null;
    public remarks!: string | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

PurchaseReturnFulfillmentLine.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        fulfillmentHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        purchaseReturnLineId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        itemId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        fulfilledQty: {
            type: DataTypes.DECIMAL(15, 4),
            allowNull: false,
        },
        unitPrice: {
            type: DataTypes.DECIMAL(15, 4),
            allowNull: false,
            defaultValue: 0,
        },
        warehouseId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        batchNo: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        sequelize,
        modelName: "PurchaseReturnFulfillmentLine",
        tableName: "purchase_return_fulfillment_lines",
        timestamps: true,
    }
);

PurchaseReturnFulfillmentLine.belongsTo(PurchaseReturnFulfillmentHeader, { foreignKey: "fulfillmentHeaderId", as: "fulfillmentHeader", onDelete: "CASCADE" });
PurchaseReturnFulfillmentHeader.hasMany(PurchaseReturnFulfillmentLine, { foreignKey: "fulfillmentHeaderId", as: "fulfillmentLines", onDelete: "CASCADE" });

PurchaseReturnFulfillmentLine.belongsTo(PurchaseReturnLine, { foreignKey: "purchaseReturnLineId", as: "purchaseReturnLine", onDelete: "CASCADE" });
PurchaseReturnLine.hasMany(PurchaseReturnFulfillmentLine, { foreignKey: "purchaseReturnLineId", as: "fulfillmentLines", onDelete: "CASCADE" });

PurchaseReturnFulfillmentLine.belongsTo(ItemMaster, { foreignKey: "itemId", as: "item", onDelete: "CASCADE" });

export default PurchaseReturnFulfillmentLine;
