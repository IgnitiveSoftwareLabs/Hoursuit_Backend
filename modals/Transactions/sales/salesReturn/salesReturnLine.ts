import { Model, DataTypes, Optional } from "sequelize";

import WorkCategory from "../../../masters/workCategory/workCatMaster";
import HSNSACMaster from "../../../masters/HSN-SAC/HSNSACMaster";
import Warehouse from "../../../masters/warehouse/warehouse";
import ItemMaster from "../../../masters/items/itemMaster";
import UOMMaster from "../../../masters/UOM/UOMMaster";
import sequelize from "../../../../dbconfig/dbconfig";
import SalesReturnHeader from "./salesReturnHeader";
import Company from "../../../company/company";
import User from "../../../user/user";

export interface SalesReturnLineAttributes {
    id: number;
    salesReturnHeaderId: number;
    salesOrderLineId?: number | null;
    deliveryChallanLineId?: number | null;
    itemId: number;
    batchNo?: string | null;
    returnQty: number;
    approvedQty?: number;
    rejectedQty?: number;
    damagedQty?: number;
    unitPrice?: number;
    lineTotal?: number;
    reason?: string | null;
    status: "PENDING" | "APPROVED" | "REJECTED" | "DAMAGED";
    remarks?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface SalesReturnLineCreationAttributes
    extends Optional<
        SalesReturnLineAttributes,
        | "id"
        | "salesOrderLineId"
        | "deliveryChallanLineId"
        | "batchNo"
        | "approvedQty"
        | "rejectedQty"
        | "damagedQty"
        | "unitPrice"
        | "lineTotal"
        | "reason"
        | "remarks"
        | "createdAt"
        | "updatedAt"
    > { }

class SalesReturnLine
    extends Model<
        SalesReturnLineAttributes,
        SalesReturnLineCreationAttributes
    >
    implements SalesReturnLineAttributes {
    public id!: number;
    public salesReturnHeaderId!: number;
    public salesOrderLineId!: number | null;
    public deliveryChallanLineId!: number | null;
    public itemId!: number;
    public batchNo!: string | null;
    public returnQty!: number;
    public approvedQty!: number;
    public rejectedQty!: number;
    public damagedQty!: number;
    public unitPrice!: number;
    public lineTotal!: number;
    public reason!: string | null;
    public status!: "PENDING" | "APPROVED" | "REJECTED" | "DAMAGED";
    public remarks!: string | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

SalesReturnLine.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        salesReturnHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        salesOrderLineId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        deliveryChallanLineId: {
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
        approvedQty: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0,
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
            defaultValue: 0,
        },
        lineTotal: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0,
        },
        reason: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM(
                "PENDING",
                "APPROVED",
                "REJECTED",
                "DAMAGED"
            ),
            allowNull: false,
            defaultValue: "PENDING",
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        sequelize,
        modelName: "SalesReturnLine",
        tableName: "sales_return_lines",
        timestamps: true,
    }
);

// Associations
SalesReturnLine.belongsTo(SalesReturnHeader, {
    foreignKey: "salesReturnHeaderId",
    as: "salesReturnHeader",
    onDelete: "CASCADE"
});
SalesReturnLine.belongsTo(Company, { foreignKey: "CompanyId", as: "company" });
SalesReturnLine.belongsTo(User, { foreignKey: "user_id", as: "user" });
SalesReturnLine.belongsTo(ItemMaster, { foreignKey: "item_id", as: "item" });
SalesReturnLine.belongsTo(HSNSACMaster, { foreignKey: "hsn_sac_id", as: "hsnSac" });
SalesReturnLine.belongsTo(UOMMaster, { foreignKey: "uom_id", as: "uom" });
SalesReturnLine.belongsTo(WorkCategory, { foreignKey: "work_category_id", as: "workCategory" });

// Reverse associations
SalesReturnHeader.hasMany(SalesReturnLine, {
    foreignKey: "salesReturnHeaderId",
    as: "lineItems",
    onDelete: "CASCADE"
});
Company.hasMany(SalesReturnLine, { foreignKey: "CompanyId", as: "salesReturnLines" });
User.hasMany(SalesReturnLine, { foreignKey: "user_id", as: "salesReturnLines" });
ItemMaster.hasMany(SalesReturnLine, { foreignKey: "item_id", as: "salesReturnLines" });
HSNSACMaster.hasMany(SalesReturnLine, { foreignKey: "hsn_sac_id", as: "salesReturnLines" });
UOMMaster.hasMany(SalesReturnLine, { foreignKey: "uom_id", as: "salesReturnLines" });
Warehouse.hasMany(SalesReturnLine, { foreignKey: "warehouse_id", as: "salesReturnLines" });
WorkCategory.hasMany(SalesReturnLine, { foreignKey: "work_category_id", as: "salesReturnLines" });
SalesReturnLine.belongsTo(Warehouse, { foreignKey: "warehouse_id", as: "warehouse" });

export default SalesReturnLine;