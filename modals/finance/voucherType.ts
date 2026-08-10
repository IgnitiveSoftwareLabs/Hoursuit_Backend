import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";
import sequelize from "../../dbconfig/dbconfig";
import Company from "../company/company";
import User from "../user/user";

interface VoucherTypeAttributes {
    id: number;
    code: string;
    name: string;
    description?: string | null;
    CompanyId: number;
    user_id: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface VoucherTypeCreationAttributes
    extends Optional<VoucherTypeAttributes, "id"> { }

class VoucherTypeMaster
    extends Model<VoucherTypeAttributes, VoucherTypeCreationAttributes>
    implements VoucherTypeAttributes {
    public id!: number;
    public code!: string;
    public name!: string;
    public description?: string | null;
    public CompanyId!: number;
    public user_id!: number;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateVoucherType(m: VoucherTypeAttributes) {
        const schema = Joi.object({
            code: Joi.string().min(1).max(50).required(),
            name: Joi.string().min(1).max(200).required(),
            description: Joi.string().max(500).optional().allow(null),
            CompanyId: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(m);
    }
}

VoucherTypeMaster.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        code: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        description: {
            type: DataTypes.STRING(500),
            allowNull: true,
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
    },
    {
        tableName: "voucher_types",
        sequelize,
        timestamps: true,
        indexes: [
            {
                unique: true,
                name: "unique_voucher_code_per_company",
                fields: ["code", "CompanyId"],
            },
        ],
    }
);

VoucherTypeMaster.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
    onDelete: "CASCADE",
});
VoucherTypeMaster.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "RESTRICT",
});

Company.hasMany(VoucherTypeMaster, {
    foreignKey: "CompanyId",
    as: "voucherTypes",
    onDelete: "CASCADE",
});
User.hasMany(VoucherTypeMaster, {
    foreignKey: "user_id",
    as: "voucherTypes",
    onDelete: "RESTRICT",
});

export default VoucherTypeMaster;
