import { Request, Response, NextFunction } from "express";
import SystemLog from "../modals/systemLogs/systemLogs";
import { findCompanyForUser } from "../utils/findCompanyForUser";
import { CustomRequest } from "../typeRequest/customReq";
import User from "../modals/user/user";

// Helper function to get client IP
const getClientIP = (req: Request): string => {
    return (
        (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        "unknown"
    );
};

// Helper function to compare objects and get changed fields
const getChangedFields = (
    oldData: any,
    newData: any
): Record<string, { old: any; new: any }> => {
    const changes: Record<string, { old: any; new: any }> = {};

    if (!oldData || !newData) return changes;

    for (const key in newData) {
        if (newData.hasOwnProperty(key) && oldData.hasOwnProperty(key)) {
            const oldValue = oldData[key];
            const newValue = newData[key];

            // Skip comparing certain fields
            if (["updatedAt", "createdAt", "password", "token"].includes(key)) {
                continue;
            }

            // Compare values (handle null/undefined cases)
            if (oldValue !== newValue) {
                changes[key] = {
                    old: oldValue,
                    new: newValue,
                };
            }
        }
    }

    return changes;
};

// System Logger utility class
export class SystemLogger {
    static async log(params: {
        req: CustomRequest;
        modelName: string;
        actionType: "CREATE" | "UPDATE" | "DELETE";
        recordId: number | string;
        oldData?: any;
        newData?: any;
        description?: string;
        status?: "SUCCESS" | "FAILED";
        errorMessage?: string;
        executionTime?: number;
    }): Promise<void> {
        let logData: any;
        try {
            const {
                req,
                modelName,
                actionType,
                recordId,
                oldData,
                newData,
                description,
                status = "SUCCESS",
                errorMessage,
                executionTime,
            } = params;

            // Get changed fields for UPDATE and DELETE operations
            let changedFields: Record<string, { old: any; new: any }> | null = null;
            if (actionType === "UPDATE") {
                // Check if we have meaningful oldData (not just an empty object)
                const hasOldData = oldData && Object.keys(oldData).length > 0;

                if (hasOldData && newData && Object.keys(newData).length > 0) {
                    // If we have both old and new data, compute the diff
                    changedFields = getChangedFields(oldData, newData);
                    // If no fields changed, don't log
                    if (Object.keys(changedFields).length === 0) {
                        return;
                    }
                } else if (newData && Object.keys(newData).length > 0) {
                    // No meaningful oldData available (middleware/controllers often don't provide it).
                    // In this case, log the update and record the new values as changed fields
                    changedFields = {};
                    for (const key in newData) {
                        if (newData.hasOwnProperty(key)) {
                            if (["updatedAt", "createdAt", "password", "token"].includes(key))
                                continue;
                            changedFields[key] = { old: null, new: newData[key] };
                        }
                    }
                } else {
                    return;
                }
            } else if (actionType === "DELETE") {
                // For DELETE operations, store the deleted record data
                const hasOldData = oldData && Object.keys(oldData).length > 0;
                if (hasOldData) {
                    changedFields = {};
                    for (const key in oldData) {
                        if (oldData.hasOwnProperty(key)) {
                            if (["updatedAt", "createdAt", "password", "token"].includes(key))
                                continue;
                            changedFields[key] = { old: oldData[key], new: null };
                        }
                    }
                }
            }

            // Resolve company id (try token payload first, then lookup)
            let resolvedCompanyId: number | undefined = undefined;
            if (req.user?.companyId) resolvedCompanyId = req.user.companyId;
            if (req.user?.CompanyId) resolvedCompanyId = req.user.CompanyId;
            if (!resolvedCompanyId) {
                try {
                    const company = await findCompanyForUser(req.user);
                    if (company && company.id) resolvedCompanyId = company.id;
                } catch (err) {
                    // ignore - resolution failed
                }
            }

            // If company is still not resolved, do not create a log to avoid validation errors
            if (!resolvedCompanyId) {
                // Optionally: emit a debug message and return
                console.debug(
                    "SystemLogger: company could not be resolved for user, skipping log."
                );
                return;
            }
            const performer = await User.findByPk(req.user?.id || 0);

            // Prepare log data
            logData = {
                company_id: resolvedCompanyId,
                CompanyId: resolvedCompanyId,
                model_name: modelName,
                record_id: recordId.toString(),
                action_type: actionType,
                performed_by: req.user?.id,
                performed_by_name: `${performer ? performer.FirstName + " " + performer.LastName : ""
                    }`.trim(),
                user_role: performer ? performer.Type : "",
                ip_address: getClientIP(req),
                user_agent: req.headers["user-agent"],
                endpoint: `${req.method} ${req.originalUrl}`,
                request_method: req.method,
                status,
                description,
                execution_time: executionTime,
                changed_fields: changedFields,
                error_message: errorMessage,
                metadata: {
                    timestamp: new Date(),
                    session_id: req.session?.id,
                    request_id: req.headers["x-request-id"],
                },
            };

            // Create log entry
            await SystemLog.create(logData);
        } catch (error) {
            // Log errors but don't break the main operation
            console.error("SystemLogger Error - Failed to create log:", error);
            if (logData) {
                console.error("Failed log details:", {
                    model_name: logData.model_name,
                    action_type: logData.action_type,
                    record_id: logData.record_id,
                    company_id: logData.company_id,
                });
            }
        }
    }

    // Convenience method for CREATE operations
    static async logCreate(
        req: CustomRequest,
        modelName: string,
        recordId: number | string,
        data: any,
        description?: string
    ): Promise<void> {
        const startTime = req.startTime || Date.now();
        const executionTime = Date.now() - startTime;

        await this.log({
            req,
            modelName,
            actionType: "CREATE",
            recordId,
            newData: data,
            description: description || `Created new ${modelName}`,
            executionTime,
        });
    }

    // Convenience method for UPDATE operations
    static async logUpdate(
        req: CustomRequest,
        modelName: string,
        recordId: number | string,
        oldData: any,
        newData: any,
        description?: string
    ): Promise<void> {
        const startTime = req.startTime || Date.now();
        const executionTime = Date.now() - startTime;

        await this.log({
            req,
            modelName,
            actionType: "UPDATE",
            recordId,
            oldData,
            newData,
            description: description || `Updated ${modelName}`,
            executionTime,
        });
    }

    // Convenience method for DELETE operations
    static async logDelete(
        req: CustomRequest,
        modelName: string,
        recordId: number | string,
        oldData: any,
        description?: string
    ): Promise<void> {
        const startTime = req.startTime || Date.now();
        const executionTime = Date.now() - startTime;

        await this.log({
            req,
            modelName,
            actionType: "DELETE",
            recordId,
            oldData,
            description: description || `Deleted ${modelName}`,
            executionTime,
        });
    }

    // Convenience method for logging errors
    static async logError(
        req: CustomRequest,
        modelName: string,
        actionType: "CREATE" | "UPDATE" | "DELETE",
        recordId: number | string,
        errorMessage: string
    ): Promise<void> {
        const startTime = req.startTime || Date.now();
        const executionTime = Date.now() - startTime;

        await this.log({
            req,
            modelName,
            actionType,
            recordId,
            status: "FAILED",
            errorMessage,
            executionTime,
        });
    }
}

// Middleware to track request start time for execution time calculation
export const requestTimeTracker = (
    req: CustomRequest,
    res: Response,
    next: NextFunction
): void => {
    req.startTime = Date.now();
    next();
};

// Middleware to automatically log based on HTTP method and successful response
export const autoLogger = (modelName: string) => {
    return async (req: CustomRequest, res: Response, next: NextFunction) => {
        // Store original response methods
        const originalSend = res.send;
        const originalJson = res.json;

        // Store model name in request for later use
        req.modelName = modelName;

        // Override response methods to capture successful operations
        res.send = function (body) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                // Don't log GET requests
                if (req.method !== "GET") {
                    logBasedOnMethod(req, res, body);
                }
            }
            return originalSend.call(this, body);
        };

        res.json = function (body) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                // Don't log GET requests
                if (req.method !== "GET") {
                    logBasedOnMethod(req, res, body);
                }
            }
            return originalJson.call(this, body);
        };

        next();
    };
};

// Helper function to log based on HTTP method
const logBasedOnMethod = async (
    req: CustomRequest,
    res: Response,
    responseBody: any
) => {
    try {
        const modelName = req.modelName;
        if (!modelName || !req.user?.id) return;

        let recordId: any = undefined;
        let actionType: "CREATE" | "UPDATE" | "DELETE" = "CREATE";

        // Extract record ID from URL params or response body
        if (req.params.id) {
            recordId = req.params.id;
        } else if (responseBody?.result?.id) {
            recordId = responseBody.result.id;
        } else if (responseBody?.data?.id) {
            recordId = responseBody.data.id;
        }

        // Determine action type based on HTTP method
        switch (req.method) {
            case "POST":
                actionType = "CREATE";
                await SystemLogger.logCreate(req, modelName, recordId, req.body);
                break;
            case "PUT":
            case "PATCH":
                actionType = "UPDATE";
                // For UPDATE, we would need the old data - this is a simplified version
                await SystemLogger.logUpdate(req, modelName, recordId, {}, req.body);
                break;
            case "DELETE":
                actionType = "DELETE";
                await SystemLogger.logDelete(req, modelName, recordId, {});
                break;
        }
    } catch (error) {
        // Silently fail
        console.error("Auto-logging error:", error);
    }
};

export default SystemLogger;