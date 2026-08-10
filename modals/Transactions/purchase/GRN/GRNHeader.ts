import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import WarehouseMaster from "../../../masters/warehouse/warehouse";
import GodownMaster from "../../../masters/godown/godown";
import { PurchaseOrder } from "../purchaseOrder/index";
import StackMaster from "../../../masters/stack/stack";
import sequelize from "../../../../dbconfig/dbconfig";
import Company from "../../../company/company";
import User from "../../../user/user";

interface GRNAttributes {
    id: number;
    grnNo: string;
    purchaseOrderId?: number | null;
    warehouseId: number;
    godownId?: number | null;
    stackId?: number | null;
    grnDate: Date;
    vehicleNo?: string | null;
    driverName?: string | null;
    status:
    | "DRAFT"
    | "RECEIVED"
    | "QC_PENDING"
    | "QC_COMPLETED"
    | "COMPLETED"
    | "CANCELLED";
    remarks?: string | null;
    CompanyId: number;
    user_id: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface GRNCreationAttributes
    extends Optional<
        GRNAttributes,
        | "id"
        | "purchaseOrderId"
        | "warehouseId"
        | "godownId"
        | "stackId"
        | "grnDate"
        | "vehicleNo"
        | "driverName"
        | "remarks"
        | "user_id"
    > { }

class GRN
    extends Model<GRNAttributes, GRNCreationAttributes>
    implements GRNAttributes {
    public id!: number;
    public grnNo!: string;
    public purchaseOrderId?: number | null;
    public warehouseId!: number;
    public godownId?: number | null;
    public stackId?: number | null;
    public grnDate!: Date;
    public vehicleNo?: string | null;
    public driverName?: string | null;
    public status!:
        | "DRAFT"
        | "RECEIVED"
        | "QC_PENDING"
        | "QC_COMPLETED"
        | "COMPLETED"
        | "CANCELLED";
    public remarks?: string | null;
    public CompanyId!: number;
    public user_id!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateGRN(data: GRNCreationAttributes) {
        const schema = Joi.object({
            grnNo: Joi.string().max(100).required(),
            purchaseOrderId: Joi.number().integer().positive().optional().allow(null),
            warehouseId: Joi.number().integer().positive().required(),
            godownId: Joi.number().integer().positive().optional().allow(null),
            stackId: Joi.number().integer().positive().optional().allow(null),
            grnDate: Joi.date().required(),
            vehicleNo: Joi.string().max(100).optional().allow(null, ""),
            driverName: Joi.string().max(100).optional().allow(null, ""),
            status: Joi.string().valid(
                "DRAFT",
                "RECEIVED",
                "QC_PENDING",
                "QC_COMPLETED",
                "COMPLETED",
                "CANCELLED"
            ).required(),
            remarks: Joi.string().max(1000).optional().allow(null, ""),
            CompanyId: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
        });

        return schema.validate(data);
    }
}

GRN.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        grnNo: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
        },
        purchaseOrderId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: PurchaseOrder,
                key: "id",
            },
        },
        warehouseId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: WarehouseMaster,
                key: "id",
            },
        },
        godownId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: GodownMaster,
                key: "id",
            },
        },
        stackId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: StackMaster,
                key: "id",
            },
        },
        grnDate: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        vehicleNo: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        driverName: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM(
                "DRAFT",
                "RECEIVED",
                "QC_PENDING",
                "QC_COMPLETED",
                "COMPLETED",
                "CANCELLED"
            ),
            allowNull: false,
            defaultValue: "DRAFT",
        },
        remarks: {
            type: DataTypes.TEXT,
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
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
    },
    {
        sequelize,
        modelName: "GRN",
        tableName: "grn_headers",
        timestamps: true,

        indexes: [
            {
                fields: ["grnNo"],
            },
            {
                fields: ["purchaseOrderId"],
            },
            {
                fields: ["warehouseId"],
            },
            {
                fields: ["godownId"],
            },
            {
                fields: ["stackId"],
            },
            {
                fields: ["CompanyId"],
            },
            {
                fields: ["status"],
            },
        ],
    }
);

// Associations 
GRN.belongsTo(Company, {
    foreignKey: "CompanyId",
    as: "company",
    onDelete: "CASCADE",
});
User.hasMany(GRN, {
    foreignKey: "user_id",
    as: "grns",
});
GRN.belongsTo(User, { foreignKey: "user_id", as: "user", onDelete: "CASCADE" });
Company.hasMany(GRN, {
    foreignKey: "CompanyId",
    as: "grns",
});
GRN.belongsTo(PurchaseOrder, {
    foreignKey: "purchaseOrderId",
    as: "purchaseOrder",
    onDelete: "SET NULL",
});
PurchaseOrder.hasMany(GRN, {
    foreignKey: "purchaseOrderId",
    as: "grns",
});
GRN.belongsTo(WarehouseMaster, {
    foreignKey: "warehouseId",
    as: "warehouse",
    onDelete: "RESTRICT",
});
WarehouseMaster.hasMany(GRN, {
    foreignKey: "warehouseId",
    as: "grns",
});

GRN.belongsTo(GodownMaster, {
    foreignKey: "godownId",
    as: "godown",
    onDelete: "RESTRICT",
});
GodownMaster.hasMany(GRN, {
    foreignKey: "godownId",
    as: "grns",
});
GRN.belongsTo(StackMaster, {
    foreignKey: "stackId",
    as: "stack",
    onDelete: "RESTRICT",
});
StackMaster.hasMany(GRN, {
    foreignKey: "stackId",
    as: "grns",
});

export default GRN;