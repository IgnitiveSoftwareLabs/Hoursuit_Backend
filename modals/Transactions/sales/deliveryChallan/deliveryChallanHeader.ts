import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import TransportationMode from "../../../masters/transportMode/transportMode";
import SubsidiaryMaster from "../../../masters/subsidiaries/subsdiaryMaster";
import Warehouse from "../../../masters/warehouse/warehouse";
import Customer from "../../../masters/customer/customer";
import UOMMaster from "../../../masters/UOM/UOMMaster";
import sequelize from "../../../../dbconfig/dbconfig";
import CityMaster from "../../../masters/city/city";
import { SalesOrderHeader } from "../salesOrder";
import Company from "../../../company/company";
import User from "../../../user/user";

export interface DeliveryChallanHeaderAttributes {
    id: number;
    companyId: number;
    challanNumber: string;
    salesOrderHeaderId: number;
    customerId: number;
    challanDate: Date;
    vehicleNumber?: string | null;
    transporterName?: string | null;
    driverName?: string | null;
    driverPhone?: string | null;
    dispatchDate?: Date | null;
    deliveredDate?: Date | null;
    transportationModeId?: number | null;
    warehouseId?: number | null;
    subsidiaryId?: number | null;
    cityId?: number | null;
    uom_id?: number | null;
    status: "DRAFT" | "DISPATCHED" | "DELIVERED" | "CANCELLED";
    remarks?: string | null;
    shippingAddress?: string | null;
    user_id: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface DeliveryChallanHeaderCreationAttributes
    extends Optional<
        DeliveryChallanHeaderAttributes,
        | "id"
        | "vehicleNumber"
        | "transporterName"
        | "salesOrderHeaderId"
        | "driverName"
        | "driverPhone"
        | "dispatchDate"
        | "deliveredDate"
        | "remarks"
        | "shippingAddress"
        | "user_id"
        | "transportationModeId"
        | "warehouseId"
        | "subsidiaryId"
        | "cityId"
        | "uom_id"
        | "createdAt"
        | "updatedAt"
    > { }

class DeliveryChallanHeader
    extends Model<
        DeliveryChallanHeaderAttributes,
        DeliveryChallanHeaderCreationAttributes
    >
    implements DeliveryChallanHeaderAttributes {
    public id!: number;
    public companyId!: number;
    public challanNumber!: string;
    public salesOrderHeaderId!: number;
    public customerId!: number;
    public challanDate!: Date;
    public vehicleNumber!: string | null;
    public transporterName!: string | null;
    public uom_id?: number | null | undefined;
    public transportationModeId?: number | null | undefined;
    public warehouseId?: number | null | undefined;
    public subsidiaryId?: number | null | undefined;
    public cityId?: number | null | undefined;
    public driverName!: string | null;
    public driverPhone!: string | null;
    public dispatchDate!: Date | null;
    public deliveredDate!: Date | null;
    public status!: "DRAFT" | "DISPATCHED" | "DELIVERED" | "CANCELLED";
    public remarks!: string | null;
    public shippingAddress!: string | null;
    public user_id!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateSalesOrderHeader(data: DeliveryChallanHeaderCreationAttributes) {
        const schema = Joi.object({
            challanNumber: Joi.string().max(100).required(),
            salesOrderHeaderId: Joi.number().integer().positive().required(),
            customerId: Joi.number().integer().positive().required(),
            challanDate: Joi.date().required(),
            vehicleNumber: Joi.string().max(100).optional().allow(null, ""),
            transporterName: Joi.string().max(100).optional().allow(null, ""),
            driverName: Joi.string().max(100).optional().allow(null, ""),
            driverPhone: Joi.string().max(100).optional().allow(null, ""),
            dispatchDate: Joi.date().optional().allow(null),
            deliveredDate: Joi.date().optional().allow(null),
            uom_id: Joi.number().integer().positive().optional().allow(null),
            transportationModeId: Joi.number().integer().positive().optional().allow(null),
            warehouseId: Joi.number().integer().positive().optional().allow(null),
            subsidiaryId: Joi.number().integer().positive().optional().allow(null),
            cityId: Joi.number().integer().positive().optional().allow(null),
            shippingAddress: Joi.string().max(1000).optional().allow(null, ""),
            remarks: Joi.string().max(1000).optional().allow(null, ""),
            user_id: Joi.number().integer().positive().required(),
            createdAt: Joi.date().optional().allow(null),
            updatedAt: Joi.date().optional().allow(null),
            status: Joi.string().valid(
                "DRAFT",
                "DISPATCHED",
                "DELIVERED",
                "CANCELLED"
            ).required(),
        });

        return schema.validate(data);
    }
}

DeliveryChallanHeader.init(
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
        challanNumber: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },
        salesOrderHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        customerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        challanDate: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        vehicleNumber: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        transporterName: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        uom_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        transportationModeId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        warehouseId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        subsidiaryId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        cityId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        driverName: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        driverPhone: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        dispatchDate: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        deliveredDate: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM(
                "DRAFT",
                "DISPATCHED",
                "DELIVERED",
                "CANCELLED"
            ),
            allowNull: false,
            defaultValue: "DRAFT",
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        shippingAddress: {
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
        modelName: "DeliveryChallanHeader",
        tableName: "delivery_challan_headers",
        timestamps: true,
    }
);

DeliveryChallanHeader.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
});
DeliveryChallanHeader.belongsTo(User, { foreignKey: "user_id", as: "user" });
DeliveryChallanHeader.belongsTo(Customer, {
    foreignKey: "customer_id",
    as: "customer",
});
DeliveryChallanHeader.belongsTo(CityMaster, {
    foreignKey: "city_id",
    as: "city",
});
DeliveryChallanHeader.belongsTo(TransportationMode, {
    foreignKey: "transportation_mode_id",
    as: "transportationMode",
});
DeliveryChallanHeader.belongsTo(Warehouse, {
    foreignKey: "warehouse_id",
    as: "warehouse",
});
DeliveryChallanHeader.belongsTo(SubsidiaryMaster, {
    foreignKey: "subsidiary_id",
    as: "subsidiary",
});
DeliveryChallanHeader.belongsTo(UOMMaster, {
    foreignKey: "uom_id",
    as: "uom",
});
DeliveryChallanHeader.belongsTo(SalesOrderHeader, {
    foreignKey: "sales_order_header_id",
    as: "salesOrderHeader",
});

// Reverse associations
Company.hasMany(DeliveryChallanHeader, {
    foreignKey: "CompanyId",
    as: "deliveryChallans",
});
User.hasMany(DeliveryChallanHeader, {
    foreignKey: "user_id",
    as: "deliveryChallans",
});
SalesOrderHeader.hasMany(DeliveryChallanHeader, {
    foreignKey: "sales_order_header_id",
    as: "deliveryChallans",
});
Customer.hasMany(DeliveryChallanHeader, {
    foreignKey: "customer_id",
    as: "deliveryChallans",
});
CityMaster.hasMany(DeliveryChallanHeader, {
    foreignKey: "city_id",
    as: "deliveryChallans",
});
TransportationMode.hasMany(DeliveryChallanHeader, {
    foreignKey: "transportation_mode_id",
    as: "deliveryChallans",
});
Warehouse.hasMany(DeliveryChallanHeader, {
    foreignKey: "warehouse_id",
    as: "deliveryChallans",
});
SubsidiaryMaster.hasMany(DeliveryChallanHeader, {
    foreignKey: "subsidiary_id",
    as: "deliveryChallans",
});

export default DeliveryChallanHeader;