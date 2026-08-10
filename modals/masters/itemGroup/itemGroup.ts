import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import SubsidiaryMaster from "../subsidiaries/subsdiaryMaster";
import sequelize from "../../../dbconfig/dbconfig";
import Company from "../../company/company";
import User from "../../user/user";

interface ItemGroupMasterAttributes {
    id: number;
    item_group_code: string;
    item_group_name: string;
    subsidiary_id?: number | null;
    CompanyId: number;
    user_id: number;
    base_rate?: number | null;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ItemGroupMasterCreationAttributes
    extends Optional<ItemGroupMasterAttributes, "id"> { }

class ItemGroupMaster
    extends Model<ItemGroupMasterAttributes, ItemGroupMasterCreationAttributes>
    implements ItemGroupMasterAttributes {
    public id!: number;
    public item_group_code!: string;
    public item_group_name!: string;
    public subsidiary_id?: number | null;
    public CompanyId!: number;
    public user_id!: number;
    public base_rate?: number | null;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateItemGroupMaster(itemGroup: ItemGroupMasterAttributes) {
        const schema = Joi.object({
            item_group_code: Joi.string().min(1).max(50).required(),
            item_group_name: Joi.string().min(2).max(100).required(),
            subsidiary_id: Joi.number().integer().positive().optional().allow(null),
            CompanyId: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
            base_rate: Joi.number().optional().allow(null),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(itemGroup);
    }
}

ItemGroupMaster.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        item_group_code: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        item_group_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        CompanyId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: Company,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: User,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        subsidiary_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: SubsidiaryMaster,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
        },
        base_rate: {
            type: DataTypes.FLOAT,
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
        tableName: "item_group_masters",
        sequelize,
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ["item_group_code", "CompanyId"],
            },
            {
                unique: true,
                fields: ["item_group_name", "CompanyId"],
            },
        ],
    }
);

// Associations
ItemGroupMaster.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
    onDelete: "CASCADE",
});

ItemGroupMaster.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "RESTRICT",
});

Company.hasMany(ItemGroupMaster, {
    foreignKey: "CompanyId",
    as: "itemGroups",
    onDelete: "CASCADE",
});

User.hasMany(ItemGroupMaster, {
    foreignKey: "user_id",
    as: "itemGroups",
    onDelete: "RESTRICT",
});

ItemGroupMaster.belongsTo(SubsidiaryMaster, {
    foreignKey: "subsidiary_id",
    as: "subsidiary",
    onDelete: "SET NULL",
});

SubsidiaryMaster.hasMany(ItemGroupMaster, {
    foreignKey: "subsidiary_id",
    as: "itemGroups",
    onDelete: "SET NULL",
});

export default ItemGroupMaster;