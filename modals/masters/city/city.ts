import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import sequelize from "../../../dbconfig/dbconfig";
import StateCode from "../state/state";

interface CityMasterAttributes {
    id: number;
    city_name: string;
    state_code_id: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface CityMasterCreationAttributes extends Optional<CityMasterAttributes, "id"> { }

class CityMaster extends Model<CityMasterAttributes, CityMasterCreationAttributes>
    implements CityMasterAttributes {
    public id!: number;
    public city_name!: string;
    public state_code_id!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateCityMaster(cityMaster: CityMasterAttributes) {
        const schema = Joi.object({
            city_name: Joi.string().min(2).max(100).required(),
            state_code_id: Joi.number().integer().positive().required(),
        });
        return schema.validate(cityMaster);
    }
}

CityMaster.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        city_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        state_code_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: StateCode,
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
        },
    },
    {
        tableName: "city_masters",
        sequelize,
        timestamps: true,
    }
);

// Associations
CityMaster.belongsTo(StateCode, {
    foreignKey: "state_code_id",
    as: "state",
    onDelete: "RESTRICT",
});

StateCode.hasMany(CityMaster, {
    foreignKey: "state_code_id",
    as: "cities",
    onDelete: "RESTRICT",
});

export default CityMaster;