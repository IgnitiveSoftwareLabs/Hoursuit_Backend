import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";
import sequelize from "../../dbconfig/dbconfig";
import Company from "../company/company";
import SubsidiaryMaster from "../masters/subsidiaries/subsdiaryMaster";
import VoucherTypeMaster from "./voucherType";
import CurrencyMaster from "../masters/currency/currencyMaster";
import VendorDetails from "../masters/vendorDetails/vendorDetails";
import Customer from "../masters/customer/customer";
import User from "../user/user";
import JournalEntryHeader from "./journalEntryHeader";

interface CreditNoteHeaderAttributes {
    id: number;
    document_number: string;
    voucher_type_id: number;
    module_type: "PURCHASE" | "SALES";
    company_id: number;
    subsidiary_id: number;
    vendor_id?: number | null;
    customer_id?: number | null;
    reference_document_id?: number | null;
    reference_document_type?: string | null;
    posting_status: "NotPosted" | "Posted" | "Failed";
    document_status: "Draft" | "PendingApproval" | "Approved" | "Rejected" | "Posted" | "Cancelled";
    document_date: Date;
    posting_date?: Date | null;
    currency_id: number;
    exchange_rate: number;
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    round_off: number;
    total_amount: number;
    remarks?: string | null;
    journal_entry_id?: number | null;
    created_by: number;
    updated_by: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface CreditNoteHeaderCreationAttributes
    extends Optional<CreditNoteHeaderAttributes, "id"> { }

class CreditNoteHeader
    extends Model<CreditNoteHeaderAttributes, CreditNoteHeaderCreationAttributes>
    implements CreditNoteHeaderAttributes {
    public id!: number;
    public document_number!: string;
    public voucher_type_id!: number;
    public module_type!: "PURCHASE" | "SALES";
    public company_id!: number;
    public subsidiary_id!: number;
    public vendor_id?: number | null;
    public customer_id?: number | null;
    public reference_document_id?: number | null;
    public reference_document_type?: string | null;
    public posting_status!: "NotPosted" | "Posted" | "Failed";
    public document_status!: "Draft" | "PendingApproval" | "Approved" | "Rejected" | "Posted" | "Cancelled";
    public document_date!: Date;
    public posting_date?: Date | null;
    public currency_id!: number;
    public exchange_rate!: number;
    public subtotal!: number;
    public discount_amount!: number;
    public tax_amount!: number;
    public round_off!: number;
    public total_amount!: number;
    public remarks?: string | null;
    public journal_entry_id?: number | null;
    public created_by!: number;
    public updated_by!: number;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateCreditNoteHeader(m: CreditNoteHeaderAttributes) {
        const schema = Joi.object({
            document_number: Joi.string().min(1).max(100).required(),
            voucher_type_id: Joi.number().integer().positive().required(),
            module_type: Joi.string().valid("PURCHASE", "SALES").required(),
            company_id: Joi.number().integer().positive().required(),
            subsidiary_id: Joi.number().integer().positive().required(),
            vendor_id: Joi.number().integer().positive().optional().allow(null),
            customer_id: Joi.number().integer().positive().optional().allow(null),
            reference_document_id: Joi.number().integer().positive().optional().allow(null),
            reference_document_type: Joi.string().max(100).optional().allow(null),
            posting_status: Joi.string().valid("NotPosted", "Posted", "Failed").required(),
            document_status: Joi.string().valid("Draft", "PendingApproval", "Approved", "Rejected", "Posted", "Cancelled").required(),
            document_date: Joi.date().required(),
            posting_date: Joi.date().optional().allow(null),
            currency_id: Joi.number().integer().positive().required(),
            exchange_rate: Joi.number().min(0).required(),
            subtotal: Joi.number().min(0).required(),
            discount_amount: Joi.number().min(0).required(),
            tax_amount: Joi.number().min(0).required(),
            round_off: Joi.number().required(),
            total_amount: Joi.number().min(0).required(),
            remarks: Joi.string().max(1000).optional().allow(null),
            journal_entry_id: Joi.number().integer().positive().optional().allow(null),
            created_by: Joi.number().integer().positive().required(),
            updated_by: Joi.number().integer().positive().required(),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(m);
    }
}

CreditNoteHeader.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        document_number: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        voucher_type_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: VoucherTypeMaster, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        module_type: {
            type: DataTypes.ENUM("PURCHASE", "SALES"),
            allowNull: false,
        },
        company_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: Company, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        },
        subsidiary_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: SubsidiaryMaster, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        vendor_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: { model: VendorDetails, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        customer_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: { model: Customer, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        reference_document_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
        },
        reference_document_type: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        posting_status: {
            type: DataTypes.ENUM("NotPosted", "Posted", "Failed"),
            allowNull: false,
            defaultValue: "NotPosted",
        },
        document_status: {
            type: DataTypes.ENUM("Draft", "PendingApproval", "Approved", "Rejected", "Posted", "Cancelled"),
            allowNull: false,
            defaultValue: "Draft",
        },
        document_date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        posting_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        currency_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: CurrencyMaster, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        exchange_rate: {
            type: DataTypes.DECIMAL(15, 4),
            allowNull: false,
            defaultValue: 1,
        },
        subtotal: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        discount_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        tax_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        round_off: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        total_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0,
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        journal_entry_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: { model: JournalEntryHeader, key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
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
        tableName: "credit_note_headers",
        sequelize,
        timestamps: true,
        indexes: [
            {
                unique: true,
                name: "unique_credit_note_number_per_company",
                fields: ["document_number", "company_id"],
            },
        ],
    }
);

CreditNoteHeader.belongsTo(Company, {
    foreignKey: "company_id",
    as: "company",
    onDelete: "CASCADE",
});
CreditNoteHeader.belongsTo(SubsidiaryMaster, {
    foreignKey: "subsidiary_id",
    as: "subsidiary",
    onDelete: "RESTRICT",
});
CreditNoteHeader.belongsTo(VoucherTypeMaster, {
    foreignKey: "voucher_type_id",
    as: "voucherType",
    onDelete: "RESTRICT",
});
CreditNoteHeader.belongsTo(CurrencyMaster, {
    foreignKey: "currency_id",
    as: "currency",
    onDelete: "RESTRICT",
});
CreditNoteHeader.belongsTo(VendorDetails, {
    foreignKey: "vendor_id",
    as: "vendor",
    onDelete: "RESTRICT",
});
CreditNoteHeader.belongsTo(Customer, {
    foreignKey: "customer_id",
    as: "customer",
    onDelete: "RESTRICT",
});
CreditNoteHeader.belongsTo(User, {
    foreignKey: "created_by",
    as: "createdByUser",
    onDelete: "RESTRICT",
});
CreditNoteHeader.belongsTo(User, {
    foreignKey: "updated_by",
    as: "updatedByUser",
    onDelete: "RESTRICT",
});
CreditNoteHeader.belongsTo(JournalEntryHeader, {
    foreignKey: "journal_entry_id",
    as: "journalEntry",
    onDelete: "RESTRICT",
});

Company.hasMany(CreditNoteHeader, {
    foreignKey: "company_id",
    as: "creditNoteHeaders",
    onDelete: "CASCADE",
});
SubsidiaryMaster.hasMany(CreditNoteHeader, {
    foreignKey: "subsidiary_id",
    as: "creditNoteHeaders",
    onDelete: "RESTRICT",
});
VoucherTypeMaster.hasMany(CreditNoteHeader, {
    foreignKey: "voucher_type_id",
    as: "creditNoteHeaders",
    onDelete: "RESTRICT",
});
CurrencyMaster.hasMany(CreditNoteHeader, {
    foreignKey: "currency_id",
    as: "creditNoteHeaders",
    onDelete: "RESTRICT",
});
VendorDetails.hasMany(CreditNoteHeader, {
    foreignKey: "vendor_id",
    as: "creditNoteHeaders",
    onDelete: "RESTRICT",
});
Customer.hasMany(CreditNoteHeader, {
    foreignKey: "customer_id",
    as: "creditNoteHeaders",
    onDelete: "RESTRICT",
});
User.hasMany(CreditNoteHeader, {
    foreignKey: "created_by",
    as: "createdCreditNotes",
    onDelete: "RESTRICT",
});
User.hasMany(CreditNoteHeader, {
    foreignKey: "updated_by",
    as: "updatedCreditNotes",
    onDelete: "RESTRICT",
});
JournalEntryHeader.hasMany(CreditNoteHeader, {
    foreignKey: "journal_entry_id",
    as: "creditNotes",
    onDelete: "RESTRICT",
});

export default CreditNoteHeader;
