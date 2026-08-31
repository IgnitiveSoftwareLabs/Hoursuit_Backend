import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import ChartOfAccountMaster from "../chartOfAccount/chartOfAccount";
import SubsidiaryMaster from "../subsidiaries/subsdiaryMaster";
import ItemTypeMaster from "../../platform/itemType/itemType";
import sequelize from "../../../dbconfig/dbconfig";
import HSNSACMaster from "../HSN-SAC/HSNSACMaster";
import UOMMaster from "../UOM/UOMMaster";
import ClassMaster from "../class/classMaster";
import DepartmentMaster from "../department/departmentMaster";
import CityMaster from "../city/city";

interface ItemMasterAttributes {
    id: number;
    item_code?: string;
    item_name: string;
    item_desc?: string | null;
    item_type_id?: number | null;
    track_inventory: boolean;
    sku?: string | null;
    barcode?: string | null;
    cost_price?: number | null;
    min_stock_level?: number | null;
    hsn_sac_code_id?: number | null;
    uom_id?: number | null;
    default_rate?: number | null;
    subsidiary_id?: number | null;
    class_id?: number | null;
    department_id?: number | null;
    location_id?: number | null;
    safety_stock_level?: number | null;
    days?: number | null;
    manufacturer?: string | null;
    purchase_price?: number | null;
    total_value?: number | null;
    purchase_desc?: string | null;
    item_image?: string | null;
    sales_desc?: string | null;
    sales_price?: number | null;
    shipping_cost?: number | null;
    asset_account_id?: number | null;
    income_account_id?: number | null;
    cogs_account_id?: number | null;
    expense_account_id?: number | null;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ItemMasterCreationAttributes
    extends Optional<ItemMasterAttributes, "id"> { }

class ItemMaster
    extends Model<ItemMasterAttributes, ItemMasterCreationAttributes>
    implements ItemMasterAttributes {
    public id!: number;
    public item_code!: string;
    public item_name!: string;
    public item_desc?: string | null;
    public item_type_id?: number | null;
    public track_inventory!: boolean;
    public sku?: string | null;
    public barcode?: string | null;
    public cost_price?: number | null;
    public min_stock_level?: number | null;
    public hsn_sac_code_id?: number | null;
    public uom_id?: number | null;
    public default_rate?: number | null;
    public subsidiary_id?: number | null;
    public class_id?: number | null;
    public department_id?: number | null;
    public location_id?: number | null;
    public safety_stock_level?: number | null;
    public days?: number | null;
    public manufacturer?: string | null;
    public purchase_price?: number | null;
    public total_value?: number | null;
    public purchase_desc?: string | null;
    public item_image?: string | null;
    public sales_desc?: string | null;
    public sales_price?: number | null;
    public shipping_cost?: number | null;
    public asset_account_id?: number | null;
    public income_account_id?: number | null;
    public cogs_account_id?: number | null;
    public expense_account_id?: number | null;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateItemMaster(item: ItemMasterAttributes) {
        const schema = Joi.object({
            item_code: Joi.string().allow("").optional(),
            item_name: Joi.string().required(),
            item_desc: Joi.string().allow("").optional().allow(null),
            item_type_id: Joi.number().integer().positive().optional().allow(null),
            track_inventory: Joi.boolean().optional(),
            sku: Joi.string().allow("").optional().allow(null),
            barcode: Joi.string().allow("").optional().allow(null),
            cost_price: Joi.number().optional().allow(null),
            min_stock_level: Joi.number().optional().allow(null),
            hsn_sac_code_id: Joi.number().integer().positive().optional().allow(null),
            uom_id: Joi.number().integer().positive().optional().allow(null),
            default_rate: Joi.number().optional().allow(null),
            subsidiary_id: Joi.number().integer().positive().optional().allow(null),
            class_id: Joi.number().integer().positive().optional().allow(null),
            department_id: Joi.number().integer().positive().optional().allow(null),
            location_id: Joi.number().integer().positive().optional().allow(null),
            safety_stock_level: Joi.number().optional().allow(null),
            days: Joi.number().optional().allow(null),
            manufacturer: Joi.string().allow("").optional().allow(null),
            purchase_price: Joi.number().optional().allow(null),
            total_value: Joi.number().optional().allow(null),
            purchase_desc: Joi.string().allow("").optional().allow(null),
            item_image: Joi.string().allow("").optional().allow(null),
            sales_desc: Joi.string().allow("").optional().allow(null),
            sales_price: Joi.number().optional().allow(null),
            shipping_cost: Joi.number().optional().allow(null),
            asset_account_id: Joi.number().integer().positive().optional().allow(null),
            income_account_id: Joi.number().integer().positive().optional().allow(null),
            cogs_account_id: Joi.number().integer().positive().optional().allow(null),
            expense_account_id: Joi.number().integer().positive().optional().allow(null),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(item);
    }
}

ItemMaster.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        item_code: {
            type: DataTypes.STRING(200),
            allowNull: true,
            defaultValue: "",
        },
        item_name: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        item_desc: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: null,
        },
        item_type_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            defaultValue: null,
        },
        track_inventory: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        sku: {
            type: DataTypes.STRING(100),
            allowNull: true,
            defaultValue: "",
        },
        barcode: {
            type: DataTypes.STRING(100),
            allowNull: true,
            defaultValue: "",
        },
        cost_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: null,
        },
        min_stock_level: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: null,
        },
        hsn_sac_code_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            defaultValue: null,
        },
        uom_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            defaultValue: null,
        },
        default_rate: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: null,
        },
        subsidiary_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            defaultValue: null,
        },
        class_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            defaultValue: null,
        },
        department_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            defaultValue: null,
        },
        location_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            defaultValue: null,
        },
        safety_stock_level: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: null,
        },
        days: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null,
        },
        manufacturer: {
            type: DataTypes.STRING(200),
            allowNull: true,
            defaultValue: null,
        },
        purchase_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: null,
        },
        total_value: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: null,
        },
        purchase_desc: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: null,
        },
        item_image: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: null,
        },
        sales_desc: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: null,
        },
        sales_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: null,
        },
        shipping_cost: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: null,
        },
        asset_account_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            defaultValue: null,
        },
        income_account_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            defaultValue: null,
        },
        cogs_account_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            defaultValue: null,
        },
        expense_account_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            defaultValue: null,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        tableName: "item_masters",
        sequelize,
        timestamps: true,
    }
);

ItemMaster.belongsTo(UOMMaster, {
    foreignKey: "uom_id",
    as: "uom",
});

ItemMaster.belongsTo(HSNSACMaster, {
    foreignKey: "hsn_sac_code_id",
    as: "hsnSacCode",
});

ItemMaster.belongsTo(SubsidiaryMaster, {
    foreignKey: "subsidiary_id",
    as: "subsidiary",
});

ItemMaster.belongsTo(ClassMaster, {
    foreignKey: "class_id",
    as: "class",
});

ItemMaster.belongsTo(DepartmentMaster, {
    foreignKey: "department_id",
    as: "department",
});

ItemMaster.belongsTo(CityMaster, {
    foreignKey: "location_id",
    as: "location",
});

ItemMaster.belongsTo(ItemTypeMaster, {
    foreignKey: "item_type_id",
    as: "item_type",
});

ItemMaster.belongsTo(ChartOfAccountMaster, {
    foreignKey: "asset_account_id",
    as: "asset_account",
});

ItemMaster.belongsTo(ChartOfAccountMaster, {
    foreignKey: "income_account_id",
    as: "income_account",
});

ItemMaster.belongsTo(ChartOfAccountMaster, {
    foreignKey: "cogs_account_id",
    as: "cogs_account",
});

ItemMaster.belongsTo(ChartOfAccountMaster, {
    foreignKey: "expense_account_id",
    as: "expense_account",
});

export default ItemMaster;