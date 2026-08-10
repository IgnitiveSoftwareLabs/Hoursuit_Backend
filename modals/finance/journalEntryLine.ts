import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";
import sequelize from "../../dbconfig/dbconfig";
import Company from "../company/company";
import User from "../user/user";
import ChartOfAccountMaster from "../masters/chartOfAccount/chartOfAccount";
import JournalEntryHeader from "./journalEntryHeader";

interface JournalEntryLineAttributes {
    id: number;
    journal_entry_id: number;
    account_id: number;
    narration?: string | null;
    debit_amount: number;
    credit_amount: number;
    CompanyId: number;
    user_id: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface JournalEntryLineCreationAttributes
    extends Optional<JournalEntryLineAttributes, "id"> { }

class JournalEntryLine
    extends Model<JournalEntryLineAttributes, JournalEntryLineCreationAttributes>
    implements JournalEntryLineAttributes {
    public id!: number;
    public journal_entry_id!: number;
    public account_id!: number;
    public narration?: string | null;
    public debit_amount!: number;
    public credit_amount!: number;
    public CompanyId!: number;
    public user_id!: number;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateJournalEntryLine(m: JournalEntryLineAttributes) {
        const schema = Joi.object({
            journal_entry_id: Joi.number().integer().positive().required(),
            account_id: Joi.number().integer().positive().required(),
            narration: Joi.string().max(1000).optional().allow(null),
            debit_amount: Joi.number().min(0).required(),
            credit_amount: Joi.number().min(0).required(),
            CompanyId: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(m);
    }
}

JournalEntryLine.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        journal_entry_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: JournalEntryHeader, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        },
        account_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: ChartOfAccountMaster, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        narration: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        debit_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        credit_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
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
        tableName: "journal_entry_lines",
        sequelize,
        timestamps: true,
    }
);

JournalEntryLine.belongsTo(JournalEntryHeader, {
    foreignKey: "journal_entry_id",
    as: "journalEntry",
    onDelete: "CASCADE",
});

JournalEntryLine.belongsTo(ChartOfAccountMaster, {
    foreignKey: "account_id",
    as: "account",
    onDelete: "RESTRICT",
});

JournalEntryLine.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
    onDelete: "CASCADE",
});

JournalEntryLine.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
    onDelete: "RESTRICT",
});

JournalEntryHeader.hasMany(JournalEntryLine, {
    foreignKey: "journal_entry_id",
    as: "lines",
    onDelete: "CASCADE",
});

ChartOfAccountMaster.hasMany(JournalEntryLine, {
    foreignKey: "account_id",
    as: "journalEntryLines",
    onDelete: "RESTRICT",
});

Company.hasMany(JournalEntryLine, {
    foreignKey: "CompanyId",
    as: "journalEntryLines",
    onDelete: "CASCADE",
});

User.hasMany(JournalEntryLine, {
    foreignKey: "user_id",
    as: "journalEntryLines",
    onDelete: "RESTRICT",
});

export default JournalEntryLine;