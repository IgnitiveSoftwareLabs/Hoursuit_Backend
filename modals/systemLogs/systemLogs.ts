import { Model, DataTypes, Optional } from "sequelize";
import Joi from "joi";
import sequelize from "../../dbconfig/dbconfig";
import Company from "../company/company";
import User from "../user/user";

export type ActionType = "CREATE" | "UPDATE" | "DELETE";

interface SystemLogAttributes {
  id: number;
  company_id: number;
  model_name: string; 
  record_id: string; 
  action_type: ActionType;
  changed_fields?: object | null; 
  performed_by?: number; 
  performed_by_name?: string; 
  user_role?: string; 
  ip_address?: string; 
  user_agent?: string; 
  request_method?: string; 
  endpoint?: string; 
  description?: string;
  status: "SUCCESS" | "FAILED"; 
  error_message?: string; 
  execution_time?: number; 
  additional_data?: object | null;
  CompanyId?: number; 
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SystemLogCreationAttributes
  extends Optional<SystemLogAttributes, "id"> {}

class SystemLog
  extends Model<SystemLogAttributes, SystemLogCreationAttributes>
  implements SystemLogAttributes
{
  public id!: number;
  public company_id!: number;
  public model_name!: string;
  public record_id!: string;
  public action_type!: ActionType;
  public changed_fields?: object | null;
  public performed_by?: number;
  public performed_by_name?: string;
  public user_role?: string;
  public ip_address?: string;
  public user_agent?: string;
  public request_method?: string;
  public endpoint?: string;
  public description?: string;
  public status!: "SUCCESS" | "FAILED";
  public error_message?: string;
  public execution_time?: number;
  public additional_data?: object | null;
  public CompanyId?: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Validation method
  static validateSystemLog(log: SystemLogAttributes) {
    const schema = Joi.object({
      company_id: Joi.number().integer().positive().required(),
      model_name: Joi.string().min(1).max(100).required(),
      record_id: Joi.string().min(1).max(50).required(),
      action_type: Joi.string().valid("CREATE", "UPDATE", "DELETE").required(),
      changed_fields: Joi.object().optional().allow(null),
      performed_by: Joi.number().integer().positive().optional(),
      performed_by_name: Joi.string().max(200).optional().allow(null, ""),
      user_role: Joi.string().max(50).optional().allow(null, ""),
      ip_address: Joi.string().max(45).optional().allow(null, ""), // IPv6 support
      user_agent: Joi.string().max(500).optional().allow(null, ""),
      request_method: Joi.string().max(10).optional().allow(null, ""),
      endpoint: Joi.string().max(200).optional().allow(null, ""),
      description: Joi.string().max(1000).optional().allow(null, ""),
      status: Joi.string().valid("SUCCESS", "FAILED").required(),
      error_message: Joi.string().max(2000).optional().allow(null, ""),
      execution_time: Joi.number().min(0).optional().allow(null),
      additional_data: Joi.object().optional().allow(null),
      CompanyId: Joi.number().integer().positive().optional(),
      isActive: Joi.boolean().optional(),
    });
    return schema.validate(log);
  }

  // Helper method to create a log entry
  static async createLog(
    logData: Partial<SystemLogAttributes>
  ): Promise<SystemLog> {
    try {
      const log = await SystemLog.create({
        company_id: logData.company_id!,
        model_name: logData.model_name!,
        record_id: logData.record_id!,
        action_type: logData.action_type!,
        changed_fields: logData.changed_fields || null,
        performed_by: logData.performed_by!,
        performed_by_name: logData.performed_by_name || "",
        user_role: logData.user_role || "",
        ip_address: logData.ip_address || "",
        user_agent: logData.user_agent || "",
        request_method: logData.request_method || "",
        endpoint: logData.endpoint || "",
        description: logData.description || "",
        status: logData.status || "SUCCESS",
        error_message: logData.error_message || undefined,
        execution_time: logData.execution_time || undefined,
        additional_data: logData.additional_data || undefined,
        CompanyId: logData.CompanyId || logData.company_id!,
        isActive: logData.isActive !== undefined ? logData.isActive : true,
      });
      return log;
    } catch (error) {
      // Fail silently to avoid breaking the main operation
      console.error("Failed to create system log:", error);
      throw error;
    }
  }

  // Helper method to format changed fields for better readability
  public getFormattedChangedFields(): any {
    if (!this.changed_fields) return null;

    try {
      const fields =
        typeof this.changed_fields === "string"
          ? JSON.parse(this.changed_fields)
          : this.changed_fields;

      return fields;
    } catch (error) {
      console.error("Error parsing changed_fields:", error);
      return this.changed_fields;
    }
  }

  // Helper method to generate human-readable description
  public generateDescription(): string {
    if (this.description) return this.description;

    const actionMap = {
      CREATE: "created",
      UPDATE: "updated",
      DELETE: "deleted",
    };

    return `${this.performed_by_name || "User"} ${
      actionMap[this.action_type]
    } ${this.model_name} record with ID ${this.record_id}`;
  }
}

SystemLog.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    company_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    model_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    record_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    action_type: {
      type: DataTypes.ENUM("CREATE", "UPDATE", "DELETE"),
      allowNull: false,
    },
    changed_fields: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },
    performed_by_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    user_role: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45), // Support both IPv4 and IPv6
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    request_method: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    endpoint: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("SUCCESS", "FAILED"),
      allowNull: false,
      defaultValue: "SUCCESS",
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    execution_time: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    additional_data: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "system_logs",
    sequelize,
    timestamps: true,
  }
);

// Associations
SystemLog.belongsTo(Company, {
  foreignKey: {
    name: "CompanyId",
    allowNull: false,
  },
  as: "company",
  onDelete: "CASCADE",
});

SystemLog.belongsTo(User, {
  foreignKey: {
    name: "performed_by",
    allowNull: false,
  },
  as: "user",
  onDelete: "RESTRICT",
});

// Reverse associations
Company.hasMany(SystemLog, {
  foreignKey: "CompanyId",
  as: "systemLogs",
  onDelete: "CASCADE",
});

User.hasMany(SystemLog, {
  foreignKey: "performed_by",
  as: "systemLogs",
  onDelete: "RESTRICT",
});

export default SystemLog;