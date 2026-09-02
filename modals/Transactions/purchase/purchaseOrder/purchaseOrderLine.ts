import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import TransportationMode from "../../../masters/transportMode/transportMode";
import SubsidiaryMaster from "../../../masters/subsidiaries/subsdiaryMaster";
import WorkCategory from "../../../masters/workCategory/workCatMaster";
import HSNSACMaster from "../../../masters/HSN-SAC/HSNSACMaster";
import ItemMaster from "../../../masters/items/itemMaster";
import PurchaseOrderHeader from "./purchaseOrderHeader";
import UOMMaster from "../../../masters/UOM/UOMMaster";
import sequelize from "../../../../dbconfig/dbconfig";
import CityMaster from "../../../masters/city/city";
import Company from "../../../company/company";
import User from "../../../user/user";

interface PurchaseOrderLineAttributes {
    id: number;
    purchase_order_header_id: number;
    item_id: number;
    hsn_sac_id?: number;
    work_category_id?: number;
    work_order_no?: string | null;
    lot_number?: string;
    quantity: number;
    uom_id: number;
    rate?: number;
    amount?: number;
    discount_percent?: number;
    discount_amount?: number;
    subtotal?: number;
    indian_tax_nature?: string;
    tax_rate?: number;
    tax_amount?: number;
    line_total: number;
    status: string;
    remarks?: string;
    CompanyId: number;
    user_id: number;
    isActive: boolean;
    use_rate_calculation: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface PurchaseOrderLineCreationAttributes extends Optional<PurchaseOrderLineAttributes, "id"> { }

class PurchaseOrderLine extends Model<PurchaseOrderLineAttributes, PurchaseOrderLineCreationAttributes>
    implements PurchaseOrderLineAttributes {
    public id!: number;
    public purchase_order_header_id!: number;
    public item_id!: number;
    public hsn_sac_id?: number;
    public work_order_no?: string | null;
    public work_category_id?: number | undefined;
    public lot_number?: string;
    public quantity!: number;
    public uom_id!: number;
    public rate?: number;
    public amount?: number;
    public discount_percent?: number;
    public discount_amount?: number;
    public subtotal?: number;
    public indian_tax_nature?: string;
    public tax_rate?: number;
    public tax_amount?: number;
    public line_total!: number;
    public use_rate_calculation!: boolean;
    public status!: string;
    public remarks?: string;
    public CompanyId!: number;
    public user_id!: number;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validatePurchaseOrderLine(line: PurchaseOrderLineAttributes) {
        const schema = Joi.object({
            purchase_order_header_id: Joi.number().integer().positive().required(),
            item_id: Joi.number().integer().positive().required(),
            hsn_sac_id: Joi.number().integer().positive().optional().allow(null),
            lot_number: Joi.string().min(1).max(100).optional(),
            quantity: Joi.number().positive().required(),
            work_order_no: Joi.string().min(1).max(100).optional().allow(null, ""),
            uom_id: Joi.number().integer().positive().required(),
            rate: Joi.number().min(0).optional(),
            amount: Joi.number().min(0).optional(),
            discount_percent: Joi.number().min(0).max(100).optional(),
            discount_amount: Joi.number().min(0).optional(),
            subtotal: Joi.number().min(0).optional(),
            indian_tax_nature: Joi.string().valid("Good", "Services").optional(),
            use_rate_calculation: Joi.boolean().required(),
            work_category_id: Joi.number().integer().positive().optional().allow(null),
            tax_rate: Joi.number().min(0).max(100).optional(),
            tax_amount: Joi.number().min(0).optional(),
            line_total: Joi.number().min(0).optional(),
            status: Joi.string().required(),
            remarks: Joi.string().max(500).optional(),
            CompanyId: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(line);
    }
}

PurchaseOrderLine.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        purchase_order_header_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        item_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        hsn_sac_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
        },
        work_category_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
        },
        work_order_no: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        lot_number: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        use_rate_calculation: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        quantity: {
            type: DataTypes.DECIMAL(15, 4),
            allowNull: false,
        },
        uom_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        rate: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
        },
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: 0,
        },
        discount_percent: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            defaultValue: 0,
        },
        discount_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: 0,
        },
        subtotal: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: 0,
        },
        indian_tax_nature: {
            type: DataTypes.ENUM("Good", "Services"),
            allowNull: true,
        },
        tax_rate: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            defaultValue: 0,
        },
        tax_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: 0,
        },
        line_total: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        status: {
            type: DataTypes.ENUM(
                "PENDING",
                "PARTIAL_RECEIVED",
                "COMPLETED",
                "CANCELLED"
            ),
            allowNull: false,
            defaultValue: "PENDING"
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        CompanyId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        sequelize,
        modelName: "PurchaseOrderLine",
        tableName: "purchase_order_lines",
        timestamps: true,

    }
);

// Associations
PurchaseOrderLine.belongsTo(PurchaseOrderHeader, {
    foreignKey: "purchase_order_header_id",
    as: "purchaseOrderHeader",
});
PurchaseOrderLine.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
});
PurchaseOrderLine.belongsTo(ItemMaster, {
    foreignKey: "item_id",
    as: "item",
});
PurchaseOrderLine.belongsTo(User, { foreignKey: "user_id", as: "user" });
PurchaseOrderLine.belongsTo(CityMaster, {
    foreignKey: "city_id",
    as: "city",
});
PurchaseOrderLine.belongsTo(UOMMaster, { foreignKey: "uom_id", as: "uom" });
PurchaseOrderLine.belongsTo(WorkCategory, {
    foreignKey: "work_category_id",
    as: "workCategory",
});
PurchaseOrderLine.belongsTo(HSNSACMaster, {
    foreignKey: "hsn_sac_id",
    as: "hsnSac",
});

PurchaseOrderLine.belongsTo(TransportationMode, {
    foreignKey: "transportation_mode_id",
    as: "transportationMode",
});
PurchaseOrderLine.belongsTo(SubsidiaryMaster, {
    foreignKey: "subsidiary_id",
    as: "subsidiary",
});

// Reverse associations
PurchaseOrderHeader.hasMany(PurchaseOrderLine, {
    foreignKey: "purchase_order_header_id",
    as: "purchaseOrderLines",
});
Company.hasMany(PurchaseOrderLine, {
    foreignKey: "CompanyId",
    as: "purchaseOrderLines",
});
UOMMaster.hasMany(PurchaseOrderLine, {
    foreignKey: "uom_id",
    as: "purchaseOrderLines",
});
ItemMaster.hasMany(PurchaseOrderLine, {
    foreignKey: "item_id",
    as: "purchaseOrderLines",
});
WorkCategory.hasMany(PurchaseOrderLine, {
    foreignKey: "work_category_id",
    as: "purchaseOrderLines",
});
HSNSACMaster.hasMany(PurchaseOrderLine, {
    foreignKey: "hsn_sac_id",
    as: "purchaseOrderLines",
});
User.hasMany(PurchaseOrderLine, {
    foreignKey: "user_id",
    as: "purchaseOrderLines",
});
CityMaster.hasMany(PurchaseOrderLine, {
    foreignKey: "city_id",
    as: "purchaseOrderLines",
});
TransportationMode.hasMany(PurchaseOrderLine, {
    foreignKey: "transportation_mode_id",
    as: "purchaseOrderLines",
});
SubsidiaryMaster.hasMany(PurchaseOrderLine, {
    foreignKey: "subsidiary_id",
    as: "purchaseOrderLines",
});

export default PurchaseOrderLine;