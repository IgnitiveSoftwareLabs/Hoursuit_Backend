import { Router } from "express";
import verifyToken from "../../middleware/auth/verifyToken";
// import upload from "../../middleware/upload";
// Import all VWMS controllers
import StateCodeController from "../../controller/stateCtr/stateCtr";
import CityMasterController from "../../controller/cityCtr/cityCtr";
import HSNSACMasterController from "../../controller/HSNCtr/HSNCtr";
import UOMMasterController from "../../controller/UOMCtr/UOMCtr";
import ItemMasterController from "../../controller/itemsCtr/itemCtr";
import ServiceTypeController from "../../controller/serviceTypeCtr/serviceTypeCtr";
import ServiceCategoryController from "../../controller/serviceCatCtr/serviceCatCtr";
import CurrencyController from "../../controller/currencyCtr/currencyCtr";
import SubsidiaryController from "../../controller/subsdiaryCtr/subsdiaryCtr";
// import AccountTypeController from "../../controller/accountTypeCtr/accountTypeCtr";
// import ChartController from "../../controller/chartCtr/chartCtr";
// import MISTypeController from "../../controller/mistypeCtr/mistypeCtr";
// import SiteMasterController from "../../controller/siteCtr/siteCtr";
import TransportationModeController from "../../controller/transportationCtr/transportationCtr";
import VendorController from "../../controller/vendorCtr/vendorCtr";
// import EmployeeMasterController from "../../controller/VWMS/employeeMaster";
// import VendorServiceWorkOrderController from "../../controller/VWMS/ServiceRateMaster";
// import CsvUploadController from "../../controller/VWMS/CsvUpload";
import SystemLogController from "../../controller/systemLoggerCtr/systemLoggerCtr";
// Import Transaction Controllers
import DeliveryChallanController from "../../controller/Transactions/sales/deliveryChallan/deliveryChallan";
// import VendorIssueMaterialController from "../../controller/VWMS/VendorIssueMaterial";
// import VendorIssueMaterialConsumptionController from "../../controller/VendorIssueMaterialConsumptionCtr/VendorIssueMaterialConsumptionCtr";
// import VendorBillController from "../../controller/VendorBillCtr/VendorBillCtr";
// import ReturnMaterialController from "../../controller/ReturnMaterialCtr/ReturnMaterialCtr";
// Import Inventory Router
import inventoryRouter from "../inventoryRouter";
// Import Dashboard Controller
// import DashboardController from "../../controller/VWMS/DashboardController";
import WorkCategoryController from "../../controller/workCatCtr/workCatCtr";
// import StoreMasterController from "../../controller/VWMS/Store";
// import MaterialStatusController from "../../controller/VWMS/MaterialStatus";
// import PaymentTermController from "../../controller/VWMS/paymentTerms";
// Import System Logger Middleware
import { createSystemLoggerMiddleware } from "../../middleware/systemLoggerMiddleware";

const VWMSrouter = Router();

// ==================== STATE CODE ROUTES ====================
// Public routes (no authentication required for basic state data)
VWMSrouter.get("/states", StateCodeController.getAllStateCodes);
VWMSrouter.get("/states/:id", StateCodeController.getStateCodeById);
// Protected routes (admin only) with auto-logging
VWMSrouter.post(
    "/states",
    verifyToken,
    createSystemLoggerMiddleware("StateCode"),
    StateCodeController.createStateCode
);
VWMSrouter.put(
    "/states/:id",
    verifyToken,
    createSystemLoggerMiddleware("StateCode"),
    StateCodeController.updateStateCode
);
VWMSrouter.delete(
    "/states/:id",
    verifyToken,
    createSystemLoggerMiddleware("StateCode"),
    StateCodeController.deleteStateCode
);

// ==================== CITY MASTER ROUTES ====================
// Public routes (no authentication required for basic city data)
VWMSrouter.get("/cities", CityMasterController.getAllCities);
VWMSrouter.get("/cities/:id", CityMasterController.getCityById);
// Protected routes (admin only) with auto-logging
VWMSrouter.post(
    "/cities",
    verifyToken,
    createSystemLoggerMiddleware("CityMaster"),
    CityMasterController.createCity
);
VWMSrouter.put(
    "/cities/:id",
    verifyToken,
    createSystemLoggerMiddleware("CityMaster"),
    CityMasterController.updateCity
);
VWMSrouter.delete(
    "/cities/:id",
    verifyToken,
    createSystemLoggerMiddleware("CityMaster"),
    CityMasterController.deleteCity
);

// ==================== HSN/SAC MASTER ROUTES ====================
VWMSrouter.post(
    "/hsn-sac",
    verifyToken,
    createSystemLoggerMiddleware("HSNSACMaster"),
    HSNSACMasterController.createHSNSAC
);
VWMSrouter.get("/hsn-sac", verifyToken, HSNSACMasterController.getHSNSACs);

// ==================== HSN/SAC CSV UPLOAD ROUTES ====================
VWMSrouter.get(
    "/hsn-sac/csv-template",
    verifyToken,
    //   CsvUploadController.downloadHsnSacTemplate
);
VWMSrouter.post(
    "/hsn-sac/csv-upload",
    verifyToken,
    createSystemLoggerMiddleware("HSNSACMaster"),
    //   upload.single("file"),
    //   CsvUploadController.uploadHsnSacCsv
);
VWMSrouter.get(
    "/hsn-sac/uploads",
    verifyToken,
    //   CsvUploadController.listCsvUploads
);
VWMSrouter.get(
    "/hsn-sac/:id",
    verifyToken,
    HSNSACMasterController.getHSNSACById
);
VWMSrouter.put(
    "/hsn-sac/:id",
    verifyToken,
    createSystemLoggerMiddleware("HSNSACMaster"),
    HSNSACMasterController.updateHSNSAC
);
VWMSrouter.delete(
    "/hsn-sac/:id",
    verifyToken,
    createSystemLoggerMiddleware("HSNSACMaster"),
    HSNSACMasterController.deleteHSNSAC
);

// ==================== UOM MASTER ROUTES ====================
VWMSrouter.post(
    "/uom",
    verifyToken,
    createSystemLoggerMiddleware("UOMMaster"),
    UOMMasterController.createUOM
);
VWMSrouter.get("/uom", verifyToken, UOMMasterController.getUOMs);

// ==================== UOM CSV UPLOAD ROUTES ====================
VWMSrouter.get(
    "/uom/csv-template",
    verifyToken,
    //   CsvUploadController.downloadUomTemplate
);
VWMSrouter.post(
    "/uom/csv-upload",
    verifyToken,
    createSystemLoggerMiddleware("UOMMaster"),
    //   upload.single("file"),
    //   CsvUploadController.uploadUomCsv
);
VWMSrouter.get("/uom/uploads", verifyToken,
    // CsvUploadController.listCsvUploads
);
VWMSrouter.get("/uom/:id", verifyToken, UOMMasterController.getUOMById);
VWMSrouter.put(
    "/uom/:id",
    verifyToken,
    createSystemLoggerMiddleware("UOMMaster"),
    UOMMasterController.updateUOM
);
VWMSrouter.delete(
    "/uom/:id",
    verifyToken,
    createSystemLoggerMiddleware("UOMMaster"),
    UOMMasterController.deleteUOM
);

// ==================== ITEM MASTER ROUTES ====================
VWMSrouter.post(
    "/items",
    verifyToken,
    createSystemLoggerMiddleware("ItemMaster"),
    ItemMasterController.createItem
);
VWMSrouter.get("/items", verifyToken, ItemMasterController.getItems);

// ==================== ITEM CSV UPLOAD ROUTES ====================
VWMSrouter.get(
    "/items/csv-template",
    verifyToken,
    //   CsvUploadController.downloadItemTemplate
);
VWMSrouter.post(
    "/items/csv-upload",
    verifyToken,
    createSystemLoggerMiddleware("ItemMaster"),
    //   upload.single("file"),
    //   CsvUploadController.uploadItemCsv
);
VWMSrouter.get(
    "/items/uploads",
    verifyToken,
    //   CsvUploadController.listCsvUploads
);

// ==================== CURRENCY CSV UPLOAD ROUTES ====================
VWMSrouter.get(
    "/currencies/csv-template",
    verifyToken,
    //   CsvUploadController.downloadCurrencyTemplate
);
VWMSrouter.post(
    "/currencies/csv-upload",
    verifyToken,
    createSystemLoggerMiddleware("CurrencyMaster"),
    //   upload.single("file"),
    //   CsvUploadController.uploadCurrencyCsv
);
VWMSrouter.get(
    "/currencies/uploads",
    verifyToken,
    //   CsvUploadController.listCsvUploads
);
VWMSrouter.get("/items/:id", verifyToken, ItemMasterController.getItemById);
VWMSrouter.put(
    "/items/:id",
    verifyToken,
    createSystemLoggerMiddleware("ItemMaster"),
    ItemMasterController.updateItem
);
VWMSrouter.delete(
    "/items/:id",
    verifyToken,
    createSystemLoggerMiddleware("ItemMaster"),
    ItemMasterController.deleteItem
);
VWMSrouter.get(
    "/csv-uploads/:id",
    verifyToken,
    //   CsvUploadController.getCsvStatus
);
VWMSrouter.get(
    "/csv-uploads/:id/errors",
    verifyToken,
    //   CsvUploadController.downloadErrorsCsv
);

// Material Consumption attachments
// VWMSrouter.get(
//   "/material-consumption/:id/attachments",
//   verifyToken,
// //   VendorIssueMaterialConsumptionController.getMaterialConsumptionAttachments
// );
// VWMSrouter.post(
//   "/material-consumption/:id/attachments",
//   verifyToken,
//   createSystemLoggerMiddleware("VendorIssueMaterialConsumptionHeader"),
// //   upload.array("files"),
// //   VendorIssueMaterialConsumptionController.uploadMaterialConsumptionAttachments
// );
// VWMSrouter.delete(
//   "/material-consumption/attachments/:id",
//   verifyToken,
//   createSystemLoggerMiddleware("VendorIssueMaterialConsumptionHeader"),
// //   VendorIssueMaterialConsumptionController.deleteMaterialConsumptionAttachment
// );

// // Return Material line-level attachments
// VWMSrouter.get(
//   "/material-return/lines/:id/attachments",
//   verifyToken,
// //   ReturnMaterialController.getReturnMaterialLineAttachments
// );
// VWMSrouter.post(
//   "/material-return/lines/:id/attachments",
//   verifyToken,
//   createSystemLoggerMiddleware("ReturnMaterialHeader"),
// //   upload.array("files"),
// //   ReturnMaterialController.uploadReturnMaterialLineAttachments
// );
// VWMSrouter.delete(
//   "/material-return/attachments/:id",
//   verifyToken,
//   createSystemLoggerMiddleware("ReturnMaterialHeader"),
// //   ReturnMaterialController.deleteReturnMaterialAttachment
// );

// ==================== SERVICE TYPE ROUTES ====================
VWMSrouter.post(
    "/service-types",
    verifyToken,
    createSystemLoggerMiddleware("ServiceType"),
    ServiceTypeController.createServiceType
);
VWMSrouter.get(
    "/service-types",
    verifyToken,
    ServiceTypeController.getServiceTypes
);
VWMSrouter.get(
    "/service-types/:id",
    verifyToken,
    ServiceTypeController.getServiceTypeById
);
VWMSrouter.put(
    "/service-types/:id",
    verifyToken,
    createSystemLoggerMiddleware("ServiceType"),
    ServiceTypeController.updateServiceType
);
VWMSrouter.delete(
    "/service-types/:id",
    verifyToken,
    createSystemLoggerMiddleware("ServiceType"),
    ServiceTypeController.deleteServiceType
);

// ==================== SERVICE CATEGORY ROUTES ====================
VWMSrouter.post(
    "/service-categories",
    verifyToken,
    createSystemLoggerMiddleware("ServiceCategory"),
    ServiceCategoryController.createServiceCategory
);
VWMSrouter.get(
    "/service-categories",
    verifyToken,
    ServiceCategoryController.getServiceCategories
);
VWMSrouter.get(
    "/service-categories/:id",
    verifyToken,
    ServiceCategoryController.getServiceCategoryById
);
VWMSrouter.put(
    "/service-categories/:id",
    verifyToken,
    createSystemLoggerMiddleware("ServiceCategory"),
    ServiceCategoryController.updateServiceCategory
);
VWMSrouter.delete(
    "/service-categories/:id",
    verifyToken,
    createSystemLoggerMiddleware("ServiceCategory"),
    ServiceCategoryController.deleteServiceCategory
);

// ==================== SUBSIDIARY MASTER ROUTES ====================
VWMSrouter.post(
    "/subsidiaries",
    verifyToken,
    createSystemLoggerMiddleware("SubsidiaryMaster"),
    SubsidiaryController.createSubsidiary
);
VWMSrouter.get(
    "/subsidiaries",
    verifyToken,
    SubsidiaryController.getSubsidiaries
);
VWMSrouter.get(
    "/subsidiaries/:id",
    verifyToken,
    SubsidiaryController.getSubsidiaryById
);
VWMSrouter.put(
    "/subsidiaries/:id",
    verifyToken,
    createSystemLoggerMiddleware("SubsidiaryMaster"),
    SubsidiaryController.updateSubsidiary
);
VWMSrouter.delete(
    "/subsidiaries/:id",
    verifyToken,
    createSystemLoggerMiddleware("SubsidiaryMaster"),
    SubsidiaryController.deleteSubsidiary
);

// ==================== ACCOUNT TYPE MASTER ROUTES ====================
VWMSrouter.post(
    "/platform/account-types",
    verifyToken,
    createSystemLoggerMiddleware("AccountTypeMaster"),
    //   AccountTypeController.createAccountType
);
VWMSrouter.get(
    "/platform/account-types",
    verifyToken,
    //   AccountTypeController.getAccountTypes
);
VWMSrouter.get(
    "/platform/account-types/:id",
    verifyToken,
    //   AccountTypeController.getAccountTypeById
);
VWMSrouter.put(
    "/platform/account-types/:id",
    verifyToken,
    createSystemLoggerMiddleware("AccountTypeMaster"),
    //   AccountTypeController.updateAccountType
);
VWMSrouter.delete(
    "/platform/account-types/:id",
    verifyToken,
    createSystemLoggerMiddleware("AccountTypeMaster"),
    //   AccountTypeController.deleteAccountType
);

// ==================== CHART OF ACCOUNT MASTER ROUTES ====================
VWMSrouter.post(
    "/chart-of-accounts",
    verifyToken,
    createSystemLoggerMiddleware("ChartOfAccountMaster"),
    //   ChartController.createChartAccount
);
VWMSrouter.get(
    "/chart-of-accounts",
    verifyToken,
    //   ChartController.getChartAccounts
);
VWMSrouter.get(
    "/chart-of-accounts/:id",
    verifyToken,
    //   ChartController.getChartAccountById
);
VWMSrouter.put(
    "/chart-of-accounts/:id",
    verifyToken,
    createSystemLoggerMiddleware("ChartOfAccountMaster"),
    //   ChartController.updateChartAccount
);
VWMSrouter.delete(
    "/chart-of-accounts/:id",
    verifyToken,
    createSystemLoggerMiddleware("ChartOfAccountMaster"),
    //   ChartController.deleteChartAccount
);

// ==================== MIS TYPE MASTER ROUTES ====================
VWMSrouter.post(
    "/mis-types",
    verifyToken,
    createSystemLoggerMiddleware("MISTypeMaster"),
    //   MISTypeController.createMISType
);
// VWMSrouter.get("/mis-types", verifyToken, MISTypeController.getMISTypes);
// VWMSrouter.get("/mis-types/:id", verifyToken, MISTypeController.getMISTypeById);
// VWMSrouter.put(
//   "/mis-types/:id",
//   verifyToken,
//   createSystemLoggerMiddleware("MISTypeMaster"),
//   MISTypeController.updateMISType
// );
// VWMSrouter.delete(
//   "/mis-types/:id",
//   verifyToken,
//   createSystemLoggerMiddleware("MISTypeMaster"),
//   MISTypeController.deleteMISType
// );

// ==================== CURRENCY MASTER ROUTES ====================
VWMSrouter.post(
    "/currencies",
    verifyToken,
    createSystemLoggerMiddleware("CurrencyMaster"),
    CurrencyController.createCurrency
);
VWMSrouter.get("/currencies", verifyToken, CurrencyController.getCurrencies);
VWMSrouter.get(
    "/currencies/:id",
    verifyToken,
    CurrencyController.getCurrencyById
);
VWMSrouter.put(
    "/currencies/:id",
    verifyToken,
    createSystemLoggerMiddleware("CurrencyMaster"),
    CurrencyController.updateCurrency
);
VWMSrouter.delete(
    "/currencies/:id",
    verifyToken,
    createSystemLoggerMiddleware("CurrencyMaster"),
    CurrencyController.deleteCurrency
);

// ==================== SITE MASTER ROUTES ====================
// VWMSrouter.post(
//   "/sites",
//   verifyToken,
//   createSystemLoggerMiddleware("SiteMaster"),
//   SiteMasterController.createSite
// );
// VWMSrouter.get("/sites", verifyToken, SiteMasterController.getSites);
// VWMSrouter.get("/sites/:id", verifyToken, SiteMasterController.getSiteById);
// VWMSrouter.put(
//   "/sites/:id",
//   verifyToken,
//   createSystemLoggerMiddleware("SiteMaster"),
//   SiteMasterController.updateSite
// );
// VWMSrouter.delete(
//   "/sites/:id",
//   verifyToken,
//   createSystemLoggerMiddleware("SiteMaster"),
//   SiteMasterController.deleteSite
// );

// ==================== TRANSPORTATION MODE ROUTES ====================
VWMSrouter.post(
    "/transportation-modes",
    verifyToken,
    createSystemLoggerMiddleware("TransportationMode"),
    TransportationModeController.createTransportationMode
);
VWMSrouter.get(
    "/transportation-modes",
    verifyToken,
    TransportationModeController.getTransportationModes
);
VWMSrouter.get(
    "/transportation-modes/:id",
    verifyToken,
    TransportationModeController.getTransportationModeById
);
VWMSrouter.put(
    "/transportation-modes/:id",
    verifyToken,
    createSystemLoggerMiddleware("TransportationMode"),
    TransportationModeController.updateTransportationMode
);
VWMSrouter.delete(
    "/transportation-modes/:id",
    verifyToken,
    createSystemLoggerMiddleware("TransportationMode"),
    TransportationModeController.deleteTransportationMode
);

// ==================== VENDOR MASTER ROUTES ====================
VWMSrouter.post(
    "/vendors",
    verifyToken,
    createSystemLoggerMiddleware("VendorDetails"),
    VendorController.createVendor
);
VWMSrouter.get("/vendors", verifyToken, VendorController.getVendors);
VWMSrouter.get("/vendors/:id", verifyToken, VendorController.getVendorById);
VWMSrouter.put(
    "/vendors/:id",
    verifyToken,
    createSystemLoggerMiddleware("VendorDetails"),
    VendorController.updateVendor
);
VWMSrouter.delete(
    "/vendors/:id",
    verifyToken,
    createSystemLoggerMiddleware("VendorDetails"),
    VendorController.deleteVendor
);

// ==================== EMPLOYEE MASTER ROUTES ====================
// VWMSrouter.post(
//   "/employees",
//   verifyToken,
//   createSystemLoggerMiddleware("EmployeeMaster"),
//   EmployeeMasterController.createEmployee
// );
// VWMSrouter.get(
//   "/employees",
//   verifyToken,
//   EmployeeMasterController.getEmployees
// );
// VWMSrouter.get(
//   "/employees/:id",
//   verifyToken,
//   EmployeeMasterController.getEmployeeById
// );
// VWMSrouter.put(
//   "/employees/:id",
//   verifyToken,
//   createSystemLoggerMiddleware("EmployeeMaster"),
//   EmployeeMasterController.updateEmployee
// );
// VWMSrouter.delete(
//   "/employees/:id",
//   verifyToken,
//   createSystemLoggerMiddleware("EmployeeMaster"),
//   EmployeeMasterController.deleteEmployee
// );

// ==================== VENDOR SERVICE WORK ORDER ROUTES ====================
// VWMSrouter.post(
//   "/work-orders",
//   verifyToken,
//   createSystemLoggerMiddleware("VendorServiceWorkOrder"),
//   VendorServiceWorkOrderController.createWorkOrder
// );
// VWMSrouter.get(
//   "/work-orders",
//   verifyToken,
//   VendorServiceWorkOrderController.getWorkOrders
// );
// VWMSrouter.get(
//   "/work-orders/:id",
//   verifyToken,
//   VendorServiceWorkOrderController.getWorkOrderById
// );
// VWMSrouter.put(
//   "/work-orders/:id",
//   verifyToken,
//   createSystemLoggerMiddleware("VendorServiceWorkOrder"),
//   VendorServiceWorkOrderController.updateWorkOrder
// );
// VWMSrouter.delete(
//   "/work-orders/:id",
//   verifyToken,
//   createSystemLoggerMiddleware("VendorServiceWorkOrder"),
//   VendorServiceWorkOrderController.deleteWorkOrder
// );

// ==================== DELIVERY CHALLAN ROUTES ====================
// Create new delivery challan with header and line items
VWMSrouter.post(
    "/delivery-challan",
    verifyToken,
    createSystemLoggerMiddleware("DeliveryChallanHeader"),
    //   upload.array("attachments", 10),
    DeliveryChallanController.createDeliveryChallan
);
// Get all delivery challans for the company
VWMSrouter.get(
    "/delivery-challan",
    verifyToken,
    DeliveryChallanController.getAllDeliveryChallans
);
// Get specific delivery challan by ID
VWMSrouter.get(
    "/delivery-challan/:id",
    verifyToken,
    DeliveryChallanController.getDeliveryChallanById
);
// Update delivery challan
VWMSrouter.put(
    "/delivery-challan/:id",
    verifyToken,
    createSystemLoggerMiddleware("DeliveryChallanHeader"),
    //   upload.array("attachments", 10),
    DeliveryChallanController.updateDeliveryChallan
);
// Delete delivery challan (soft delete)
VWMSrouter.delete(
    "/delivery-challan/:id",
    verifyToken,
    createSystemLoggerMiddleware("DeliveryChallanHeader"),
    DeliveryChallanController.deleteDeliveryChallan
);
// Update delivery challan status (DRAFT/CONFIRMED/CANCELLED)
VWMSrouter.patch(
    "/delivery-challan/:id/status",
    verifyToken,
    createSystemLoggerMiddleware("DeliveryChallanHeader"),
    DeliveryChallanController.updateDeliveryChallanStatus
);
// Export delivery challans to CSV
VWMSrouter.get(
    "/delivery-challan/export/csv",
    verifyToken,
    //   DeliveryChallanController.exportDeliveryChallansCSV
);

// ==================== VENDOR ISSUE MATERIAL ROUTES ====================
// Create new vendor issue material with header and line items
// VWMSrouter.post(
//   "/vendor-issue-material",
//   verifyToken,
//   createSystemLoggerMiddleware("VendorIssueMaterialHeader"),
//   upload.array("attachments", 10),
//   VendorIssueMaterialController.createVendorIssueMaterial
// );
// // Get all vendor issue materials for the company
// VWMSrouter.get(
//   "/vendor-issue-material",
//   verifyToken,
//   VendorIssueMaterialController.getAllVendorIssueMaterials
// );
// // Get specific vendor issue material by ID
// VWMSrouter.get(
//   "/vendor-issue-material/:id",
//   verifyToken,
//   VendorIssueMaterialController.getVendorIssueMaterialById
// );
// // Update vendor issue material
// VWMSrouter.put(
//   "/vendor-issue-material/:id",
//   verifyToken,
//   createSystemLoggerMiddleware("VendorIssueMaterialHeader"),
//   upload.array("attachments", 10),
//   VendorIssueMaterialController.updateVendorIssueMaterial
// );
// // Delete vendor issue material (soft delete)
// VWMSrouter.delete(
//   "/vendor-issue-material/:id",
//   verifyToken,
//   createSystemLoggerMiddleware("VendorIssueMaterialHeader"),
//   VendorIssueMaterialController.deleteVendorIssueMaterial
// );
// Update material status (DRAFT/CONFIRMED/ISSUED/CANCELLED)
// VWMSrouter.patch(
//   "/vendor-issue-material/:id/status",
//   verifyToken,
//   createSystemLoggerMiddleware("VendorIssueMaterialHeader"),
//   VendorIssueMaterialController.updateMaterialStatus
// );
// // Get available quantity for specific item
// VWMSrouter.get(
//   "/vendor-issue-material/item/:itemId/quantity",
//   verifyToken,
//   VendorIssueMaterialController.getItemAvailableQuantity
// );
// // Export vendor issue materials to CSV
// VWMSrouter.get(
//   "/vendor-issue-material/export/csv",
//   verifyToken,
//   VendorIssueMaterialController.exportVendorIssueMaterialsCSV
// );

// ==================== VENDOR ISSUE MATERIAL CONSUMPTION ROUTES ====================
// Create new material consumption record
// VWMSrouter.post(
//   "/material-consumption",
//   verifyToken,
//   createSystemLoggerMiddleware("VendorIssueMaterialConsumptionHeader"),
//   VendorIssueMaterialConsumptionController.createMaterialConsumption
// );
// // Get all material consumption records for the company
// VWMSrouter.get(
//   "/material-consumption",
//   verifyToken,
//   VendorIssueMaterialConsumptionController.getAllMaterialConsumptions
// );
// // Get available issue materials for consumption (filter by vendor/employee/work order)
// VWMSrouter.get(
//   "/material-consumption/available-materials",
//   verifyToken,
//   VendorIssueMaterialConsumptionController.getAvailableIssueMaterials
// );
// // Export material consumptions to CSV
// VWMSrouter.get(
//   "/material-consumption/export/csv",
//   verifyToken,
//   VendorIssueMaterialConsumptionController.exportMaterialConsumptionsCSV
// );
// // Get specific material consumption by ID
// VWMSrouter.get(
//   "/material-consumption/:id",
//   verifyToken,
//   VendorIssueMaterialConsumptionController.getMaterialConsumptionById
// );
// // Update material consumption record
// VWMSrouter.put(
//   "/material-consumption/:id",
//   verifyToken,
//   createSystemLoggerMiddleware("VendorIssueMaterialConsumptionHeader"),
//   VendorIssueMaterialConsumptionController.updateMaterialConsumption
// );
// // Delete (soft delete) material consumption record
// VWMSrouter.delete(
//   "/material-consumption/:id",
//   verifyToken,
//   createSystemLoggerMiddleware("VendorIssueMaterialConsumptionHeader"),
//   VendorIssueMaterialConsumptionController.deleteMaterialConsumption
// );
// // Update material consumption status
// VWMSrouter.patch(
//   "/material-consumption/:id/status",
//   verifyToken,
//   createSystemLoggerMiddleware("VendorIssueMaterialConsumptionHeader"),
//   VendorIssueMaterialConsumptionController.updateMaterialConsumptionStatus
// );

// ==================== VENDOR BILL ROUTES ====================
// Create new vendor bill manually
// VWMSrouter.post(
//   "/vendor-bill",
//   verifyToken,
//   createSystemLoggerMiddleware("VendorBillHeader"),
//   VendorBillController.createVendorBill
// );
// // Generate vendor bill automatically from consumption records
// VWMSrouter.post(
//   "/vendor-bill/generate",
//   verifyToken,
//   createSystemLoggerMiddleware("VendorBillHeader"),
//   VendorBillController.generateBillFromConsumptions
// );
// // Get all vendor bills for the company
// VWMSrouter.get(
//   "/vendor-bill",
//   verifyToken,
//   VendorBillController.getAllVendorBills
// );
// // Get billable consumption records (unbilled consumptions) - MUST come before /:id route
// VWMSrouter.get(
//   "/vendor-bill/billable-consumptions",
//   verifyToken,
//   VendorBillController.getBillableConsumptions
// );
// // Get service rates for work orders - MUST come before /:id route
// VWMSrouter.get(
//   "/vendor-bill/service-rates",
//   verifyToken,
//   VendorBillController.getServiceRates
// );
// // Get specific vendor bill by ID - MUST come after specific routes
// VWMSrouter.get(
//   "/vendor-bill/:id",
//   verifyToken,
//   VendorBillController.getVendorBillById
// );
// // Update vendor bill (edit header and line items)
// VWMSrouter.put(
//   "/vendor-bill/:id",
//   verifyToken,
//   createSystemLoggerMiddleware("VendorBillHeader"),
//   VendorBillController.updateVendorBill
// );
// Update vendor bill status (DRAFT/SUBMITTED/APPROVED/PAID/CANCELLED)
// VWMSrouter.patch(
//   "/vendor-bill/:id/status",
//   verifyToken,
//   createSystemLoggerMiddleware("VendorBillHeader"),
//   VendorBillController.updateBillStatus
// );
// // Delete vendor bill (soft delete and revert consumption status)
// VWMSrouter.delete(
//   "/vendor-bill/:id",
//   verifyToken,
//   createSystemLoggerMiddleware("VendorBillHeader"),
//   VendorBillController.deleteBill
// );

// ==================== INVENTORY ROUTES ====================
// Use the inventory router for all inventory-related endpoints
VWMSrouter.use("/inventory", inventoryRouter);

// ==================== DASHBOARD ROUTES ====================
// Dashboard summary - get all metrics at once
// VWMSrouter.get(
//   "/dashboard/summary",
//   verifyToken,
//   DashboardController.getDashboardSummary
// );
// // Detailed reports for each dashboard metric
// VWMSrouter.get(
//   "/dashboard/dc-inward-pending",
//   verifyToken,
//   DashboardController.getDCInwardPendingDetails
// );
// VWMSrouter.get(
//   "/dashboard/current-inventory",
//   verifyToken,
//   DashboardController.getCurrentInventoryDetails
// );
// VWMSrouter.get(
//   "/dashboard/pending-bills",
//   verifyToken,
//   DashboardController.getPendingBillsDetails
// );
// VWMSrouter.get(
//   "/dashboard/inventory-loss",
//   verifyToken,
//   DashboardController.getInventoryLossDetails
// );
// VWMSrouter.get(
//   "/dashboard/pending-consumptions",
//   verifyToken,
//   DashboardController.getPendingConsumptionsDetails
// );
// VWMSrouter.get(
//   "/dashboard/overdue-inventory",
//   verifyToken,
//   DashboardController.getOverDueInventoryDetails
// );
// VWMSrouter.get(
//   "/dashboard/aging-inventory",
//   verifyToken,
//   DashboardController.getAgingInventoryDetails
// );

// ==================== WORK CATEGORY ROUTES ====================
// Create new work category
VWMSrouter.post(
    "/work-category",
    verifyToken,
    createSystemLoggerMiddleware("WorkCategory"),
    WorkCategoryController.createWorkCategory
);
// Get all work categories for the company
VWMSrouter.get(
    "/work-category",
    verifyToken,
    WorkCategoryController.getWorkCategories
);
// Get specific work category by ID (must come after other specific routes)
VWMSrouter.get(
    "/work-category/:id",
    verifyToken,
    WorkCategoryController.getWorkCategoryById
);
// Update work category
VWMSrouter.patch(
    "/work-category/:id",
    verifyToken,
    createSystemLoggerMiddleware("WorkCategory"),
    WorkCategoryController.updateWorkCategory
);
// Delete work category
VWMSrouter.delete(
    "/work-category/:id",
    verifyToken,
    createSystemLoggerMiddleware("WorkCategory"),
    WorkCategoryController.deleteWorkCategory
);

// ==================== STORE MASTER ROUTES ====================
// Create new store
// VWMSrouter.post(
//   "/stores",
//   verifyToken,
//   createSystemLoggerMiddleware("StoreMaster"),
//   StoreMasterController.createStore
// );
// // Get all stores for the company
// VWMSrouter.get("/stores", verifyToken, StoreMasterController.getStores);
// // Get a single store by ID
// VWMSrouter.get("/stores/:id", verifyToken, StoreMasterController.getStoreById);
// // Update store
// VWMSrouter.put(
//   "/stores/:id",
//   verifyToken,
//   createSystemLoggerMiddleware("StoreMaster"),
//   StoreMasterController.updateStore
// );
// // Delete store
// VWMSrouter.delete(
//   "/stores/:id",
//   verifyToken,
//   createSystemLoggerMiddleware("StoreMaster"),
//   StoreMasterController.deleteStore
// );

// ==================== MATERIAL STATUS MASTER ROUTES ====================
// Create new material status
// VWMSrouter.post(
//   "/material-status",
//   verifyToken,
//   createSystemLoggerMiddleware("MaterialStatus"),
//   MaterialStatusController.createMaterialStatus
// );
// // Get all material statuses for the company
// VWMSrouter.get(
//   "/material-status",
//   verifyToken,
//   MaterialStatusController.getMaterialStatuses
// );
// // Get a single material status by ID
// VWMSrouter.get(
//   "/material-status/:id",
//   verifyToken,
//   MaterialStatusController.getMaterialStatusById
// );
// // Update material status
// VWMSrouter.put(
//   "/material-status/:id",
//   verifyToken,
//   createSystemLoggerMiddleware("MaterialStatus"),
//   MaterialStatusController.updateMaterialStatus
// );
// // Delete material status
// VWMSrouter.delete(
//   "/material-status/:id",
//   verifyToken,
//   createSystemLoggerMiddleware("MaterialStatus"),
//   MaterialStatusController.deleteMaterialStatus
// );

// Create a new payment term
// VWMSrouter.post(
//   "/payment-terms",
//   verifyToken,
//   createSystemLoggerMiddleware("PaymentTerms"),
//   PaymentTermController.createPaymentTerm
// );
// // Get all payment terms for the company
// VWMSrouter.get(
//   "/payment-terms",
//   verifyToken,
//   PaymentTermController.getPaymentTerms
// );
// // Get a single payment term by ID
// VWMSrouter.get(
//   "/payment-terms/:id",
//   verifyToken,
//   PaymentTermController.getPaymentTermById
// );
// // Update a payment term
// VWMSrouter.put(
//   "/payment-terms/:id",
//   verifyToken,
//   createSystemLoggerMiddleware("PaymentTerms"),
//   PaymentTermController.updatePaymentTerm
// );
// // Delete a payment term
// VWMSrouter.delete(
//   "/payment-terms/:id",
//   verifyToken,
//   createSystemLoggerMiddleware("PaymentTerms"),
//   PaymentTermController.deletePaymentTerm
// );

// ==================== RETURN MATERIAL ROUTES ====================
// Base collection operations (most general, first)
// VWMSrouter.post(
//   "/material-return",
//   verifyToken,
//   createSystemLoggerMiddleware("ReturnMaterialHeader"),
//   ReturnMaterialController.createMaterialReturn
// );
// VWMSrouter.get(
//   "/material-return",
//   verifyToken,
//   ReturnMaterialController.getAllMaterialReturns
// );
// // Specific sub-paths (before any :id params to avoid capture)
// VWMSrouter.get(
//   "/material-return/available-consumed-materials",
//   verifyToken,
//   ReturnMaterialController.getAvailableConsumedMaterials
// );
// VWMSrouter.get(
//   "/material-return/export/csv",
//   verifyToken,
//   ReturnMaterialController.exportMaterialReturnsCSV
// );
// // Parameterized instance operations (last, to catch dynamic segments)
// VWMSrouter.get(
//   "/material-return/:id",
//   verifyToken,
//   ReturnMaterialController.getMaterialReturnById
// );
// VWMSrouter.put(
//   "/material-return/:id",
//   verifyToken,
//   createSystemLoggerMiddleware("ReturnMaterialHeader"),
//   ReturnMaterialController.updateMaterialReturn
// );
// VWMSrouter.delete(
//   "/material-return/:id",
//   verifyToken,
//   createSystemLoggerMiddleware("ReturnMaterialHeader"),
//   ReturnMaterialController.deleteMaterialReturn
// );
// VWMSrouter.patch(
//   "/material-return/:id/status",
//   verifyToken,
//   createSystemLoggerMiddleware("ReturnMaterialHeader"),
//   ReturnMaterialController.updateMaterialReturnStatus
// );

// ===== SYSTEM LOG ROUTES =====
// Get all system logs with filtering and pagination
VWMSrouter.get("/system-logs", verifyToken, SystemLogController.getSystemLogs);
// Get system log statistics
VWMSrouter.get(
    "/system-logs/stats",
    verifyToken,
    SystemLogController.getSystemLogStats
);
// Get filter options for system logs
VWMSrouter.get(
    "/system-logs/filter-options",
    verifyToken,
    SystemLogController.getFilterOptions
);
// Get specific system log by ID
VWMSrouter.get(
    "/system-logs/:id",
    verifyToken,
    SystemLogController.getSystemLogById
);
// Soft delete system log (for cleanup)
VWMSrouter.delete(
    "/system-logs/:id",
    verifyToken,
    createSystemLoggerMiddleware("SystemLog"),
    SystemLogController.deleteSystemLog
);
// Bulk cleanup old logs (utility function)
VWMSrouter.post(
    "/system-logs/cleanup",
    verifyToken,
    createSystemLoggerMiddleware("SystemLog"),
    SystemLogController.cleanupOldLogs
);

// ==================== DASHBOARD ROUTES ====================
// Get comprehensive dashboard summary
// VWMSrouter.get(
//   "/dashboard/summary",
//   verifyToken,
//   DashboardController.getDashboardSummary
// );

// // Get detailed reports for each dashboard metric
// VWMSrouter.get(
//   "/dashboard/dc-inward-pending",
//   verifyToken,
//   DashboardController.getDCInwardPendingDetails
// );
// VWMSrouter.get(
//   "/dashboard/current-inventory",
//   verifyToken,
//   DashboardController.getCurrentInventoryDetails
// );
// VWMSrouter.get(
//   "/dashboard/pending-bills",
//   verifyToken,
//   DashboardController.getPendingBillsDetails
// );
// VWMSrouter.get(
//   "/dashboard/inventory-loss",
//   verifyToken,
//   DashboardController.getInventoryLossDetails
// );
// VWMSrouter.get(
//   "/dashboard/pending-consumptions",
//   verifyToken,
//   DashboardController.getPendingConsumptionsDetails
// );
// VWMSrouter.get(
//   "/dashboard/overdue-inventory",
//   verifyToken,
//   DashboardController.getOverDueInventoryDetails
// );
// VWMSrouter.get(
//   "/dashboard/aging-inventory",
//   verifyToken,
//   DashboardController.getAgingInventoryDetails
// );

// // ==================== DASHBOARD ANALYTICS ROUTES ====================
// // Get transaction trends over time with filtering
// VWMSrouter.get(
//   "/dashboard/analytics/transaction-trends",
//   verifyToken,
//   DashboardController.getTransactionTrends
// );

// // Get material movement summary (inward, issued, consumed, returned)
// VWMSrouter.get(
//   "/dashboard/analytics/material-movements",
//   verifyToken,
//   DashboardController.getMaterialMovementSummary
// );

// // Get vendor performance analytics
// VWMSrouter.get(
//   "/dashboard/analytics/vendor-performance",
//   verifyToken,
//   DashboardController.getVendorPerformance
// );

// // Get inventory trends over time
// VWMSrouter.get(
//   "/dashboard/analytics/inventory-trends",
//   verifyToken,
//   DashboardController.getInventoryTrends
// );

// // Get consumption vs return ratios
// VWMSrouter.get(
//   "/dashboard/analytics/consumption-return-ratio",
//   verifyToken,
//   DashboardController.getConsumptionReturnRatio
// );

// // Get recent system activities
// VWMSrouter.get(
//   "/dashboard/analytics/recent-activities",
//   verifyToken,
//   DashboardController.getRecentActivities
// );

// // Get dashboard filters data (vendors, items, sites, transaction types)
// VWMSrouter.get(
//   "/dashboard/filters",
//   verifyToken,
//   DashboardController.getDashboardFilters
// );

export default VWMSrouter;