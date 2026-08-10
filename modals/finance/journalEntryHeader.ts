import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";
import sequelize from "../../dbconfig/dbconfig";
import Company from "../company/company";
import User from "../user/user";
import VoucherTypeMaster from "./voucherType";

interface JournalEntryHeaderAttributes {
    id: number;
    entry_no: string;
    entry_date: Date;
    voucher_type_id: number;
    reference_no?: string | null;
    narration?: string | null;
    status: string;
    total_debit: number;
    total_credit: number;
    source_id: number;
    source_name: string;
    CompanyId: number;
    user_id: number;
    isActive: boolean;
    postedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface JournalEntryHeaderCreationAttributes
    extends Optional<JournalEntryHeaderAttributes, "id" | "postedAt"> { }

class JournalEntryHeader
    extends Model<JournalEntryHeaderAttributes, JournalEntryHeaderCreationAttributes>
    implements JournalEntryHeaderAttributes {
    public id!: number;
    public entry_no!: string;
    public entry_date!: Date;
    public voucher_type_id!: number;
    public reference_no?: string | null;
    public narration?: string | null;
    public status!: string;
    public total_debit!: number;
    public total_credit!: number;
    public source_id!: number;
    public source_name!: string;
    public CompanyId!: number;
    public user_id!: number;
    public isActive!: boolean;
    public postedAt?: Date | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateJournalEntryHeader(m: JournalEntryHeaderAttributes) {
        const schema = Joi.object({
            entry_no: Joi.string().min(1).max(100).required(),
            entry_date: Joi.date().required(),
            voucher_type_id: Joi.number().integer().positive().required(),
            reference_no: Joi.string().max(100).optional().allow(null),
            narration: Joi.string().max(1000).optional().allow(null),
            source_id: Joi.number().integer().positive().required(),
            source_name: Joi.string().max(100).required(),
            status: Joi.string().valid("DRAFT", "POSTED", "CANCELLED").required(),
            total_debit: Joi.number().min(0).required(),
            total_credit: Joi.number().min(0).required(),
            CompanyId: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(m);
    }
}

JournalEntryHeader.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        entry_no: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        entry_date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        voucher_type_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: VoucherTypeMaster, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        reference_no: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        narration: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM("DRAFT", "POSTED", "CANCELLED"),
            allowNull: false,
            defaultValue: "DRAFT",
        },
        total_debit: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        total_credit: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        source_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        source_name: {
            type: DataTypes.STRING(100),
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
        postedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        tableName: "journal_entry_headers",
        sequelize,
        timestamps: true,
        indexes: [
            {
                unique: true,
                name: "unique_entry_no_per_company",
                fields: ["entry_no", "CompanyId"],
            },
        ],
    }
);

JournalEntryHeader.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
    onDelete: "CASCADE",
});
JournalEntryHeader.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "RESTRICT",
});
JournalEntryHeader.belongsTo(VoucherTypeMaster, {
    foreignKey: "voucher_type_id",
    as: "voucherType",
    onDelete: "RESTRICT",
});

Company.hasMany(JournalEntryHeader, {
    foreignKey: "CompanyId",
    as: "journalEntryHeaders",
    onDelete: "CASCADE",
});

User.hasMany(JournalEntryHeader, {
    foreignKey: "user_id",
    as: "journalEntryHeaders",
    onDelete: "RESTRICT",
});

VoucherTypeMaster.hasMany(JournalEntryHeader, {
    foreignKey: "voucher_type_id",
    as: "journalEntryHeaders",
    onDelete: "RESTRICT",
});

export default JournalEntryHeader;