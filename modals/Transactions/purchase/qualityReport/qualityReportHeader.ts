import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import VendorDetails from "../../../masters/vendorDetails/vendorDetails";
import PurchaseOrder from "../purchaseOrder/purchaseOrderHeader";
import sequelize from "../../../../dbconfig/dbconfig";
import Company from "../../../company/company";
import User from "../../../user/user";

interface QualityInspectionHeaderAttributes {
    id: number;
    companyId: number;
    qcNumber: string;
    grnHeaderId: number;
    poHeaderId?: number | null;
    vendorId?: number | null;
    inspectionDate: Date;
    inspectedBy?: number | null;
    approvedBy?: number | null;
    overallStatus: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "APPROVED" | "REJECTED" | "PARTIAL";
    remarks?: string | null;
    user_id: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface QualityInspectionHeaderCreationAttributes
    extends Optional<
        QualityInspectionHeaderAttributes,
        | "id"
        | "poHeaderId"
        | "vendorId"
        | "inspectedBy"
        | "approvedBy"
        | "overallStatus"
        | "grnHeaderId"
        | "companyId"
        | "inspectionDate"
        | "inspectedBy"
        | "approvedBy"
        | "remarks"
        | "user_id"
        | "createdAt"
        | "updatedAt"
    > { }

class QualityInspectionHeader
    extends Model<
        QualityInspectionHeaderAttributes,
        QualityInspectionHeaderCreationAttributes
    >
    implements QualityInspectionHeaderAttributes {
    public id!: number;
    public companyId!: number;
    public qcNumber!: string;
    public grnHeaderId!: number;
    public poHeaderId!: number | null;
    public vendorId!: number | null;
    public inspectionDate!: Date;
    public inspectedBy!: number | null;
    public approvedBy!: number | null;
    public overallStatus!: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "APPROVED" | "REJECTED" | "PARTIAL";
    public remarks!: string | null;
    public user_id!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateQualityInspectionHeader(qualityInspectionHeader: QualityInspectionHeaderAttributes) {
        const schema = Joi.object({
            companyId: Joi.number().integer().positive().required(),
            qcNumber: Joi.string().min(1).max(100).required(),
            grnHeaderId: Joi.number().integer().positive().required(),
            poHeaderId: Joi.number().integer().positive().required(),
            vendorId: Joi.number().integer().positive().required(),
            inspectionDate: Joi.date().required(),
            inspectedBy: Joi.number().integer().positive().required(),
            approvedBy: Joi.number().integer().positive().required(),
            overallStatus: Joi.string().required(),
            remarks: Joi.string().max(500).optional(),
            user_id: Joi.number().integer().positive().required(),
            createdAt: Joi.date().required(),
            updatedAt: Joi.date().required(),
        });
        return schema.validate(qualityInspectionHeader);
    }
}

QualityInspectionHeader.init(
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
        qcNumber: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },
        grnHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        poHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        vendorId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        inspectionDate: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        inspectedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        approvedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        overallStatus: {
            type: DataTypes.ENUM(
                "PENDING",
                "IN_PROGRESS",
                "COMPLETED",
                "APPROVED",
                "REJECTED",
                "PARTIAL"
            ),
            allowNull: false,
            defaultValue: "PENDING",
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    {
        sequelize,
        modelName: "QualityInspectionHeader",
        tableName: "quality_inspection_headers",
        timestamps: true,
    }
);

QualityInspectionHeader.belongsTo(Company, { foreignKey: "CompanyId", as: "company", onDelete: "CASCADE" });
Company.hasMany(QualityInspectionHeader, { foreignKey: "CompanyId", as: "qualityInspectionHeaders", onDelete: "CASCADE" });
User.hasMany(QualityInspectionHeader, { foreignKey: "user_id", as: "qualityInspectionHeaders", onDelete: "CASCADE" });
QualityInspectionHeader.belongsTo(User, { foreignKey: "user_id", as: "user", onDelete: "CASCADE" });
QualityInspectionHeader.belongsTo(PurchaseOrder, { foreignKey: "poHeaderId", as: "purchaseOrder", onDelete: "CASCADE" });
PurchaseOrder.hasMany(QualityInspectionHeader, { foreignKey: "poHeaderId", as: "qualityInspectionHeaders", onDelete: "CASCADE" });
QualityInspectionHeader.belongsTo(VendorDetails, { foreignKey: "vendorId", as: "vendor", onDelete: "CASCADE" });
VendorDetails.hasMany(QualityInspectionHeader, { foreignKey: "vendorId", as: "qualityInspectionHeaders", onDelete: "CASCADE" });

export default QualityInspectionHeader;