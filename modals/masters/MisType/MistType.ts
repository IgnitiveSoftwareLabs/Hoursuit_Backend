import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";
import sequelize from "../../../dbconfig/dbconfig";
import Company from "../../company/company";
import User from "../../user/user";
import SubsidiaryMaster from "../subsidiaries/subsdiaryMaster";

interface MISTypeAttributes {
    id: number;
    mis_type_name: string;
    CompanyId: number;
    user_id: number;
    subsidiary_id?: number | null;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface MISTypeCreationAttributes extends Optional<MISTypeAttributes, "id"> { }

class MISTypeMaster
    extends Model<MISTypeAttributes, MISTypeCreationAttributes>
    implements MISTypeAttributes {
    public id!: number;
    public mis_type_name!: string;
    public CompanyId!: number;
    public user_id!: number;
    public subsidiary_id?: number | null;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateMISType(m: MISTypeAttributes) {
        const schema = Joi.object({
            mis_type_name: Joi.string().min(1).max(200).required(),
            CompanyId: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
            subsidiary_id: Joi.number().integer().positive().optional().allow(null),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(m);
    }
}

MISTypeMaster.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        mis_type_name: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        CompanyId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: Company, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: User, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        subsidiary_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: { model: SubsidiaryMaster, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
    },
    {
        tableName: "mis_types",
        sequelize,
        timestamps: true,
    }
);

// Associations
MISTypeMaster.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
    onDelete: "CASCADE",
});
MISTypeMaster.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "RESTRICT",
});

Company.hasMany(MISTypeMaster, {
    foreignKey: "CompanyId",
    as: "misTypes",
    onDelete: "CASCADE",
});
User.hasMany(MISTypeMaster, {
    foreignKey: "user_id",
    as: "misTypes",
    onDelete: "RESTRICT",
});

// Subsidiary associations
MISTypeMaster.belongsTo(SubsidiaryMaster, {
    foreignKey: "subsidiary_id",
    as: "subsidiary",
    onDelete: "RESTRICT",
});

SubsidiaryMaster.hasMany(MISTypeMaster, {
    foreignKey: "subsidiary_id",
    as: "misTypes",
    onDelete: "RESTRICT",
});

export default MISTypeMaster;