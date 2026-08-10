// filepath: /home/ayush/Documents/ignitive work/WMS/Github For WMS/WMS/Product_Backend/src/modals/UserPermission/index.ts
import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../../dbconfig/dbconfig";
import User from "../user/user";
import Permission from "../permission/permission";

interface UserPermissionAttributes {
    id: number;
    userId: number;
    permissionId: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface UserPermissionCreationAttributes extends Optional<UserPermissionAttributes, "id" | "createdAt" | "updatedAt"> { }

class UserPermission extends Model<UserPermissionAttributes, UserPermissionCreationAttributes> implements UserPermissionAttributes {
    public id!: number;
    public userId!: number;
    public permissionId!: number;
    public createdAt?: Date;
    public updatedAt?: Date;
}

UserPermission.init(
    {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: {
                model: User,
                key: "id",
            },
        },
        permissionId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: {
                model: Permission,
                key: "id",
            },
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        modelName: "UserPermission",
        tableName: "user_permissions",
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ["userId", "permissionId"],
            },
        ],
    }
);

// Associations
User.belongsToMany(Permission, { through: UserPermission, foreignKey: "userId", as: "permissions" });
Permission.belongsToMany(User, { through: UserPermission, foreignKey: "permissionId", as: "users" });

export default UserPermission;