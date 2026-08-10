import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import TransportationMode from "../../../masters/transportMode/transportMode";
import SubsidiaryMaster from "../../../masters/subsidiaries/subsdiaryMaster";
import VendorDetails from "../../../masters/vendorDetails/vendorDetails";
import Warehouse from "../../../masters/warehouse/warehouse";
import sequelize from "../../../../dbconfig/dbconfig";
import Godown from "../../../masters/godown/godown";
import CityMaster from "../../../masters/city/city";
import Stack from "../../../masters/stack/stack";
import Company from "../../../company/company";
import User from "../../../user/user";

interface PurchaseOrderAttributes {
    id: number;
    purchaseNo: string;
    vendor_id: number;
    purchaseDate: Date;
    deliveryDate: Date;
    shipped_from?: string;
    shipped_to?: string;
    city_id: number;
    work_order_no: string;
    transportation_mode_id: number;
    vehicleNumber?: string | null;
    transporterName?: string | null;
    driverName?: string | null;
    driverPhone?: string | null;
    deliveredDate?: Date | null;
    warehouse_id: number;
    godown_id?: number | null;
    stack_id?: number | null;
    subsidiary_id: number;
    user_id: number;
    status: string;
    remarks?: string | null;
    CompanyId: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface PurchaseOrderCreationAttributes extends Optional<PurchaseOrderAttributes, "id"> { }

class PurchaseOrder extends Model<PurchaseOrderAttributes, PurchaseOrderCreationAttributes>
    implements PurchaseOrderAttributes {
    public id!: number;
    public purchaseNo!: string;
    public vendor_id!: number;
    public purchaseDate!: Date;
    public deliveryDate!: Date;
    public shipped_from?: string;
    public shipped_to?: string;
    public city_id!: number;
    public work_order_no!: string;
    public transportation_mode_id!: number;
    public transporterName?: string | null;
    public driverName?: string | null;
    public driverPhone?: string | null;
    public vehicleNumber?: string | null;
    public warehouse_id!: number;
    public godown_id?: number | null;
    public stack_id?: number | null;
    public subsidiary_id!: number;
    public status!: string;
    public user_id!: number;
    public remarks?: string | null;
    public CompanyId!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateDeliveryChallanLine(line: PurchaseOrderCreationAttributes) {
        const schema = Joi.object({
            purchase_order_header_id: Joi.number().integer().positive().required(),
            purchaseNo: Joi.string().min(1).max(100).required(),
            work_order_no: Joi.string().min(1).max(100).required(),
            vendor_id: Joi.number().integer().positive().required(),
            purchaseDate: Joi.date().required(),
            deliveryDate: Joi.date().required(),
            shipped_from: Joi.string().max(100).optional().allow(null, ""),
            shipped_to: Joi.string().max(100).optional().allow(null, ""),
            transporterName: Joi.string().max(100).optional().allow(null, ""),
            driverName: Joi.string().max(100).optional().allow(null, ""),
            driverPhone: Joi.string().max(100).optional().allow(null, ""),
            vehicleNumber: Joi.string().max(100).optional().allow(null, ""),
            city_id: Joi.number().integer().positive().required(),
            transportation_mode_id: Joi.number().integer().positive().required(),
            warehouse_id: Joi.number().integer().positive().required(),
            godown_id: Joi.number().integer().positive().optional().allow(null),
            stack_id: Joi.number().integer().positive().optional().allow(null),
            subsidiary_id: Joi.number().integer().positive().required(),
            status: Joi.string().required(),
            remarks: Joi.string().max(500).optional(),
            CompanyId: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(line);
    }
}

PurchaseOrder.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        purchaseNo: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        shipped_from: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        shipped_to: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        work_order_no: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        transporterName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        driverName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        driverPhone: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        vehicleNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        vendor_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        purchaseDate: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        CompanyId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: Company,
                key: "id",
            },
        },
        deliveryDate: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM(
                "DRAFT",
                "APPROVED",
                "PARTIAL_RECEIVED",
                "COMPLETED",
                "CANCELLED"
            ),
            allowNull: false,
            defaultValue: "DRAFT"
        },
        city_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        transportation_mode_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        warehouse_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        godown_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
        },
        stack_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
        },
        subsidiary_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        remarks: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        modelName: "PurchaseOrderHeader",
        tableName: "purchase_order_headers",
        sequelize,
        timestamps: true,
            indexes: [
                {
                    fields: ["purchaseNo", "CompanyId"],
                },
            ],
    }
);

PurchaseOrder.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
});
PurchaseOrder.belongsTo(User, { foreignKey: "user_id", as: "user" });
PurchaseOrder.belongsTo(CityMaster, {
    foreignKey: "city_id",
    as: "city",
});
PurchaseOrder.belongsTo(TransportationMode, {
    foreignKey: "transportation_mode_id",
    as: "transportationMode",
});
PurchaseOrder.belongsTo(Warehouse, {
    foreignKey: "warehouse_id",
    as: "warehouse",
});
PurchaseOrder.belongsTo(SubsidiaryMaster, {
    foreignKey: "subsidiary_id",
    as: "subsidiary",
});
PurchaseOrder.belongsTo(Godown, {
    foreignKey: "godown_id",
    as: "godown",
});
PurchaseOrder.belongsTo(Stack, {
    foreignKey: "stack_id",
    as: "stack",
});
PurchaseOrder.belongsTo(VendorDetails, {
    foreignKey: "vendor_id",
    as: "vendor",
});

// Reverse associations
Company.hasMany(PurchaseOrder, {
    foreignKey: "CompanyId",
    as: "purchaseOrders",
});
Godown.hasMany(PurchaseOrder, {
    foreignKey: "godown_id",
    as: "purchaseOrders",
});
Stack.hasMany(PurchaseOrder, {
    foreignKey: "stack_id",
    as: "purchaseOrders",
});
User.hasMany(PurchaseOrder, {
    foreignKey: "user_id",
    as: "purchaseOrders",
});
CityMaster.hasMany(PurchaseOrder, {
    foreignKey: "city_id",
    as: "purchaseOrders",
});
TransportationMode.hasMany(PurchaseOrder, {
    foreignKey: "transportation_mode_id",
    as: "purchaseOrders",
});
Warehouse.hasMany(PurchaseOrder, {
    foreignKey: "warehouse_id",
    as: "purchaseOrders",
});
SubsidiaryMaster.hasMany(PurchaseOrder, {
    foreignKey: "subsidiary_id",
    as: "purchaseOrders",
});
VendorDetails.hasMany(PurchaseOrder, {
    foreignKey: "vendor_id",
    as: "purchaseOrders",
});

export default PurchaseOrder;