import { Response, NextFunction } from "express";
import { CustomRequest } from "../typeRequest/customReq";
import { SystemLogger } from "./systemLogger";

// Import models for fetching old data
import StateCode from "../modals/masters/state/state";
import CityMaster from "../modals/masters/city/city";
import HSNSACMaster from "../modals/masters/HSN-SAC/HSNSACMaster";
import UOMMaster from "../modals/masters/UOM/UOMMaster";
import ItemMaster from "../modals/masters/items/itemMaster";
import VendorDetails from "../modals/masters/vendorDetails/vendorDetails";
// import VendorBillHeader from "../modals/masters/";
import SubsidiaryMaster from "../modals/masters/subsidiaries/subsdiaryMaster";
import ServiceType from "../modals/masters/serviceType/serviceTypeMaster";
import ServiceCategory from "../modals/masters/serviceCategory/serviceCatMaster";
// import AccountTypeMaster from "../modals/VWMS/AccountTypeMaster";
// import ChartOfAccountMaster from "../modals/VWMS/ChartOfAccountMaster";
// import MISTypeMaster from "../modals/VWMS/MISTypeMaster";
import CurrencyMaster from "../modals/masters/currency/currencyMaster";
// import SiteMaster from "../modals/VWMS/SiteMaster";
import TransportationMode from "../modals/masters/transportMode/transportMode";
// import EmployeeMaster from "../modals/VWMS/EmployeeMaster";
// import StoreMaster from "../modals/VWMS/StoreMaster";
// import MaterialStatus from "../modals/VWMS/MaterialStatus";
// import PaymentTerms from "../modals/VWMS/paymentTerms";
import WorkCategory from "../modals/masters/workCategory/workCatMaster";
import SystemLog from "../modals/systemLogs/systemLogs";
import Warehouse from "../modals/masters/warehouse/warehouse";
import Customer from "../modals/masters/customer/customer";
// import VendorServiceWorkOrder from "../modals/VWMS/VendorServiceWorkOrder";
import DeliveryChallanHeader from "../modals/Transactions/sales/deliveryChallan/deliveryChallanHeader";
import DeliveryChallanLine from "../modals/Transactions/sales/deliveryChallan/deliveryChallanLine";
// import VendorIssueMaterialHeader from "../modals/VWMS/VendorIssueMaterial/VendorIssueMaterialHeader";
// import VendorIssueMaterialLine from "../modals/VWMS/VendorIssueMaterial/VendorIssueMaterialLine";
// import VendorIssueMaterialConsumptionHeader from "../modals/VWMS/VendorIssueMaterialConsumption/VendorIssueMaterialConsumptionHeader";
// import VendorIssueMaterialConsumptionLine from "../modals/VWMS/VendorIssueMaterialConsumption/VendorIssueMaterialConsumptionLine";
// import ReturnMaterialHeader from "../modals/VWMS/ReturnMaterial/ReturnMaterialHeader";
// import ReturnMaterialLine from "../modals/VWMS/ReturnMaterial/ReturnMaterialLine";
import Company from "../modals/company/company";

// Model mapping for fetching old data
// Map model names to actual model classes
function getModelClass(modelName: string): any {
    const modelMap: { [key: string]: any } = {
        StateCode: StateCode,
        CityMaster: CityMaster,
        HSNSACMaster: HSNSACMaster,
        UOMMaster: UOMMaster,
        ItemMaster: ItemMaster,
        VendorDetails: VendorDetails,
        // VendorBillHeader: VendorBillHeader,
        SubsidiaryMaster: SubsidiaryMaster,
        ServiceType: ServiceType,
        ServiceCategory: ServiceCategory,
        // AccountTypeMaster: AccountTypeMaster,
        // ChartOfAccountMaster: ChartOfAccountMaster,
        // MISTypeMaster: MISTypeMaster,
        CurrencyMaster: CurrencyMaster,
        // SiteMaster: SiteMaster,
        TransportationMode: TransportationMode,
        // EmployeeMaster: EmployeeMaster,
        // StoreMaster: StoreMaster,
        // MaterialStatus: MaterialStatus,
        // PaymentTerms: PaymentTerms,
        WorkCategory: WorkCategory,
        SystemLog: SystemLog,
        Warehouse: Warehouse,
        Customer: Customer,
        // VendorServiceWorkOrder: VendorServiceWorkOrder,
        DeliveryChallanHeader: DeliveryChallanHeader,
        DeliveryChallanLine: DeliveryChallanLine,
        // VendorIssueMaterialHeader: VendorIssueMaterialHeader,
        // VendorIssueMaterialLine: VendorIssueMaterialLine,
        // VendorIssueMaterialConsumptionHeader: VendorIssueMaterialConsumptionHeader,
        // VendorIssueMaterialConsumptionLine: VendorIssueMaterialConsumptionLine,
        // ReturnMaterialHeader: ReturnMaterialHeader,
        // ReturnMaterialLine: ReturnMaterialLine,
        Company: Company,
    };

    return modelMap[modelName];
}

// Fetch old record data before update/delete
const fetchOldData = async (modelName: string, recordId: any) => {
    try {
        const ModelClass = getModelClass(modelName);
        if (!ModelClass) {
            console.warn(`Model ${modelName} not found for old data fetching`);
            return null;
        }

        const oldRecord = await ModelClass.findByPk(recordId);
        if (!oldRecord) return null;

        const data = oldRecord.toJSON();

        // Remove sensitive fields that shouldn't be logged
        const excludeFields = ["password", "token", "createdAt", "updatedAt"];
        const cleanedData = { ...data };
        excludeFields.forEach((field) => {
            if (cleanedData[field]) {
                delete cleanedData[field];
            }
        });

        return cleanedData;
    } catch (error) {
        console.error(
            `Error fetching old data for ${modelName}:${recordId}`,
            error
        );
        return null;
    }
};

// Enhanced system logging middleware for specific models
export const createSystemLoggerMiddleware = (modelName: string) => {
    return async (req: CustomRequest, res: Response, next: NextFunction) => {
        // Store model name for logging
        req.modelName = modelName;

        // Flag to prevent duplicate logging
        let hasLogged = false;

        // Store old data for UPDATE/DELETE operations
        let oldData: any = null;

        // Fetch old data if this is an UPDATE or DELETE request
        if (
            (req.method === "PUT" ||
                req.method === "PATCH" ||
                req.method === "DELETE") &&
            req.params.id
        ) {
            oldData = await fetchOldData(modelName, req.params.id);
        }

        // Store original response methods
        const originalSend = res.send;
        const originalJson = res.json;

        // Function to handle logging once per response
        const logOnce = (body: any) => {
            if (
                !hasLogged &&
                res.statusCode >= 200 &&
                res.statusCode < 300 &&
                req.method !== "GET"
            ) {
                hasLogged = true;
                // Don't wait for logging to complete
                setImmediate(() => {
                    handleResponseLogging(req, res, body, oldData).catch((error) => {
                        console.error("System logging error:", error);
                    });
                });
            }
        };

        // Override res.json to capture successful responses
        res.json = function (body: any) {
            logOnce(body);
            return originalJson.call(this, body);
        };

        // Override res.send to capture successful responses
        res.send = function (body: any) {
            logOnce(body);
            return originalSend.call(this, body);
        };

        next();
    };
};

// Handle response logging based on HTTP method and response
async function handleResponseLogging(
    req: CustomRequest,
    res: Response,
    responseBody: any,
    oldData?: any
): Promise<void> {
    try {
        const modelName = req.modelName;

        if (!modelName || !req.user?.id) {
            return;
        }

        let recordId: any = "unknown";
        let actionType: "CREATE" | "UPDATE" | "DELETE";
        let description = "";

        // Extract record ID from various sources
        if (req.params.id) {
            recordId = req.params.id;
        } else if (responseBody?.result?.id) {
            recordId = responseBody.result.id;
        } else if (responseBody?.data?.id) {
            recordId = responseBody.data.id;
        } else if (responseBody?.id) {
            recordId = responseBody.id;
        }

        // Determine action based on HTTP method and URL patterns
        switch (req.method) {
            case "POST":
                actionType = "CREATE";
                description = `Created new ${modelName} record`;
                await SystemLogger.logCreate(
                    req,
                    modelName,
                    recordId,
                    req.body,
                    description
                );
                break;

            case "PUT":
            case "PATCH":
                actionType = "UPDATE";
                description = `Updated ${modelName} record`;
                // Use the captured old data for proper change tracking
                await SystemLogger.logUpdate(
                    req,
                    modelName,
                    recordId,
                    oldData || {},
                    req.body,
                    description
                );
                break;

            case "DELETE":
                actionType = "DELETE";
                description = `Deleted ${modelName} record`;
                await SystemLogger.logDelete(
                    req,
                    modelName,
                    recordId,
                    oldData || {},
                    description
                );
                break;
        }
    } catch (error) {
        // Silently fail - don't break the main operation
        console.error("Response logging error:", error);
    }
}

// Manual logging helper for controllers that need more control
export class ControllerLogger {
    // Log CREATE operations with full data
    static async logCreate(
        req: CustomRequest,
        modelName: string,
        createdRecord: any
    ): Promise<void> {
        try {
            await SystemLogger.logCreate(
                req,
                modelName,
                createdRecord.id || createdRecord.dataValues?.id,
                createdRecord.dataValues || createdRecord,
                `Created new ${modelName}`
            );
        } catch (error) {
            console.error(`Failed to log CREATE for ${modelName}:`, error);
        }
    }

    // Log UPDATE operations with change tracking
    static async logUpdate(
        req: CustomRequest,
        modelName: string,
        recordId: string | number,
        oldData: any,
        newRecord: any
    ): Promise<void> {
        try {
            await SystemLogger.logUpdate(
                req,
                modelName,
                recordId,
                oldData.dataValues || oldData,
                newRecord.dataValues || newRecord,
                `Updated ${modelName}`
            );
        } catch (error) {
            console.error(`Failed to log UPDATE for ${modelName}:`, error);
        }
    }

    // Log DELETE operations
    static async logDelete(
        req: CustomRequest,
        modelName: string,
        recordId: string | number,
        deletedData: any
    ): Promise<void> {
        try {
            await SystemLogger.logDelete(
                req,
                modelName,
                recordId,
                deletedData.dataValues || deletedData,
                `Deleted ${modelName}`
            );
        } catch (error) {
            console.error(`Failed to log DELETE for ${modelName}:`, error);
        }
    }

    // Log errors in operations
    static async logError(
        req: CustomRequest,
        modelName: string,
        action: "CREATE" | "UPDATE" | "DELETE",
        recordId: string | number,
        error: any
    ): Promise<void> {
        try {
            await SystemLogger.logError(
                req,
                modelName,
                action,
                recordId,
                error.message || error.toString()
            );
        } catch (logError) {
            console.error(`Failed to log ERROR for ${modelName}:`, logError);
        }
    }
}

export default createSystemLoggerMiddleware;