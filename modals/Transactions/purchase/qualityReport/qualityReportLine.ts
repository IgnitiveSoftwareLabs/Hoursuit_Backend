import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import WarehouseMaster from "../../../masters/warehouse/warehouse";
import ItemMaster from "../../../masters/items/itemMaster";
import sequelize from "../../../../dbconfig/dbconfig";
import { QualityInspectionHeader } from "./index";
import Company from "../../../company/company";
import User from "../../../user/user";

interface QualityInspectionLineAttributes {
    id: number;
    qcHeaderId: number;
    grnLineId: number;
    itemId: number;
    batchNo?: string | null;
    receivedQty: number;
    inspectedQty: number;
    acceptedQty: number;
    rejectedQty: number;
    damagedQty?: number;
    holdQty?: number;
    qcStatus: "APPROVED" | "REJECTED" | "PARTIAL" | "HOLD";
    rejectionReason?: string | null;
    remarks?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface QualityInspectionLineCreationAttributes
    extends Optional<
        QualityInspectionLineAttributes,
        | "id"
        | "batchNo"
        | "damagedQty"
        | "holdQty"
        | "rejectionReason"
        | "remarks"
        | "createdAt"
        | "updatedAt"
    > { }

class QualityInspectionLine
    extends Model<
        QualityInspectionLineAttributes,
        QualityInspectionLineCreationAttributes
    >
    implements QualityInspectionLineAttributes {
    public id!: number;
    public qcHeaderId!: number;
    public grnLineId!: number;
    public itemId!: number;
    public batchNo!: string | null;
    public receivedQty!: number;
    public inspectedQty!: number;
    public acceptedQty!: number;
    public rejectedQty!: number;
    public damagedQty!: number;
    public holdQty!: number;
    public qcStatus!: "APPROVED" | "REJECTED" | "PARTIAL" | "HOLD";
    public rejectionReason!: string | null;
    public remarks!: string | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateQualityInspectionLine(qualityInspectionLine: QualityInspectionLineAttributes) {
        const schema = Joi.object({
            qcHeaderId: Joi.number().integer().positive().required(),
            grnLineId: Joi.number().integer().positive().required(),
            itemId: Joi.number().integer().positive().required(),
            batchNo: Joi.string().max(100).optional(),
            receivedQty: Joi.number().positive().required(),
            inspectedQty: Joi.number().positive().required(),
            acceptedQty: Joi.number().positive().required(),
            rejectedQty: Joi.number().positive().required(),
            damagedQty: Joi.number().positive().optional(),
            holdQty: Joi.number().positive().optional(),
            qcStatus: Joi.string().required(),
            rejectionReason: Joi.string().max(500).optional(),
            remarks: Joi.string().max(500).optional(),
            createdAt: Joi.date().required(),
            updatedAt: Joi.date().required(),
        });
        return schema.validate(qualityInspectionLine);
    }
}

QualityInspectionLine.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        qcHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        grnLineId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        itemId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        batchNo: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        receivedQty: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
        },
        inspectedQty: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
        },
        acceptedQty: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
        },
        rejectedQty: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0,
        },
        damagedQty: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0,
        },
        holdQty: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0,
        },
        qcStatus: {
            type: DataTypes.ENUM(
                "APPROVED",
                "REJECTED",
                "PARTIAL",
                "HOLD"
            ),
            allowNull: false,
        },
        rejectionReason: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        sequelize,
        modelName: "QualityInspectionLine",
        tableName: "quality_inspection_lines",
        timestamps: true,
    }
);

// Associations
QualityInspectionLine.belongsTo(QualityInspectionHeader, {
    foreignKey: "qcHeaderId",
    as: "qcHeader",
    onDelete: "CASCADE"
});
QualityInspectionLine.belongsTo(Company, { foreignKey: "CompanyId", as: "company" });
QualityInspectionLine.belongsTo(User, { foreignKey: "user_id", as: "user" });
QualityInspectionLine.belongsTo(ItemMaster, { foreignKey: "item_id", as: "item" });

// Reverse associations
QualityInspectionHeader.hasMany(QualityInspectionLine, {
    foreignKey: "qcHeaderId",
    as: "lineItems",
    onDelete: "CASCADE"
});
Company.hasMany(QualityInspectionLine, { foreignKey: "CompanyId", as: "qualityInspectionLines" });
User.hasMany(QualityInspectionLine, { foreignKey: "user_id", as: "qualityInspectionLines" });
ItemMaster.hasMany(QualityInspectionLine, { foreignKey: "item_id", as: "qualityInspectionLines" });
WarehouseMaster.hasMany(QualityInspectionLine, { foreignKey: "warehouse_id", as: "qualityInspectionLines" });

export default QualityInspectionLine;