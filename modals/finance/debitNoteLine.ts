import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";
import sequelize from "../../dbconfig/dbconfig";
import ItemMaster from "../masters/items/itemMaster";
import UOMMaster from "../masters/UOM/UOMMaster";
import Company from "../company/company";
import User from "../user/user";
import DebitNoteHeader from "./debitNoteHeader";

interface DebitNoteLineAttributes {
    id: number;
    header_id: number;
    company_id: number;
    item_id: number;
    description?: string | null;
    quantity: number;
    uom_id: number;
    rate: number;
    discount_percentage: number;
    discount_amount: number;
    tax_code_id?: number | null;
    tax_percentage: number;
    tax_amount: number;
    line_amount: number;
    remarks?: string | null;
    created_by: number;
    updated_by: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface DebitNoteLineCreationAttributes
    extends Optional<DebitNoteLineAttributes, "id"> { }

class DebitNoteLine
    extends Model<DebitNoteLineAttributes, DebitNoteLineCreationAttributes>
    implements DebitNoteLineAttributes {
    public id!: number;
    public header_id!: number;
    public company_id!: number;
    public item_id!: number;
    public description?: string | null;
    public quantity!: number;
    public uom_id!: number;
    public rate!: number;
    public discount_percentage!: number;
    public discount_amount!: number;
    public tax_code_id?: number | null;
    public tax_percentage!: number;
    public tax_amount!: number;
    public line_amount!: number;
    public remarks?: string | null;
    public created_by!: number;
    public updated_by!: number;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateDebitNoteLine(m: DebitNoteLineAttributes) {
        const schema = Joi.object({
            header_id: Joi.number().integer().positive().required(),
            company_id: Joi.number().integer().positive().required(),
            item_id: Joi.number().integer().positive().required(),
            description: Joi.string().max(1000).optional().allow(null),
            quantity: Joi.number().positive().required(),
            uom_id: Joi.number().integer().positive().required(),
            rate: Joi.number().min(0).required(),
            discount_percentage: Joi.number().min(0).max(100).required(),
            discount_amount: Joi.number().min(0).required(),
            tax_code_id: Joi.number().integer().positive().optional().allow(null),
            tax_percentage: Joi.number().min(0).max(100).required(),
            tax_amount: Joi.number().min(0).required(),
            line_amount: Joi.number().min(0).required(),
            remarks: Joi.string().max(1000).optional().allow(null),
            created_by: Joi.number().integer().positive().required(),
            updated_by: Joi.number().integer().positive().required(),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(m);
    }
}

DebitNoteLine.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        header_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: DebitNoteHeader, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        },
        company_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: Company, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        },
        item_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: ItemMaster, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        quantity: {
            type: DataTypes.DECIMAL(15, 4),
            allowNull: false,
            defaultValue: 0,
        },
        uom_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: UOMMaster, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        rate: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        discount_percentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 0,
        },
        discount_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        tax_code_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
        },
        tax_percentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            defaultValue: 0,
        },
        tax_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        line_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        created_by: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        updated_by: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        tableName: "debit_note_lines",
        sequelize,
        timestamps: true,
    }
);

DebitNoteLine.belongsTo(DebitNoteHeader, {
    foreignKey: "header_id",
    as: "debitNoteHeader",
    onDelete: "CASCADE",
});
DebitNoteLine.belongsTo(ItemMaster, {
    foreignKey: "item_id",
    as: "item",
    onDelete: "RESTRICT",
});
DebitNoteLine.belongsTo(UOMMaster, {
    foreignKey: "uom_id",
    as: "uom",
    onDelete: "RESTRICT",
});
DebitNoteLine.belongsTo(Company, {
    foreignKey: "company_id",
    as: "company",
    onDelete: "CASCADE",
});
DebitNoteLine.belongsTo(User, {
    foreignKey: "created_by",
    as: "createdByUser",
    onDelete: "RESTRICT",
});
DebitNoteLine.belongsTo(User, {
    foreignKey: "updated_by",
    as: "updatedByUser",
    onDelete: "RESTRICT",
});

DebitNoteHeader.hasMany(DebitNoteLine, {
    foreignKey: "header_id",
    as: "lines",
    onDelete: "CASCADE",
});
ItemMaster.hasMany(DebitNoteLine, {
    foreignKey: "item_id",
    as: "debitNoteLines",
    onDelete: "RESTRICT",
});
UOMMaster.hasMany(DebitNoteLine, {
    foreignKey: "uom_id",
    as: "debitNoteLines",
    onDelete: "RESTRICT",
});
Company.hasMany(DebitNoteLine, {
    foreignKey: "company_id",
    as: "debitNoteLines",
    onDelete: "CASCADE",
});
User.hasMany(DebitNoteLine, {
    foreignKey: "created_by",
    as: "createdDebitNoteLines",
    onDelete: "RESTRICT",
});
User.hasMany(DebitNoteLine, {
    foreignKey: "updated_by",
    as: "updatedDebitNoteLines",
    onDelete: "RESTRICT",
});

export default DebitNoteLine;
