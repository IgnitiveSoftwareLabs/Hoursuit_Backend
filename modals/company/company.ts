import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../../dbconfig/dbconfig";
import User from "../user/user";

interface CompanyAttributes {
    id: number;
    name: string;
    gstNumber: string;
    panNumber?: string;
    contactPerson: string;
    phone: string;
    address: string;
    gstEnabled: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    UserId: number;
}

interface CompanyCreationAttributes extends Optional<CompanyAttributes, "id"> { }

class Company extends Model<CompanyAttributes, CompanyCreationAttributes>
    implements CompanyAttributes {
    public id!: number;
    public name!: string;
    public gstNumber!: string;
    public panNumber?: string;
    public contactPerson!: string;
    public phone!: string;
    public address!: string;
    public gstEnabled!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public UserId!: number; // Foreign key to User model
}

Company.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        gstNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        panNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        contactPerson: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        address: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        gstEnabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        UserId: {
            type: DataTypes.BIGINT,
            references: {
                model: User,
                key: 'id',
            },
            allowNull: false,
        },
    },
    {
        tableName: "companies",
        sequelize,
        timestamps: true,
    }
);

// Association (Many Companies per User)
Company.belongsTo(User, {
    foreignKey: "UserId",
    as: "user",
    onDelete: "CASCADE",
});

User.hasMany(Company, {
    foreignKey: "UserId",
    as: "companies",
    onDelete: "CASCADE",
});

export default Company;