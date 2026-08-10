import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";

import SubsidiaryMaster from "../subsidiaries/subsdiaryMaster";
import sequelize from "../../../dbconfig/dbconfig";
import Company from "../../company/company";
import CityMaster from "../city/city";
import User from "../../user/user";

interface EmployeeMasterAttributes {
  id: number;
  designation: string;
  city_id: number;
  subsidiary_id?: number | null;
  company_id: number;
  user_id: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface EmployeeMasterCreationAttributes
  extends Optional<EmployeeMasterAttributes, "id"> {}

class EmployeeMaster
  extends Model<EmployeeMasterAttributes, EmployeeMasterCreationAttributes>
  implements EmployeeMasterAttributes
{
  public id!: number;
  public designation!: string;
  public city_id!: number;
  public subsidiary_id?: number | null;
  public company_id!: number;
  public user_id!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static validateEmployeeMaster(employee: EmployeeMasterAttributes) {
    const schema = Joi.object({
      designation: Joi.string().min(2).max(100).required(),
      city_id: Joi.number().integer().positive().required(),
      subsidiary_id: Joi.number().integer().positive().optional().allow(null),
      company_id: Joi.number().integer().positive().required(),
      user_id: Joi.number().integer().positive().required(),
      isActive: Joi.boolean().optional(),
    });
    return schema.validate(employee);
  }
}

EmployeeMaster.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    designation: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    city_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: CityMaster,
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    subsidiary_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: SubsidiaryMaster,
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    company_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: Company,
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "employee_masters",
    sequelize,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["user_id", "company_id"],
      },
    ],
  }
);

// Associations
EmployeeMaster.belongsTo(Company, {
  foreignKey: "company_id",
  as: "company",
  onDelete: "CASCADE",
});

EmployeeMaster.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
  onDelete: "RESTRICT",
});

EmployeeMaster.belongsTo(CityMaster, {
  foreignKey: "city_id",
  as: "city",
  onDelete: "RESTRICT",
});

Company.hasMany(EmployeeMaster, {
  foreignKey: "company_id",
  as: "employees",
  onDelete: "CASCADE",
});

User.hasMany(EmployeeMaster, {
  foreignKey: "user_id",
  as: "employees",
  onDelete: "RESTRICT",
});

CityMaster.hasMany(EmployeeMaster, {
  foreignKey: "city_id",
  as: "employees",
  onDelete: "RESTRICT",
});

// Subsidiary association
EmployeeMaster.belongsTo(SubsidiaryMaster, {
  foreignKey: "subsidiary_id",
  as: "subsidiary",
  onDelete: "RESTRICT",
});

SubsidiaryMaster.hasMany(EmployeeMaster, {
  foreignKey: "subsidiary_id",
  as: "employees",
  onDelete: "RESTRICT",
});

export default EmployeeMaster;