import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../../dbconfig/dbconfig";
import User from "../user/user";

// Define an interface for the UserSession attributes
interface UserSessionAttributes {
    id: number;
    userId: number;
    sessionToken: string;
    deviceInfo: string;
    ipAddress: string;
    userAgent: string;
    isActive: boolean;
    lastActivity: Date;
    expiresAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

// Define an interface for the creation attributes
interface UserSessionCreationAttributes
    extends Optional<UserSessionAttributes, "id" | "createdAt" | "updatedAt"> { }

// Create the UserSession model class
class UserSession
    extends Model<UserSessionAttributes, UserSessionCreationAttributes>
    implements UserSessionAttributes {
    public id!: number;
    public userId!: number;
    public sessionToken!: string;
    public deviceInfo!: string;
    public ipAddress!: string;
    public userAgent!: string;
    public isActive!: boolean;
    public lastActivity!: Date;
    public expiresAt!: Date;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    // Static method to clean up expired sessions
    static async cleanupExpiredSessions(): Promise<void> {
        await UserSession.update(
            { isActive: false },
            {
                where: {
                    expiresAt: {
                        [require("sequelize").Op.lt]: new Date(),
                    },
                    isActive: true,
                },
            }
        );
    }

    // Static method to invalidate all sessions for a user except current one
    static async invalidateOtherSessions(
        userId: number,
        currentSessionToken?: string
    ): Promise<void> {
        const whereClause: any = {
            userId,
            isActive: true,
        };

        if (currentSessionToken) {
            whereClause.sessionToken = {
                [require("sequelize").Op.ne]: currentSessionToken,
            };
        }

        await UserSession.update({ isActive: false }, { where: whereClause });
    }

    // Instance method to update last activity
    async updateActivity(): Promise<void> {
        this.lastActivity = new Date();
        await this.save();
    }

    // Instance method to invalidate session
    async invalidate(): Promise<void> {
        this.isActive = false;
        await this.save();
    }
}

// Initialize the UserSession model
UserSession.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.BIGINT,
            references: {
                model: User,
                key: "id",
            },
            allowNull: false,
            onDelete: "CASCADE",
        },
        sessionToken: {
            type: DataTypes.STRING(500),
            allowNull: false,
            unique: true,
        },
        deviceInfo: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: "Device information like device type, OS, browser, etc.",
        },
        ipAddress: {
            type: DataTypes.STRING(45),
            allowNull: false,
            comment: "IPv4 or IPv6 address",
        },
        userAgent: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: "Browser user agent string",
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        lastActivity: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    },
    {
        sequelize,
        modelName: "UserSession",
        tableName: "user_sessions",
        timestamps: true,
    }
);

// Define associations
UserSession.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
    onDelete: "CASCADE",
});

User.hasMany(UserSession, {
    foreignKey: "userId",
    as: "sessions",
    onDelete: "CASCADE",
});

export default UserSession;