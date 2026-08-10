import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../../dbconfig/dbconfig";
import Company from "../company/company";

interface CommodityAttributes {
    commodity_id: number; // Primary Key
    name: string; // Name of the commodity
    description: string; // Description of the commodity
    unit_type: "Gain" | "Loss" | "Exact"; // Unit type (ENUM)
    gain_loss_threshold: number; // Gain/Loss threshold
    created_at?: Date; // Timestamp for creation
    units?: string; // Optional field for commodity units
    CompanyId: number;
}

interface CommodityCreationAttributes extends Optional<CommodityAttributes, "commodity_id" | "created_at"> { }

class Commodity extends Model<CommodityAttributes, CommodityCreationAttributes> implements CommodityAttributes {
    public commodity_id!: number;
    public name!: string;
    public description!: string;
    public unit_type!: "Gain" | "Loss" | "Exact";
    public gain_loss_threshold!: number;
    public units?: string; // Optional field for commodity units
    public created_at!: Date;
    public CompanyId!: number;
}

Commodity.init(
    {
        commodity_id: {
            type: DataTypes.BIGINT.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        unit_type: {
            type: DataTypes.ENUM("Gain", "Loss", "Exact"),
            allowNull: false,
        },
        gain_loss_threshold: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
        },
        units: {
            type: DataTypes.STRING,
            allowNull: true, // Optional field for commodity units
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        CompanyId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: Company,
                key: "id",
            },
        },
    },
    {
        tableName: "commodity_master",
        sequelize,
        timestamps: false, // Disable Sequelize's automatic timestamps
        underscored: true,
    }
);

Commodity.belongsTo(Company, { foreignKey: "CompanyId", as: "company", onDelete: "CASCADE" });
Company.hasMany(Commodity, { foreignKey: "CompanyId", as: "commodities", onDelete: "CASCADE" });

export default Commodity;