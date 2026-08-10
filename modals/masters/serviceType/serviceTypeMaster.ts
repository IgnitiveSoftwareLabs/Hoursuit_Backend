import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";
import sequelize from "../../../dbconfig/dbconfig";
import Company from "../../company/company";
import User from "../../user/user";
import UOMMaster from "../UOM/UOMMaster";
import ServiceCategory from "../serviceCategory/serviceCatMaster";
import SubsidiaryMaster from "../subsidiaries/subsdiaryMaster";

interface ServiceTypeAttributes {
    id: number;
    service_name: string;
    uom_id?: number | null;
    service_category_id?: number | null;
    subsidiary_id?: number | null;
    CompanyId: number;
    user_id: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ServiceTypeCreationAttributes
    extends Optional<ServiceTypeAttributes, "id"> { }

class ServiceType
    extends Model<ServiceTypeAttributes, ServiceTypeCreationAttributes>
    implements ServiceTypeAttributes {
    public id!: number;
    public service_name!: string;
    public uom_id?: number | null;
    public service_category_id?: number | null;
    public subsidiary_id?: number | null;
    public CompanyId!: number;
    public user_id!: number;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateServiceType(service: ServiceTypeAttributes) {
        const schema = Joi.object({
            service_name: Joi.string().min(2).max(200).required(),
            uom_id: Joi.number().integer().positive().optional().allow(null),
            service_category_id: Joi.number()
                .integer()
                .positive()
                .optional()
                .allow(null),
            subsidiary_id: Joi.number().integer().positive().optional().allow(null),
            CompanyId: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(service);
    }
}

ServiceType.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        service_name: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        uom_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: UOMMaster,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        service_category_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: ServiceCategory,
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
            onDelete: "RESTRICT",
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
    },
    {
        tableName: "service_types",
        sequelize,
        timestamps: true,
    }
);

// Associations
ServiceType.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
    onDelete: "CASCADE",
});

ServiceType.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "RESTRICT",
});

ServiceType.belongsTo(UOMMaster, {
    foreignKey: "uom_id",
    as: "uom",
    onDelete: "RESTRICT",
});

ServiceType.belongsTo(ServiceCategory, {
    foreignKey: "service_category_id",
    as: "serviceCategory",
    onDelete: "RESTRICT",
});

Company.hasMany(ServiceType, {
    foreignKey: "CompanyId",
    as: "serviceTypes",
    onDelete: "CASCADE",
});

User.hasMany(ServiceType, {
    foreignKey: "user_id",
    as: "serviceTypes",
    onDelete: "RESTRICT",
});

UOMMaster.hasMany(ServiceType, {
    foreignKey: "uom_id",
    as: "serviceTypes",
    onDelete: "RESTRICT",
});

ServiceCategory.hasMany(ServiceType, {
    foreignKey: "service_category_id",
    as: "serviceTypes",
    onDelete: "RESTRICT",
});

// Subsidiary association
ServiceType.belongsTo(SubsidiaryMaster, {
    foreignKey: "subsidiary_id",
    as: "subsidiary",
    onDelete: "RESTRICT",
});

SubsidiaryMaster.hasMany(ServiceType, {
    foreignKey: "subsidiary_id",
    as: "serviceTypes",
    onDelete: "RESTRICT",
});

export default ServiceType;