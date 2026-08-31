import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";
import sequelize from "../../../dbconfig/dbconfig";
import CityMaster from "../city/city";
import StateCode from "../state/state";

export interface VendorAddressBookAttributes {
    id: number;
    vendor_id: number;
    label?: string | null;
    attention?: string | null;
    addressee?: string | null;
    addr1: string;
    addr2?: string | null;
    city_id?: number | null;
    state_code_id?: number | null;
    zip?: string | null;
    country_id?: number | null;
    default_billing: boolean;
    default_shipping: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface VendorAddressBookCreationAttributes
    extends Optional<VendorAddressBookAttributes, "id"> { }

export class VendorAddressBook
    extends Model<VendorAddressBookAttributes, VendorAddressBookCreationAttributes>
    implements VendorAddressBookAttributes {
    public id!: number;
    public vendor_id!: number;
    public label?: string | null;
    public attention?: string | null;
    public addressee?: string | null;
    public addr1!: string;
    public addr2?: string | null;
    public city_id?: number | null;
    public state_code_id?: number | null;
    public zip?: string | null;
    public country_id?: number | null;
    public default_billing!: boolean;
    public default_shipping!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateAddress(address: VendorAddressBookAttributes) {
        const schema = Joi.object({
            vendor_id: Joi.number().integer().positive().required(),
            label: Joi.string().max(100).optional().allow("", null),
            attention: Joi.string().max(150).optional().allow("", null),
            addressee: Joi.string().max(200).optional().allow("", null),
            addr1: Joi.string().min(1).max(255).required(),
            addr2: Joi.string().max(255).optional().allow("", null),
            city_id: Joi.number().integer().positive().optional().allow(null),
            state_code_id: Joi.number().integer().positive().optional().allow(null),
            zip: Joi.string().max(20).optional().allow("", null),
            country_id: Joi.number().integer().positive().optional().allow(null),
            default_billing: Joi.boolean().optional(),
            default_shipping: Joi.boolean().optional(),
        });
        return schema.validate(address);
    }
}

VendorAddressBook.init(
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
        label: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        attention: {
            type: DataTypes.STRING(150),
            allowNull: true,
        },
        addressee: {
            type: DataTypes.STRING(200),
            allowNull: true,
        },
        addr1: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        addr2: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        city_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: CityMaster,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        state_code_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: StateCode,
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        },
        zip: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        country_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
        },
        default_billing: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        default_shipping: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    },
    {
        tableName: "vendor_address_books",
        sequelize,
        timestamps: true,
        indexes: [
            {
                name: "idx_vendor_address_vendor_id",
                fields: ["vendor_id"],
            },
            {
                name: "idx_vendor_address_defaults",
                fields: ["vendor_id", "default_billing", "default_shipping"],
            },
        ],
    }
);

VendorAddressBook.belongsTo(CityMaster, {
    foreignKey: "city_id",
    as: "city",
    onDelete: "RESTRICT",
});
VendorAddressBook.belongsTo(StateCode, {
    foreignKey: "state_code_id",
    as: "state",
    onDelete: "RESTRICT",
});

export default VendorAddressBook;
