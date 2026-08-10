import SystemLog, { ActionType } from "../modals/systemLogs/systemLogs";
import { CustomRequest } from "../typeRequest/customReq";
import { Response } from "express";

interface LoggingOptions {
  modelName: string;
  recordId: string | number;
  actionType: ActionType;
  oldValues?: any;
  newValues?: any;
  description?: string;
  additionalData?: any;
}

export class SystemLogger {
  // Main logging function
  static async log(
    req: CustomRequest,
    options: LoggingOptions,
    startTime?: number
  ): Promise<void> {
    try {
      const endTime = Date.now();
      const executionTime = startTime ? endTime - startTime : undefined;

      // Get user information
      const userId = req.user?.id;
      const userName = req.user
        ? `${req.user.FirstName || ""} ${req.user.LastName || ""}`.trim()
        : "Unknown User";
      const userRole = req.user?.Role || "Unknown";

      // Get company information
      let companyId = req.user?.CompanyId;

      // If no company in user object, try to extract from request body or query
      if (!companyId) {
        companyId = req.body?.CompanyId || req.query?.CompanyId || 1; // fallback to 1
      }

      // Get request information
      const ipAddress =
        req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
      const userAgent = req.get("User-Agent");
      const endpoint = req.originalUrl || req.url;
      const method = req.method;

      // Prepare changed fields if it's an update operation
      let changedFields = null;
      if (
        options.actionType === "UPDATE" &&
        options.oldValues &&
        options.newValues
      ) {
        changedFields = SystemLogger.getChangedFields(
          options.oldValues,
          options.newValues
        );
      } else if (options.actionType === "CREATE" && options.newValues) {
        changedFields = { new: options.newValues };
      } else if (options.actionType === "DELETE" && options.oldValues) {
        changedFields = { deleted: options.oldValues };
      }

      // Create log entry
      await SystemLog.createLog({
        company_id: companyId,
        CompanyId: companyId,
        model_name: options.modelName,
        record_id: String(options.recordId),
        action_type: options.actionType,
        changed_fields: changedFields,
        performed_by: userId || 0,
        performed_by_name: userName,
        user_role: userRole,
        ip_address: ipAddress,
        user_agent: userAgent,
        request_method: method,
        endpoint: endpoint,
        description: options.description,
        status: "SUCCESS",
        execution_time: executionTime,
        additional_data: options.additionalData,
      });
    } catch (error) {
      // Log error but don't throw to avoid breaking main operation
      console.error("Failed to create system log:", error);
    }
  }

  // Log error operations
  static async logError(
    req: CustomRequest,
    options: LoggingOptions,
    error: Error,
    startTime?: number
  ): Promise<void> {
    try {
      const endTime = Date.now();
      const executionTime = startTime ? endTime - startTime : undefined;

      const userId = req.user?.id;
      const userName = req.user
        ? `${req.user.FirstName || ""} ${req.user.LastName || ""}`.trim()
        : "Unknown User";
      const userRole = req.user?.Role || "Unknown";

      let companyId = req.user?.CompanyId;
      if (!companyId) {
        companyId = req.body?.CompanyId || req.query?.CompanyId || 1;
      }

      const ipAddress =
        req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
      const userAgent = req.get("User-Agent");
      const endpoint = req.originalUrl || req.url;
      const method = req.method;

      await SystemLog.createLog({
        company_id: companyId,
        CompanyId: companyId,
        model_name: options.modelName,
        record_id: String(options.recordId || "unknown"),
        action_type: options.actionType,
        changed_fields: options.newValues
          ? { attempted: options.newValues }
          : null,
        performed_by: userId || 0,
        performed_by_name: userName,
        user_role: userRole,
        ip_address: ipAddress,
        user_agent: userAgent,
        request_method: method,
        endpoint: endpoint,
        description:
          options.description ||
          `Failed to ${options.actionType.toLowerCase()} ${options.modelName}`,
        status: "FAILED",
        error_message: error.message || "Unknown error",
        execution_time: executionTime,
        additional_data: {
          ...options.additionalData,
          error_stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        },
      });
    } catch (logError) {
      console.error("Failed to create error log:", logError);
    }
  }

  // Utility function to compare old and new values
  private static getChangedFields(oldValues: any, newValues: any): any {
    const changes: any = {
      old: {},
      new: {},
    };

    // Compare each field
    for (const key in newValues) {
      if (newValues.hasOwnProperty(key)) {
        const oldVal = oldValues[key];
        const newVal = newValues[key];

        // Skip certain fields that shouldn't be logged
        if (SystemLogger.shouldSkipField(key)) {
          continue;
        }

        // Check if value actually changed
        if (oldVal !== newVal) {
          changes.old[key] = oldVal;
          changes.new[key] = newVal;
        }
      }
    }

    // Return null if no changes detected
    return Object.keys(changes.old).length > 0 ? changes : null;
  }

  // Fields to skip during logging (sensitive or irrelevant data)
  private static shouldSkipField(fieldName: string): boolean {
    const skipFields = [
      "password",
      "token",
      "updatedAt",
      "createdAt",
      "__v",
      "_id",
      "salt",
      "hash",
      "refresh_token",
      "access_token",
    ];

    return skipFields.some((skip) =>
      fieldName.toLowerCase().includes(skip.toLowerCase())
    );
  }

  // Convenience methods for different action types
  static async logCreate(
    req: CustomRequest,
    modelName: string,
    recordId: string | number,
    newValues: any,
    description?: string,
    startTime?: number
  ): Promise<void> {
    await SystemLogger.log(
      req,
      {
        modelName,
        recordId,
        actionType: "CREATE",
        newValues,
        description,
      },
      startTime
    );
  }

  static async logUpdate(
    req: CustomRequest,
    modelName: string,
    recordId: string | number,
    oldValues: any,
    newValues: any,
    description?: string,
    startTime?: number
  ): Promise<void> {
    await SystemLogger.log(
      req,
      {
        modelName,
        recordId,
        actionType: "UPDATE",
        oldValues,
        newValues,
        description,
      },
      startTime
    );
  }

  static async logDelete(
    req: CustomRequest,
    modelName: string,
    recordId: string | number,
    oldValues: any,
    description?: string,
    startTime?: number
  ): Promise<void> {
    await SystemLogger.log(
      req,
      {
        modelName,
        recordId,
        actionType: "DELETE",
        oldValues,
        description,
      },
      startTime
    );
  }
}

// Express middleware to automatically track API calls (optional)
export const requestLoggingMiddleware = (modelName: string) => {
  return (req: CustomRequest, res: Response, next: Function) => {
    const startTime = Date.now();

    // Store start time in request for later use
    req.startTime = startTime;
    req.modelName = modelName;

    // Override res.json to capture successful responses
    const originalJson = res.json;
    res.json = function (data: any) {
      // Only log if it's a successful operation that modified data
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const method = req.method.toLowerCase();
        let actionType: ActionType | null = null;

        if (method === "post") actionType = "CREATE";
        else if (method === "put" || method === "patch") actionType = "UPDATE";
        else if (method === "delete") actionType = "DELETE";

        if (actionType && data?.result) {
          // Try to extract record ID from response
          const recordId = data.result.id || data.result._id || "unknown";

          SystemLogger.log(
            req,
            {
              modelName,
              recordId,
              actionType,
              newValues: data.result,
              description: `${actionType} operation on ${modelName}`,
            },
            startTime
          ).catch(console.error);
        }
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

export default SystemLogger;