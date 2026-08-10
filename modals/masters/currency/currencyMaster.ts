import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";
import sequelize from "../../../dbconfig/dbconfig";

interface CurrencyMasterAttributes {
    id: number;
    currency_code: string;
    currency_name: string;
    currency_symbol?: string | null;
    country_name?: string | null;
    decimal_places: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface CurrencyMasterCreationAttributes
    extends Optional<CurrencyMasterAttributes, "id"> { }

class CurrencyMaster
    extends Model<CurrencyMasterAttributes, CurrencyMasterCreationAttributes>
    implements CurrencyMasterAttributes {
    public id!: number;
    public currency_code!: string;
    public currency_name!: string;
    public currency_symbol?: string | null;
    public country_name?: string | null;
    public decimal_places!: number;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateCurrency(currency: CurrencyMasterAttributes) {
        const schema = Joi.object({
            currency_code: Joi.string().length(3).uppercase().required(),
            currency_name: Joi.string().min(1).max(100).required(),
            currency_symbol: Joi.string().max(10).optional().allow(null, ""),
            country_name: Joi.string().max(100).optional().allow(null, ""),
            decimal_places: Joi.number().integer().min(0).max(8).required(),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(currency);
    }
}

CurrencyMaster.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        currency_code: {
            type: DataTypes.CHAR(3),
            allowNull: false,
        },
        currency_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        currency_symbol: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        country_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        decimal_places: {
            type: DataTypes.SMALLINT,
            allowNull: false,
            defaultValue: 2,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        tableName: "currency_masters",
        sequelize,
        timestamps: true,
    }
);

export default CurrencyMaster;
