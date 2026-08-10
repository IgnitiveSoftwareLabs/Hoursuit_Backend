import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";
import sequelize from "../../../dbconfig/dbconfig";
import Company from "../../company/company";
import User from "../../user/user";
import SubsidiaryMaster from "../subsidiaries/subsdiaryMaster";

interface ServiceCategoryAttributes {
    id: number;
    category_name: string;
    CompanyId: number;
    user_id: number;
    subsidiary_id?: number | null;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ServiceCategoryCreationAttributes
    extends Optional<ServiceCategoryAttributes, "id"> { }

class ServiceCategory
    extends Model<ServiceCategoryAttributes, ServiceCategoryCreationAttributes>
    implements ServiceCategoryAttributes {
    public id!: number;
    public category_name!: string;
    public CompanyId!: number;
    public user_id!: number;
    public subsidiary_id?: number | null;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateServiceCategory(category: ServiceCategoryAttributes) {
        const schema = Joi.object({
            category_name: Joi.string().min(2).max(200).required(),
            CompanyId: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
            subsidiary_id: Joi.number().integer().positive().optional().allow(null),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(category);
    }
}

ServiceCategory.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        category_name: {
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
        tableName: "service_categories",
        sequelize,
        timestamps: true,
    }
);

// Associations
ServiceCategory.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
    onDelete: "CASCADE",
});

ServiceCategory.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "RESTRICT",
});

Company.hasMany(ServiceCategory, {
    foreignKey: "CompanyId",
    as: "serviceCategories",
    onDelete: "CASCADE",
});

User.hasMany(ServiceCategory, {
    foreignKey: "user_id",
    as: "serviceCategories",
    onDelete: "RESTRICT",
});

// Subsidiary association (nullable)
ServiceCategory.belongsTo(SubsidiaryMaster, {
    foreignKey: "subsidiary_id",
    as: "subsidiary",
    onDelete: "RESTRICT",
});

SubsidiaryMaster.hasMany(ServiceCategory, {
    foreignKey: "subsidiary_id",
    as: "serviceCategories",
    onDelete: "RESTRICT",
});

export default ServiceCategory;