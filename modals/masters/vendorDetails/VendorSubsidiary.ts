import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";
import sequelize from "../../../dbconfig/dbconfig";
import SubsidiaryMaster from "../subsidiaries/subsdiaryMaster";

export interface VendorSubsidiaryAttributes {
    id: number;
    vendor_id: number;
    subsidiary_id: number;
    credit_limit?: number | null;
    tax_code_id?: number | null;
    is_primary: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface VendorSubsidiaryCreationAttributes
    extends Optional<VendorSubsidiaryAttributes, "id"> { }

export class VendorSubsidiary
    extends Model<VendorSubsidiaryAttributes, VendorSubsidiaryCreationAttributes>
    implements VendorSubsidiaryAttributes {
    public id!: number;
    public vendor_id!: number;
    public subsidiary_id!: number;
    public credit_limit?: number | null;
    public tax_code_id?: number | null;
    public is_primary!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateVendorSubsidiary(entry: VendorSubsidiaryAttributes) {
        const schema = Joi.object({
            vendor_id: Joi.number().integer().positive().required(),
            subsidiary_id: Joi.number().integer().positive().required(),
            credit_limit: Joi.number().precision(2).min(0).optional().allow(null),
            tax_code_id: Joi.number().integer().positive().optional().allow(null),
            is_primary: Joi.boolean().optional(),
        });
        return schema.validate(entry);
    }
}

VendorSubsidiary.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        vendor_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: "vendor_details",
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        },
        subsidiary_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: SubsidiaryMaster,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        },
        credit_limit: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: null,
        },
        tax_code_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
        },
        is_primary: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    },
    {
        tableName: "vendor_subsidiaries",
        sequelize,
        timestamps: true,
        indexes: [
            {
                unique: true,
                name: "unique_vendor_subsidiary_junction",
                fields: ["vendor_id", "subsidiary_id"],
            },
            {
                name: "idx_vendor_subsidiary_subsidiary_id",
                fields: ["subsidiary_id"],
            },
        ],
    }
);

VendorSubsidiary.belongsTo(SubsidiaryMaster, {
    foreignKey: "subsidiary_id",
    as: "subsidiary",
    onDelete: "CASCADE",
});

export default VendorSubsidiary;
