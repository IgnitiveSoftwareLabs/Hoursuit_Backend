import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../../../../dbconfig/dbconfig";
import ItemMaster from "../../../masters/items/itemMaster";
import VendorCreditHeader from "./vendorCreditHeader";
import PurchaseReturnLine from "../purchaseReturn/purchaseReturnLine";

export interface VendorCreditLineAttributes {
    id: number;
    creditHeaderId: number;
    purchaseReturnLineId?: number | null;
    itemId: number;
    creditQty: number;
    unitPrice: number;
    totalAmount: number;
    remarks?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface VendorCreditLineCreationAttributes
    extends Optional<
        VendorCreditLineAttributes,
        "id" | "purchaseReturnLineId" | "remarks" | "createdAt" | "updatedAt"
    > { }

export class VendorCreditLine
    extends Model<
        VendorCreditLineAttributes,
        VendorCreditLineCreationAttributes
    >
    implements VendorCreditLineAttributes {
    public id!: number;
    public creditHeaderId!: number;
    public purchaseReturnLineId!: number | null;
    public itemId!: number;
    public creditQty!: number;
    public unitPrice!: number;
    public totalAmount!: number;
    public remarks!: string | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

VendorCreditLine.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        creditHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        purchaseReturnLineId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        itemId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        creditQty: {
            type: DataTypes.DECIMAL(15, 4),
            allowNull: false,
        },
        unitPrice: {
            type: DataTypes.DECIMAL(15, 4),
            allowNull: false,
            defaultValue: 0,
        },
        totalAmount: {
            type: DataTypes.DECIMAL(15, 4),
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
        modelName: "VendorCreditLine",
        tableName: "vendor_credit_lines",
        timestamps: true,
    }
);

VendorCreditLine.belongsTo(VendorCreditHeader, { foreignKey: "creditHeaderId", as: "creditHeader", onDelete: "CASCADE" });
VendorCreditHeader.hasMany(VendorCreditLine, { foreignKey: "creditHeaderId", as: "creditLines", onDelete: "CASCADE" });

VendorCreditLine.belongsTo(PurchaseReturnLine, { foreignKey: "purchaseReturnLineId", as: "purchaseReturnLine", onDelete: "CASCADE" });
PurchaseReturnLine.hasMany(VendorCreditLine, { foreignKey: "purchaseReturnLineId", as: "vendorCreditLines", onDelete: "CASCADE" });

VendorCreditLine.belongsTo(ItemMaster, { foreignKey: "itemId", as: "item", onDelete: "CASCADE" });

export default VendorCreditLine;
