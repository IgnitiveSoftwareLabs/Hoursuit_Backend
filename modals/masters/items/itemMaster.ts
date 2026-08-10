import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import sequelize from "../../../dbconfig/dbconfig";

interface ItemMasterAttributes {
    id: number;
    item_code?: string;
    item_name: string;
    item_desc?: string | null;
    item_type?: string | null;
    track_inventory: boolean;
    sku?: string | null;
    barcode?: string | null;
    cost_price?: number | null;
    min_stock_level?: number | null;
    hsn_sac_code_id?: number | null;
    uom_id?: number | null;
    default_rate?: number | null;
    subsidiary_id?: number | null;
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
    public item_type?: string | null;
    public track_inventory!: boolean;
    public sku?: string | null;
    public barcode?: string | null;
    public cost_price?: number | null;
    public min_stock_level?: number | null;
    public hsn_sac_code_id?: number | null;
    public uom_id?: number | null;
    public default_rate?: number | null;
    public subsidiary_id?: number | null;
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
            item_type: Joi.string().allow("").optional().allow(null),
            track_inventory: Joi.boolean().optional(),
            sku: Joi.string().allow("").optional().allow(null),
            barcode: Joi.string().allow("").optional().allow(null),
            cost_price: Joi.number().optional().allow(null),
            min_stock_level: Joi.number().optional().allow(null),
            hsn_sac_code_id: Joi.number().integer().positive().optional().allow(null),
            uom_id: Joi.number().integer().positive().optional().allow(null),
            default_rate: Joi.number().optional().allow(null),
            subsidiary_id: Joi.number().integer().positive().optional().allow(null),
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
        item_type: {
            type: DataTypes.STRING(50),
            allowNull: true,
            defaultValue: "",
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

export default ItemMaster;