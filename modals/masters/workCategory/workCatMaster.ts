import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";
import sequelize from "../../../dbconfig/dbconfig";
import Company from "../../company/company";
import User from "../../user/user";
import SubsidiaryMaster from "../subsidiaries/subsdiaryMaster";

// Interface for attributes
interface WorkCategoryAttributes {
    id: number;
    work_category_name: string;
    CompanyId: number;
    user_id: number;
    subsidiary_id?: number | null;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

// Optional id on creation
interface WorkCategoryCreationAttributes
    extends Optional<WorkCategoryAttributes, "id"> { }

// Sequelize model definition
class WorkCategory
    extends Model<WorkCategoryAttributes, WorkCategoryCreationAttributes>
    implements WorkCategoryAttributes {
    public id!: number;
    public work_category_name!: string;
    public CompanyId!: number;
    public user_id!: number;
    public subsidiary_id?: number | null;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    // Joi validation schema
    static validateWorkCategory(category: WorkCategoryAttributes) {
        const schema = Joi.object({
            work_category_name: Joi.string().min(2).max(200).required(),
            CompanyId: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
            subsidiary_id: Joi.number().integer().positive().optional().allow(null),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(category);
    }
}

// Model initialization
WorkCategory.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        work_category_name: {
            type: DataTypes.STRING(200),
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
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        subsidiary_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: SubsidiaryMaster,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
    },
    {
        tableName: "work_categories",
        sequelize,
        timestamps: true,
    }
);

WorkCategory.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
    onDelete: "CASCADE",
});

WorkCategory.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "RESTRICT",
});

Company.hasMany(WorkCategory, {
    foreignKey: "CompanyId",
    as: "companyWorkCategories",
    onDelete: "CASCADE",
});

User.hasMany(WorkCategory, {
    foreignKey: "user_id",
    as: "userWorkCategories",
    onDelete: "RESTRICT",
});

// Subsidiary association
WorkCategory.belongsTo(SubsidiaryMaster, {
    foreignKey: "subsidiary_id",
    as: "subsidiary",
    onDelete: "RESTRICT",
});

SubsidiaryMaster.hasMany(WorkCategory, {
    foreignKey: "subsidiary_id",
    as: "subsidiaryWorkCategories",
    onDelete: "RESTRICT",
});

export default WorkCategory;