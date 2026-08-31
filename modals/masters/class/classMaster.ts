import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";
import sequelize from "../../../dbconfig/dbconfig";
import Company from "../../company/company";
import User from "../../user/user";
import SubsidiaryMaster from "../subsidiaries/subsdiaryMaster";

interface ClassMasterAttributes {
    id: number;
    class_name: string;
    subsidiary_id?: number | null;
    CompanyId: number;
    user_id?: number | null;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ClassMasterCreationAttributes
    extends Optional<ClassMasterAttributes, "id"> { }

class ClassMaster
    extends Model<ClassMasterAttributes, ClassMasterCreationAttributes>
    implements ClassMasterAttributes {
    public id!: number;
    public class_name!: string;
    public subsidiary_id?: number | null;
    public CompanyId!: number;
    public user_id?: number | null;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateClassMaster(classObj: ClassMasterAttributes) {
        const schema = Joi.object({
            class_name: Joi.string().min(1).max(200).required(),
            subsidiary_id: Joi.number().integer().positive().optional().allow(null),
            CompanyId: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().optional().allow(null),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(classObj);
    }
}

ClassMaster.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        class_name: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        subsidiary_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: "subsidiaries",
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
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
            allowNull: true,
            references: {
                model: User,
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
        tableName: "classes",
        sequelize,
        timestamps: true,
    }
);

ClassMaster.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
    onDelete: "CASCADE",
});

ClassMaster.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "SET NULL",
});

ClassMaster.belongsTo(SubsidiaryMaster, {
    foreignKey: "subsidiary_id",
    as: "subsidiary",
    onDelete: "SET NULL",
});

Company.hasMany(ClassMaster, {
    foreignKey: "CompanyId",
    as: "classes",
    onDelete: "CASCADE",
});

export default ClassMaster;
