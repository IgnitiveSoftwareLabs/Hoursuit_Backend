import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import WorkCategory from "../../../masters/workCategory/workCatMaster";
import WarehouseMaster from "../../../masters/warehouse/warehouse";
import HSNSACMaster from "../../../masters/HSN-SAC/HSNSACMaster";
import ItemMaster from "../../../masters/items/itemMaster";
import UOMMaster from "../../../masters/UOM/UOMMaster";
import sequelize from "../../../../dbconfig/dbconfig";
import { DeliveryChallanHeader } from "./index";
import Company from "../../../company/company";
import User from "../../../user/user";

export interface DeliveryChallanLineAttributes {
    id: number;
    deliveryChallanHeaderId: number;
    salesOrderLineId: number;
    itemId: number;
    batchNo?: string | null;
    dispatchQty: number;
    unitPrice?: number;
    lineTotal?: number;
    remarks?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface DeliveryChallanLineCreationAttributes
    extends Optional<
        DeliveryChallanLineAttributes,
        | "id"
        | "batchNo"
        | "unitPrice"
        | "lineTotal"
        | "remarks"
        | "createdAt"
        | "updatedAt"
    > { }

class DeliveryChallanLine
    extends Model<
        DeliveryChallanLineAttributes,
        DeliveryChallanLineCreationAttributes
    >
    implements DeliveryChallanLineAttributes {
    public id!: number;
    public deliveryChallanHeaderId!: number;
    public salesOrderLineId!: number;
    public itemId!: number;
    public batchNo!: string | null;
    public dispatchQty!: number;
    public unitPrice!: number;
    public lineTotal!: number;
    public remarks!: string | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateDeliveryChallanLine(data: DeliveryChallanLineCreationAttributes) {
        const schema = Joi.object({
            deliveryChallanHeaderId: Joi.number().integer().positive().required(),
            salesOrderLineId: Joi.number().integer().positive().required(),
            itemId: Joi.number().integer().positive().required(),
            batchNo: Joi.string().max(100).optional().allow(null, ""),
            dispatchQty: Joi.number().positive().required(),
            unitPrice: Joi.number().positive().required(),
            lineTotal: Joi.number().positive().required(),
            remarks: Joi.string().max(1000).optional().allow(null, ""),
        });

        return schema.validate(data);
    }
}

DeliveryChallanLine.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        deliveryChallanHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        salesOrderLineId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        itemId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        batchNo: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        dispatchQty: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
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
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        sequelize,
        modelName: "DeliveryChallanLine",
        tableName: "delivery_challan_lines",
        timestamps: true,
    }
);

// Associations
DeliveryChallanLine.belongsTo(DeliveryChallanHeader, {
    foreignKey: "delivery_challan_header_id",
    as: "deliveryChallanHeader",
    onDelete: "CASCADE"
});
DeliveryChallanLine.belongsTo(Company, { foreignKey: "CompanyId", as: "company" });
DeliveryChallanLine.belongsTo(User, { foreignKey: "user_id", as: "user" });
DeliveryChallanLine.belongsTo(ItemMaster, { foreignKey: "item_id", as: "item" });
DeliveryChallanLine.belongsTo(HSNSACMaster, { foreignKey: "hsn_sac_id", as: "hsnSac" });
DeliveryChallanLine.belongsTo(UOMMaster, { foreignKey: "uom_id", as: "uom" });
DeliveryChallanLine.belongsTo(WorkCategory, { foreignKey: "work_category_id", as: "workCategory" });

// Reverse associations
DeliveryChallanHeader.hasMany(DeliveryChallanLine, {
    foreignKey: "delivery_challan_header_id",
    as: "lineItems",
    onDelete: "CASCADE"
});
Company.hasMany(DeliveryChallanLine, { foreignKey: "CompanyId", as: "deliveryChallanLines" });
User.hasMany(DeliveryChallanLine, { foreignKey: "user_id", as: "deliveryChallanLines" });
ItemMaster.hasMany(DeliveryChallanLine, { foreignKey: "item_id", as: "deliveryChallanLines" });
HSNSACMaster.hasMany(DeliveryChallanLine, { foreignKey: "hsn_sac_id", as: "deliveryChallanLines" });
UOMMaster.hasMany(DeliveryChallanLine, { foreignKey: "uom_id", as: "deliveryChallanLines" });
WarehouseMaster.hasMany(DeliveryChallanLine, { foreignKey: "warehouse_id", as: "deliveryChallanLines" });
WorkCategory.hasMany(DeliveryChallanLine, { foreignKey: "work_category_id", as: "deliveryChallanLines" });
DeliveryChallanLine.belongsTo(WarehouseMaster, { foreignKey: "warehouse_id", as: "warehouse" });

export default DeliveryChallanLine;