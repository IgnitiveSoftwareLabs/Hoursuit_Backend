import { Model, DataTypes, Optional } from "sequelize";

import Warehouse from "../masters/warehouse/warehouse";
import Customer from "../masters/customer/customer";
import sequelize from "../../dbconfig/dbconfig";
import Company from "../company/company";

interface AttachmentAttributes {
    id: number;
    fileName: string;
    filePath: string;
    mimeType: string;
    type: string;
    relatedId: number;
    validTill?: Date;
    relatedType: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface AttachmentCreationAttributes extends Optional<AttachmentAttributes, "id"> { }

class Attachment extends Model<AttachmentAttributes, AttachmentCreationAttributes>
    implements AttachmentAttributes {
    public id!: number;
    public fileName!: string;
    public filePath!: string;
    public mimeType!: string;
    public validTill?: Date;
    public type!: string;
    public relatedId!: number;
    public relatedType!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Attachment.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        fileName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        filePath: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        mimeType: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        relatedId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        relatedType: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        validTill: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: "Optional validity or expiry date for this file",
        },

    },
    {
        tableName: "attachments",
        sequelize,
        timestamps: true,
    }
);

Company.hasMany(Attachment, {
    foreignKey: "relatedId",
    constraints: false,
    scope: {
      relatedType: "Company",
    },
    as: "attachments",
  });
  Attachment.belongsTo(Company, {
    foreignKey: "relatedId",
    constraints: false,
    as: "company",
  });
    
  Customer.hasMany(Attachment, {
    foreignKey: "relatedId",
    constraints: false,
    scope: {
      relatedType: "Customer",
    },
    as: "attachments",
  });
  
  Attachment.belongsTo(Customer, {
    foreignKey: "relatedId",
    constraints: false,
    as: "customer",
  });
//   RequestDepositer.hasMany(Attachment, {
//     foreignKey: "relatedId",
//     constraints: false,
//     scope: {
//       relatedType: "RequestDepositer",
//     },
//     as: "attachments",
//   });
//   Attachment.belongsTo(RequestDepositer, {
//     foreignKey: "relatedId",
//     constraints: false,
//     as: "requestDepositer",
//   });
Warehouse.hasMany(Attachment, {
  foreignKey: "relatedId",
  constraints: false,
  scope: {
    relatedType: "Warehouse",
  },
  as: "attachments",
});
Attachment.belongsTo(Warehouse, {
  foreignKey: "relatedId",
  constraints: false,
  as: "Warehouse",
});

export default Attachment;