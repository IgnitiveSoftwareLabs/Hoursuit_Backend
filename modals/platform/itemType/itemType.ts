import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";
import sequelize from "../../../dbconfig/dbconfig";
import User from "../../user/user";

interface ItemTypeAttributes {
    id: number;
    item_type_name: string;
    description?: string | null;
    user_id: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ItemTypeCreationAttributes
    extends Optional<ItemTypeAttributes, "id"> { }

class ItemTypeMaster
    extends Model<ItemTypeAttributes, ItemTypeCreationAttributes>
    implements ItemTypeAttributes {
    public id!: number;
    public item_type_name!: string;
    public description?: string | null;
    public user_id!: number;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateItemType(m: ItemTypeAttributes) {
        const schema = Joi.object({
            item_type_name: Joi.string().min(1).max(200).required(),
            description: Joi.string().max(1000).optional().allow("", null),
            user_id: Joi.number().integer().positive().required(),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(m);
    }
}

ItemTypeMaster.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        item_type_name: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: User, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        tableName: "item_types",
        sequelize,
        timestamps: true,
    }
);

// Associations
ItemTypeMaster.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "RESTRICT",
});

User.hasMany(ItemTypeMaster, {
    foreignKey: "user_id",
    as: "itemTypes",
    onDelete: "RESTRICT",
});

export default ItemTypeMaster;