import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";
import sequelize from "../../../dbconfig/dbconfig";
import User from "../../user/user";
import MISTypeMaster from "../../masters/MisType/MistType";

interface AccountTypeAttributes {
    id: number;
    account_type_name: string;
    mis_type_id?: number | null;
    user_id: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface AccountTypeCreationAttributes
    extends Optional<AccountTypeAttributes, "id" | "mis_type_id"> { }

class AccountTypeMaster
    extends Model<AccountTypeAttributes, AccountTypeCreationAttributes>
    implements AccountTypeAttributes {
    public id!: number;
    public account_type_name!: string;
    public mis_type_id?: number;
    public user_id!: number;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateAccountType(m: AccountTypeAttributes) {
        const schema = Joi.object({
            account_type_name: Joi.string().min(1).max(200).required(),
            mis_type_id: Joi.number().integer().positive().optional(),
            user_id: Joi.number().integer().positive().required(),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(m);
    }
}

AccountTypeMaster.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        account_type_name: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        mis_type_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: { model: MISTypeMaster, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
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
        tableName: "account_types",
        sequelize,
        timestamps: true,
    }
);

// Associations
AccountTypeMaster.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "RESTRICT",
});
AccountTypeMaster.belongsTo(MISTypeMaster, {
    foreignKey: "mis_type_id",
    as: "misType",
    onDelete: "RESTRICT",
});

User.hasMany(AccountTypeMaster, {
    foreignKey: "user_id",
    as: "accountTypes",
    onDelete: "RESTRICT",
});
MISTypeMaster.hasMany(AccountTypeMaster, {
    foreignKey: "mis_type_id",
    as: "accountTypes",
    onDelete: "RESTRICT",
});

export default AccountTypeMaster;