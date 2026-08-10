import { DataTypes, Model, Optional } from "sequelize";
import Joi from "joi";
import sequelize from "../../dbconfig/dbconfig";

// Define attributes for User
interface UserAttributes {
    id: number;
    FirstName: string;
    LastName: string;
    Email: string;
    Password: string;
    Phone: string;
    ProfileImage?: string; // Add this line
    Type?: string; // Add this line
    created_by?: number; // ID of the user who created this user
    isActive?: boolean; // Add this line,
    company_id?: number; // ID of the company this user belongs to
}

interface UserCreationAttributes extends Optional<UserAttributes, "id"> { }

class User
    extends Model<UserAttributes, UserCreationAttributes>
    implements UserAttributes {
    public id!: number;
    public FirstName!: string;
    public LastName!: string;
    public Email!: string;
    public Password!: string;
    public Phone!: string;
    public ProfileImage!: string; // Add this line
    public Type!: string; // Add this line
    public created_by?: number; // ID of the user who created this user
    public isActive?: boolean; // Add this line
    public company_id?: number; // ID of the company this user belongs to
    static validateUser(user: UserAttributes) {
        const schema = Joi.object({
            FirstName: Joi.string().min(2).max(50).required(),
            LastName: Joi.string().min(2).max(50).required(),
            Email: Joi.string().email().required(),
            Password: Joi.string().min(8).required(),
            Phone: Joi.string()
                .pattern(/^[0-9]+$/)
                .min(10)
                .max(15)
                .optional(),
            ProfileImage: Joi.string().optional(),
            created_by: Joi.number().integer().positive().optional(),
            isActive: Joi.boolean().optional(),
            company_id: Joi.number().integer().positive().optional(),
        });
        return schema.validate(user);
    }
}

User.init(
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        FirstName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        LastName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        Email: {
            type: DataTypes.STRING,
            allowNull: false,

        },
        Password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        Phone: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        ProfileImage: {  // Add this block
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "https://i.ibb.co/4pDNDk1/avatar.png",
        },

        Type: {
            type: DataTypes.ENUM("superadmin", "admin", "manager", "operator", "client", "vendor", "employee"),
            allowNull: false,
            defaultValue: "operator",
        },

        created_by: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'Users',
                key: 'id',
            },
            comment: 'ID of the user who created this user (null for superadmin)',
        },
        company_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true, // null for superadmin
            comment: "The company this user belongs to; null for superadmin",
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        sequelize,
        modelName: "User"

    }
);

// Self-referencing associations for created_by
User.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(User, { foreignKey: 'created_by', as: 'createdUsers' });

export default User;