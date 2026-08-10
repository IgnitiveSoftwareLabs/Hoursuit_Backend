import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import TransportationMode from "../../../masters/transportMode/transportMode";
import SubsidiaryMaster from "../../../masters/subsidiaries/subsdiaryMaster";
import Warehouse from "../../../masters/warehouse/warehouse";
import Customer from "../../../masters/customer/customer";
import UOMMaster from "../../../masters/UOM/UOMMaster";
import sequelize from "../../../../dbconfig/dbconfig";
import CityMaster from "../../../masters/city/city";
import Godown from "../../../masters/godown/godown";
import Stack from "../../../masters/stack/stack";
import Company from "../../../company/company";
import User from "../../../user/user";

export interface SalesOrderHeaderAttributes {
    id: number;
    companyId: number;
    orderNumber: string;
    customerId: number;
    uomId: number;
    transportationModeId: number;
    warehouseId: number;
    godownId?: number | null;
    stackId?: number | null;
    subsidiaryId: number;
    cityId: number;
    orderDate: Date;
    expectedDeliveryDate?: Date | null;
    customerPO?: string | null;
    referenceNumber?: string | null;
    status: "DRAFT" | "CONFIRMED" | "PARTIAL_DISPATCHED" | "DISPATCHED" | "COMPLETED" | "CANCELLED";
    subtotal?: number;
    discountAmount?: number;
    taxAmount?: number;
    shippingAmount?: number;
    totalAmount?: number;
    remarks?: string | null;
    shippingAddress?: string | null;
    billingAddress?: string | null;
    user_id: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface SalesOrderHeaderCreationAttributes
    extends Optional<
        SalesOrderHeaderAttributes,
        | "id"
        | "expectedDeliveryDate"
        | "customerPO"
        | "uomId"
        | "transportationModeId"
        | "warehouseId"
        | "godownId"
        | "stackId"
        | "subsidiaryId"
        | "cityId"
        | "referenceNumber"
        | "subtotal"
        | "discountAmount"
        | "taxAmount"
        | "shippingAmount"
        | "totalAmount"
        | "remarks"
        | "shippingAddress"
        | "billingAddress"
        | "user_id"
        | "createdAt"
        | "updatedAt"
    > { }

class SalesOrderHeader
    extends Model<
        SalesOrderHeaderAttributes,
        SalesOrderHeaderCreationAttributes
    >
    implements SalesOrderHeaderAttributes {
    public id!: number;
    public companyId!: number;
    public orderNumber!: string;
    public customerId!: number;
    public orderDate!: Date;
    public uomId!: number;
    public transportationModeId!: number;
    public warehouseId!: number;
    public godownId?: number | null;
    public stackId?: number | null;
    public subsidiaryId!: number;
    public cityId!: number;
    public expectedDeliveryDate!: Date | null;
    public customerPO!: string | null;
    public referenceNumber!: string | null;
    public status!: "DRAFT" | "CONFIRMED" | "PARTIAL_DISPATCHED" | "DISPATCHED" | "COMPLETED" | "CANCELLED";
    public subtotal!: number;
    public discountAmount!: number;
    public taxAmount!: number;
    public shippingAmount!: number;
    public totalAmount!: number;
    public remarks!: string | null;
    public shippingAddress!: string | null;
    public billingAddress!: string | null;
    public user_id!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateSalesOrderHeader(data: SalesOrderHeaderCreationAttributes) {
        const schema = Joi.object({
            orderNumber: Joi.string().max(100).required(),
            customerId: Joi.number().integer().positive().required(),
            orderDate: Joi.date().required(),
            uomId: Joi.number().integer().positive().required(),
            transportationModeId: Joi.number().integer().positive().required(),
            warehouseId: Joi.number().integer().positive().required(),
            godownId: Joi.number().integer().positive().optional().allow(null),
            stackId: Joi.number().integer().positive().optional().allow(null),
            subsidiaryId: Joi.number().integer().positive().required(),
            cityId: Joi.number().integer().positive().required(),
            expectedDeliveryDate: Joi.date().optional().allow(null),
            customerPO: Joi.string().max(100).optional().allow(null, ""),
            referenceNumber: Joi.string().max(100).optional().allow(null, ""),
            status: Joi.string().valid(
                "DRAFT",
                "CONFIRMED",
                "PARTIAL_DISPATCHED",
                "DISPATCHED",
                "COMPLETED",
                "CANCELLED"
            ).required(),
            subtotal: Joi.number().positive().required(),
            discountAmount: Joi.number().positive().required(),
            taxAmount: Joi.number().positive().required(),
            shippingAmount: Joi.number().positive().required(),
            totalAmount: Joi.number().positive().required(),
            remarks: Joi.string().max(1000).optional().allow(null, ""),
            shippingAddress: Joi.string().max(1000).optional().allow(null, ""),
            billingAddress: Joi.string().max(1000).optional().allow(null, ""),
            user_id: Joi.number().integer().positive().required(),
        });

        return schema.validate(data);
    }
}

SalesOrderHeader.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        companyId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        orderNumber: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },
        customerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        uomId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        transportationModeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        warehouseId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        godownId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        stackId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        subsidiaryId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        cityId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        orderDate: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        expectedDeliveryDate: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        customerPO: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        referenceNumber: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM(
                "DRAFT",
                "CONFIRMED",
                "PARTIAL_DISPATCHED",
                "DISPATCHED",
                "COMPLETED",
                "CANCELLED"
            ),
            allowNull: false,
            defaultValue: "DRAFT",
        },
        subtotal: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0,
        },
        discountAmount: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0,
        },
        taxAmount: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0,
        },
        shippingAmount: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0,
        },
        totalAmount: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0,
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        shippingAddress: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        billingAddress: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
    },
    {
        sequelize,
        modelName: "SalesOrderHeader",
        tableName: "sales_order_headers",
        timestamps: true,
    }
);

SalesOrderHeader.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
});
SalesOrderHeader.belongsTo(User, { foreignKey: "user_id", as: "user" });
SalesOrderHeader.belongsTo(Customer, {
    foreignKey: "customer_id",
    as: "customer",
});
SalesOrderHeader.belongsTo(CityMaster, {
    foreignKey: "city_id",
    as: "city",
});
SalesOrderHeader.belongsTo(TransportationMode, {
    foreignKey: "transportation_mode_id",
    as: "transportationMode",
});
SalesOrderHeader.belongsTo(Warehouse, {
    foreignKey: "warehouse_id",
    as: "warehouse",
});
SalesOrderHeader.belongsTo(Godown, {
    foreignKey: "godown_id",
    as: "godown",
});
SalesOrderHeader.belongsTo(Stack, {
    foreignKey: "stack_id",
    as: "stack",
});
SalesOrderHeader.belongsTo(SubsidiaryMaster, {
    foreignKey: "subsidiary_id",
    as: "subsidiary",
});
SalesOrderHeader.belongsTo(UOMMaster, {
    foreignKey: "uom_id",
    as: "uom",
});

// Reverse associations
Company.hasMany(SalesOrderHeader, {
    foreignKey: "CompanyId",
    as: "salesOrderHeaders",
});
User.hasMany(SalesOrderHeader, {
    foreignKey: "user_id",
    as: "salesOrderHeaders",
});
Customer.hasMany(SalesOrderHeader, {
    foreignKey: "customer_id",
    as: "salesOrderHeaders",
});
CityMaster.hasMany(SalesOrderHeader, {
    foreignKey: "city_id",
    as: "salesOrderHeaders",
});
TransportationMode.hasMany(SalesOrderHeader, {
    foreignKey: "transportation_mode_id",
    as: "salesOrderHeaders",
});
Warehouse.hasMany(SalesOrderHeader, {
    foreignKey: "warehouse_id",
    as: "salesOrderHeaders",
});
Godown.hasMany(SalesOrderHeader, {
    foreignKey: "godown_id",
    as: "salesOrderHeaders",
});
Stack.hasMany(SalesOrderHeader, {
    foreignKey: "stack_id",
    as: "salesOrderHeaders",
});
SubsidiaryMaster.hasMany(SalesOrderHeader, {
    foreignKey: "subsidiary_id",
    as: "salesOrderHeaders",
});
UOMMaster.hasMany(SalesOrderHeader, {
    foreignKey: "uom_id",
    as: "salesOrderHeaders",
});

export default SalesOrderHeader;