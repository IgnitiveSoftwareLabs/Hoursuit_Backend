import { Model, DataTypes, Optional } from "sequelize";

import RegistrationTypeMaster from "../../masters/registrationType/registrationType";
import RegistrationType from "../../masters/registrationType/registrationType";
import PanAvailability from "../../masters/panAvailibility/panAvailibility";
import SubsidiaryMaster from "../../masters/subsidiaries/subsdiaryMaster";
import PanAvlMaster from "../../masters/panAvailibility/panAvailibility";
import CurrencyMaster from "../currency/currencyMaster";
import sequelize from "../../../dbconfig/dbconfig";
import Company from "../../company/company";

interface CustomerAttributes {
    id: number;
    name: string;
    customer_type?: "Individual" | "Company";
    category: string;
    contact: string;
    address: string;
    officeAddress?: string;
    email: string;
    gstNumber?: string;
    contactPersonName: string;
    contactPersonEmail: string;
    contactPersonPhoneNumber: string;
    currency_id?: number | null;
    state: string;
    city?: string;
    pan_no: string;
    pan_avl_id: number;
    subsidiary_id?: number | null;
    pin_code?:string;
    credit_limit?: number;
    registration_type_id: number;
    CompanyId: number;
    createdAt?: Date;
    updatedAt?: Date;
    village?: string;
    post?: string;
    tehsil?: string;
    fatherName?: string;
    district?: string;
    aadharNumber?: string;
}

interface CustomerCreationAttributes
    extends Optional<CustomerAttributes, "id"> { }

class Customer
    extends Model<CustomerAttributes, CustomerCreationAttributes>
    implements CustomerAttributes {
    public id!: number;
    public name!: string;
    public customer_type?: "Individual" | "Company";
    public category!: string;
    public contact!: string;
    public address!: string;
    public pan_no!: string;
    public officeAddress?: string;
    public email!: string;
    public pan_avl_id!: number;
    public gstNumber?: string;
    public currency_id?: number | null;
    public contactPersonName!: string;
    public contactPersonEmail!: string;
    public contactPersonPhoneNumber!: string;
    public registration_type_id!: number;
    public pin_code?: string;
    public state!: string;
    public credit_limit?: number;
    public city?: string;
    public subsidiary_id?: number | null;
    public CompanyId!: number;
    public village?: string;
    public post?: string;
    public tehsil?: string;
    public fatherName?: string;
    public district?: string;
    public aadharNumber?: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Customer.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        customer_type: {
            type: DataTypes.ENUM("Individual", "Company"),
            allowNull: true,
        },
        category: {
            type: DataTypes.ENUM(
                "Farmer",
                "Trader",
                "Seed Company",
                "Government Organization",
                "Corporate/Service agency",
                "Other",
                "Supervisor",
                "splicer",
                "Cable lying"
            ),
            allowNull: false,
        },
        contact: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: "unique_contact_per_company",
        },
        currency_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: CurrencyMaster,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
        },
        address: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        officeAddress: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        pan_no: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        registration_type_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: RegistrationType,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        pan_avl_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: PanAvailability,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        pin_code: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: "unique_email_per_company",
        },
        gstNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        contactPersonName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        contactPersonEmail: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        contactPersonPhoneNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        state: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        city: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        CompanyId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: Company,
                key: "id",
            },
        },
        subsidiary_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: SubsidiaryMaster,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
        },
        credit_limit: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            defaultValue: 0,
        },
        village: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        post: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        tehsil: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        fatherName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        district: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        aadharNumber: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
        },
    },
    {
        tableName: "customers",
        sequelize,
        timestamps: true,
        indexes: [
            {
                unique: true,
                name: "unique_email_per_company",
                fields: ["email", "CompanyId"],
            },
            {
                unique: true,
                name: "unique_contact_per_company",
                fields: ["contact", "CompanyId"],
            },
        ],
    }
);

// Associations
Customer.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
    onDelete: "CASCADE",
});
Company.hasMany(Customer, {
    foreignKey: "CompanyId",
    as: "customers",
    onDelete: "CASCADE",
});
Customer.belongsTo(SubsidiaryMaster, {
    foreignKey: "subsidiary_id",
    as: "subsidiary",
    onDelete: "SET NULL",
});
SubsidiaryMaster.hasMany(Customer, {
    foreignKey: "subsidiary_id",
    as: "customers",
    onDelete: "SET NULL",
});
Customer.belongsTo(PanAvlMaster, {
    foreignKey: "pan_avl_id",
    as: "pan_avl",
    onDelete: "SET NULL",
});
PanAvlMaster.hasMany(Customer, {
    foreignKey: "pan_avl_id",
    as: "customers",
    onDelete: "SET NULL",
});
Customer.belongsTo(RegistrationTypeMaster, {
    foreignKey: "registration_type_id",
    as: "registration_type",
    onDelete: "SET NULL",
});
RegistrationTypeMaster.hasMany(Customer, {
    foreignKey: "registration_type_id",
    as: "customers",
    onDelete: "SET NULL",
});
Customer.belongsTo(CurrencyMaster, {
  foreignKey: "currency_id",
  as: "currency",
  onDelete: "SET NULL",
});
CurrencyMaster.hasMany(Customer, {
  foreignKey: "currency_id",
  as: "customers",
  onDelete: "SET NULL",
});

export default Customer;