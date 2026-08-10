import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../../../dbconfig/dbconfig";
import Warehouse from "../warehouse/warehouse";

interface GodownAttributes {
    id: number;
    name: string;
    capacity: number;
    WarehouseId?: number | null;
    createdAt?: Date;
    updatedAt?: Date;
    capacityUnit: string;
    length: number;
    breadth: number;
    height: number;
    sizeUnit: string;
    location: string;
    availableCapacity?: number;
    availableVolume?: number;

}

interface GodownCreationAttributes extends Optional<GodownAttributes, "id"> { }

class Godown extends Model<GodownAttributes, GodownCreationAttributes>
    implements GodownAttributes {
    public id!: number;
    public name!: string;
    public capacity!: number;
    public WarehouseId?: number | null;
    public capacityUnit!: string;
    public length!: number;
    public breadth!: number;
    public height!: number;
    public sizeUnit!: string;
    public location!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public availableCapacity?: number;
    public availableVolume?: number;
}

Godown.init(
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
            allowNull: true,
        },
        capacity: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        capacityUnit: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        length: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        breadth: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        height: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        sizeUnit: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        WarehouseId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: Warehouse,
                key: "id",
            },
        },
        availableCapacity: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        availableVolume: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },

    },
    {
        tableName: "godowns",
        sequelize,
        timestamps: true,
    }
);

Godown.belongsTo(Warehouse, { foreignKey: "WarehouseId", as: "warehouse", onDelete: "CASCADE" });
Warehouse.hasMany(Godown, { foreignKey: "WarehouseId", as: "godowns", onDelete: "CASCADE" });

export default Godown;