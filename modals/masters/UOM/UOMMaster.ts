import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";
import sequelize from "../../../dbconfig/dbconfig";
import Company from "../../company/company";
import User from "../../user/user";
import SubsidiaryMaster from "../subsidiaries/subsdiaryMaster";

interface UOMMasterAttributes {
    id: number;
    uom_name: string;
    subsidiary_id?: number | null;
    CompanyId: number;
    user_id: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface UOMMasterCreationAttributes
    extends Optional<UOMMasterAttributes, "id"> { }

class UOMMaster
    extends Model<UOMMasterAttributes, UOMMasterCreationAttributes>
    implements UOMMasterAttributes {
    public id!: number;
    public uom_name!: string;
    public subsidiary_id?: number | null;
    public CompanyId!: number;
    public user_id!: number;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateUOMMaster(uom: UOMMasterAttributes) {
        const schema = Joi.object({
            uom_name: Joi.string().min(2).max(100).required(),
            subsidiary_id: Joi.number().integer().positive().optional().allow(null),
            CompanyId: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(uom);
    }
}

UOMMaster.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        uom_name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        CompanyId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: Company,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: User,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        subsidiary_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: SubsidiaryMaster,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        tableName: "uom_masters",
        sequelize,
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ["uom_name", "CompanyId"],
            },
        ],
    }
);

// Associations
UOMMaster.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
    onDelete: "CASCADE",
});

UOMMaster.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "RESTRICT",
});

Company.hasMany(UOMMaster, {
    foreignKey: "CompanyId",
    as: "uoms",
    onDelete: "CASCADE",
});

User.hasMany(UOMMaster, {
    foreignKey: "user_id",
    as: "uoms",
    onDelete: "RESTRICT",
});

// Association to subsidiary (optional)
UOMMaster.belongsTo(SubsidiaryMaster, {
    foreignKey: "subsidiary_id",
    as: "subsidiary",
    onDelete: "SET NULL",
});

SubsidiaryMaster.hasMany(UOMMaster, {
    foreignKey: "subsidiary_id",
    as: "uoms",
    onDelete: "SET NULL",
});

export default UOMMaster;