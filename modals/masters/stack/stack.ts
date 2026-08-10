import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../../../dbconfig/dbconfig";
import Godown from "../godown/godown";

interface StackAttributes {
    id: number;
    name: string;
    capacity: number;
    position: string;
    GodownId: number;
    createdAt?: Date;
    updatedAt?: Date;
    capacityUnit: string;
    length: number;
    breadth: number;
    height: number;
    sizeUnit: string;
    availableCapacity?: number;
    availableVolume?: number;
}

interface StackCreationAttributes extends Optional<StackAttributes, "id"> { }

class Stack extends Model<StackAttributes, StackCreationAttributes>
    implements StackAttributes {
    public id!: number;
    public name!: string;
    public capacity!: number;
    public position!: string;
    public GodownId!: number;
    public capacityUnit!: string;
    public length!: number;
    public breadth!: number;
    public height!: number;
    public sizeUnit!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public availableCapacity?: number;
    public availableVolume?: number;
}

Stack.init(
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
        capacity: {
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        position: {
            type: DataTypes.STRING,
            allowNull: true,
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
        GodownId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: Godown,
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
        tableName: "stacks",
        sequelize,
        timestamps: true,
    }
);

Stack.belongsTo(Godown, { foreignKey: "GodownId", as: "godown", onDelete: "CASCADE" });
Godown.hasMany(Stack, { foreignKey: "GodownId", as: "stacks", onDelete: "CASCADE" });

export default Stack;