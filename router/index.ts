import express from "express";

import registrationTypeRouter from "./registrationTypeRouter";
import transportationModeRouter from "./transportationMode";
import panAvailibilityRouter from "./panAvailibilityRouter";
import serviceCategoryRouter from "./serviceCategoryRouter";
import purchaseInvoiceRouter from "./purchaseInvoiceRouter";
import purchasePaymentRouter from "./purchasePaymentRouter";
import deliveryChallanRouter from "./deliveryChallanRouter";
import purchaseReturnRouter from "./purchaseReturnRouter";
import purchaseReturnFulfillmentRouter from "./purchaseReturnFulfillmentRouter";
import vendorCreditRouter from "./vendorCreditRouter";
import paymentMethodRouter from "./paymentMethodRouter";
import paymentTermRouter from "./paymentTermRouter";
import qualityReportRouter from "./qualityReportRouter";
import purchaseOrderRouter from "./purchaseOrderRouter";
import workCategoryRouter from "./workCategoryRouter";
import chartOfAccountRouter from "./chartOfAccRouter";
import serviceTypeRouter from "./serviceTypeRouter";
import salesReturnRouter from "./salesReturnRouter";
import accountTypeRouter from "./platform/accountTypeRouter";
import itemTypeRouter from "./platform/itemTypeRouter";
import permissionRouter from "./permissionRouter";
import subsidiaryRouter from "./subsidiaryRouter";
import salesOrderRouter from "./salesOrderRouter";
import inventoryRouter from "./inventoryRouter";
import warehouseRouter from "./warehouseRouter";
import commodityRouter from "./commodityRouter";
import itemGroupRouter from "./itemGroupRouter";
import currencyRouter from "./currencyRouter";
import customerRouter from "./customerRouter";
import categoryRouter from "./categoryRouter";
import companyRouter from "./companyRouter";
import userRouter from "./userRouter/index";
import misTypeRouter from "./misTypeRouter";
import vendorRouter from "./vendorRouter";
import godownRouter from "./godownRouter";
import stateRouter from "./stateRouter";
import StackRouter from "./stackRouter";
import cityRouter from "./cityRouter";
import itemRouter from "./itemRouter";
import uomRouter from "./UOMRouter";
import hsnRouter from "./hsnRouter";
import grnRouter from "./grnRouter";
import voucherTypeRouter from "./finance/voucherTypeRouter";
import journalEntryRouter from "./finance/journalEntryRouter";
import debitNoteRouter from "./finance/debitNoteRouter";
import creditNoteRouter from "./finance/creditNoteRouter";
import classRouter from "./classRouter";
import departmentRouter from "./departmentRouter";
// import securityRouter from "./Admin/Security/index";

// import clientsecurityRouter from "./Admin/ClientSecurityRouter";
// import securityRouter from "./Admin/Security/index";

// import companyRouter from "./Admin/CompanyRouter";
// import godownRouter from "./Admin/GodownRouter";
// import warehouseRouter from "./Admin/WarehouseRouter";
// import StackRouter from "./Admin/StackRouter";
// import customerRouter from "./Admin/CustomerRouter";
// import commodityRouter from "./Admin/CommodityRouter";
// import Rentroutter from "./Admin/RentRouter";
// import RequestDepositer from "./Admin/RequestDepositer";
// import GatePass from "./Admin/GatePassRouter";
// import RequestDelivery from "./Admin/RequestDeliveryRouter";
// import InventoryRouter from "./Admin/InventoryRouter";
// import GradeRouter from "./Admin/GradeRouter";
// import UtilizationRouter from "./Admin/UtilizationRouter";
// import InsuranceRouter from "./Admin/InsuranceRouter";
// import BillRouter from "./Admin/BillRouter";
// import InvoiceRouter from "./Admin/InvoiceRouter";
// import VoucherRouter from "./Admin/VoucherRouter";
// import LedgerRouter from "./Admin/LedgerRouter";
import PermissionRouter from "./permissionRouter";
// import locationRouter from "./Admin/LocationRouter";
// import VWMSrouter from "./vwms/index";
// import ItemGroupRouter from "./Admin/ItemGroupRouter";
// import OrderBookingRouter from "./O2C/OrderBookingRouter/singleOrderBooking";
// import MultiOrderBookingRouter from "./O2C/OrderBookingRouter/multiOrderBooking";
// import itemRateRouter from "./Admin/ItemRateRouter";
// import feedbackRouter from "./feedbackRouter";
// import NotificationRouter from "./NotificationRouter";
// import LayoutPermissionRouter from "./Admin/LayoutPermissionRouter";

const indexRouter = express.Router();

// Core Routes
indexRouter.use("/user", userRouter);
indexRouter.use("/permission", permissionRouter);
indexRouter.use("/company", companyRouter);
indexRouter.use("/customer", customerRouter);
indexRouter.use("/warehouse", warehouseRouter);
indexRouter.use("/uom", uomRouter);
indexRouter.use("/currencies", currencyRouter);
indexRouter.use("/subsidiary", subsidiaryRouter);
indexRouter.use("/class", classRouter);
indexRouter.use("/department", departmentRouter);
indexRouter.use("/states", stateRouter);
indexRouter.use("/cities", cityRouter);
indexRouter.use("/category", categoryRouter);
indexRouter.use("/item-group", itemGroupRouter);
indexRouter.use("/item", itemRouter);
indexRouter.use("/pan-availibility", panAvailibilityRouter);
indexRouter.use("/registration-type", registrationTypeRouter);
indexRouter.use("/payment-method", paymentMethodRouter);
indexRouter.use("/payment-terms", paymentTermRouter);
indexRouter.use("/permission", permissionRouter);
indexRouter.use("/work-category", workCategoryRouter);
indexRouter.use("/transportation-modes", transportationModeRouter);
indexRouter.use("/service-categories", serviceCategoryRouter);
indexRouter.use("/service-types", serviceTypeRouter);
indexRouter.use("/commodity", commodityRouter);
indexRouter.use("/vendor", vendorRouter);
indexRouter.use("/hsn-sac", hsnRouter);
indexRouter.use("/inventory", inventoryRouter);
indexRouter.use("/sales-order", salesOrderRouter);
indexRouter.use("/delivery-challan", deliveryChallanRouter);
indexRouter.use("/sales-return", salesReturnRouter);
indexRouter.use("/purchase-order", purchaseOrderRouter);
indexRouter.use("/purchase-invoice", purchaseInvoiceRouter);
indexRouter.use("/purchase-payment", purchasePaymentRouter);
indexRouter.use("/grn", grnRouter);
indexRouter.use("/purchase-return", purchaseReturnRouter);
indexRouter.use("/purchase-return-fulfillment", purchaseReturnFulfillmentRouter);
indexRouter.use("/vendor-credit", vendorCreditRouter);
indexRouter.use("/quality-report", qualityReportRouter);
indexRouter.use("/godown", godownRouter);
indexRouter.use("/stack", StackRouter);
indexRouter.use("/mis-types", misTypeRouter);
indexRouter.use("/platform/account-types", accountTypeRouter);
indexRouter.use("/platform/item-types", itemTypeRouter);
indexRouter.use("/chart-of-accounts", chartOfAccountRouter);
indexRouter.use("/finance/voucher-types", voucherTypeRouter);
indexRouter.use("/finance/journal-entry", journalEntryRouter);
indexRouter.use("/finance/debit-notes", debitNoteRouter);
indexRouter.use("/finance/credit-notes", creditNoteRouter);
// indexRouter.use("/client-security", clientsecurityRouter);
// indexRouter.use("/security", securityRouter);

// Existing WMS Routes
// indexRouter.use("/company", companyRouter);
// indexRouter.use("/warehouse", warehouseRouter);
// indexRouter.use("/customer", customerRouter);
// indexRouter.use("/commodity", commodityRouter);
// indexRouter.use("/rent", Rentroutter);
// indexRouter.use("/request-deposit", RequestDepositer);
// indexRouter.use("/gate-pass", GatePass);
// indexRouter.use("/request-delivery", RequestDelivery);
// indexRouter.use("/inventory", InventoryRouter);
// indexRouter.use("/grade", GradeRouter);
// indexRouter.use("/utilization", UtilizationRouter);
// indexRouter.use("/insurance", InsuranceRouter);
// indexRouter.use("/bill", BillRouter);
// indexRouter.use("/invoice", InvoiceRouter);
// indexRouter.use("/voucher", VoucherRouter);
// indexRouter.use("/ledger", LedgerRouter);
indexRouter.use("/permission", PermissionRouter);
// indexRouter.use("/location", locationRouter);

// // VWMS Routes
// indexRouter.use("/vwms", VWMSrouter);

// // O2C Routes
// indexRouter.use("/o2c/order-booking", OrderBookingRouter);
// indexRouter.use("/o2c/multi-order-booking", MultiOrderBookingRouter);

// // Itewm Group Routes
// indexRouter.use("/item-group", ItemGroupRouter);

// // Item Rate Routes
// indexRouter.use("/item-rate", itemRateRouter);

// // Feedback Routes
// indexRouter.use("/feedback", feedbackRouter);

// // Notification Routes
// indexRouter.use("/notification", NotificationRouter);

// // Layout Permission Routes
// indexRouter.use("/layout", LayoutPermissionRouter);

export default indexRouter;