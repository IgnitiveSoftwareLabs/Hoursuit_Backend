import { Model, DataTypes, Optional } from "sequelize";

import CustomerMaster from "../../../masters/customer/customer";
import sequelize from "../../../../dbconfig/dbconfig";
import Company from "../../../company/company";

export interface SalesReturnHeaderAttributes {
    id: number;
    companyId: number;
    returnNumber: string;
    customerId: number;
    salesOrderHeaderId?: number | null;
    deliveryChallanHeaderId?: number | null;
    returnDate: Date;
    status: "DRAFT" | "RECEIVED" | "INSPECTED" | "COMPLETED" | "CANCELLED";
    returnReason?: string | null;
    remarks?: string | null;
    receivedBy?: number | null;
    approvedBy?: number | null;
    user_id?: number | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface SalesReturnHeaderCreationAttributes
    extends Optional<
        SalesReturnHeaderAttributes,
        | "id"
        | "salesOrderHeaderId"
        | "deliveryChallanHeaderId"
        | "returnReason"
        | "remarks"
        | "receivedBy"
        | "approvedBy"
        | "user_id"
        | "createdAt"
        | "updatedAt"
    > { }

class SalesReturnHeader
    extends Model<
        SalesReturnHeaderAttributes,
        SalesReturnHeaderCreationAttributes
    >
    implements SalesReturnHeaderAttributes {
    public id!: number;
    public companyId!: number;
    public returnNumber!: string;
    public customerId!: number;
    public salesOrderHeaderId!: number | null;
    public deliveryChallanHeaderId!: number | null;
    public returnDate!: Date;
    public status!: "DRAFT" | "RECEIVED" | "INSPECTED" | "COMPLETED" | "CANCELLED";
    public returnReason!: string | null;
    public remarks!: string | null;
    public receivedBy!: number | null;
    public approvedBy!: number | null;
    public user_id!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

SalesReturnHeader.init(
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
        returnNumber: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },
        customerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        salesOrderHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        deliveryChallanHeaderId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        returnDate: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM(
                "DRAFT",
                "RECEIVED",
                "INSPECTED",
                "COMPLETED",
                "CANCELLED"
            ),
            allowNull: false,
            defaultValue: "DRAFT",
        },
        returnReason: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        receivedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        approvedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        }
    },
    {
        sequelize,
        modelName: "SalesReturnHeader",
        tableName: "sales_return_headers",
        timestamps: true,
    }
);

SalesReturnHeader.belongsTo(Company, { foreignKey: "CompanyId", as: "company", onDelete: "CASCADE" });
Company.hasMany(SalesReturnHeader, { foreignKey: "CompanyId", as: "salesReturnHeaders", onDelete: "CASCADE" });
SalesReturnHeader.belongsTo(CustomerMaster, { foreignKey: "customerId", as: "customer", onDelete: "CASCADE" });
CustomerMaster.hasMany(SalesReturnHeader, { foreignKey: "customerId", as: "salesReturnHeaders", onDelete: "CASCADE" });

export default SalesReturnHeader;