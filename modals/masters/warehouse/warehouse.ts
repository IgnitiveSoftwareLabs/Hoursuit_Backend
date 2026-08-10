import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../../../dbconfig/dbconfig";
import Company from "../../company/company";

interface WarehouseAttributes {
    id: number;
    name: string;
    location: string;
    CompanyId: number;
    licenseNumber: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface WarehouseCreationAttributes extends Optional<WarehouseAttributes, "id"> { }

class Warehouse extends Model<WarehouseAttributes, WarehouseCreationAttributes>
    implements WarehouseAttributes {
    public id!: number;
    public name!: string;
    public location!: string;
    public CompanyId!: number;
    public licenseNumber!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Warehouse.init(
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
        location: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        CompanyId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: Company,
                key: "id",
            },
        },
        licenseNumber: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
    },
    {
        tableName: "warehouses",
        sequelize,
        timestamps: true,
    }
);

Warehouse.belongsTo(Company, { foreignKey: "CompanyId", as: "company", onDelete: "CASCADE" });
Company.hasMany(Warehouse, { foreignKey: "CompanyId", as: "warehouses", onDelete: "CASCADE" });

export default Warehouse;