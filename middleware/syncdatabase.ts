// import CandidateReasons from "../modals/CandidateReasons/CandidateReasons";

// import SecurityQuestion from "../modals/SecurityQuestions/index";
// import UserSecurityAnswer from "../modals/UserSecurityAnswer/index";

import { QualityInspectionHeader, QualityInspectionLine } from "../modals/Transactions/purchase/qualityReport";
import { PurchaseInvoiceHeader, PurchaseInvoiceLine } from "../modals/Transactions/purchase/purchaseInvoice";
import { PurchasePaymentHeader, PurchasePaymentLine } from "../modals/Transactions/purchase/purchasePayment";
import { PurchaseReturnHeader, PurchaseReturnLine } from "../modals/Transactions/purchase/purchaseReturn";
import PurchaseReturnFulfillmentHeader from "../modals/Transactions/purchase/purchaseReturn/purchaseReturnFulfillmentHeader";
import PurchaseReturnFulfillmentLine from "../modals/Transactions/purchase/purchaseReturn/purchaseReturnFulfillmentLine";
import VendorCreditHeader from "../modals/Transactions/purchase/vendorCredit/vendorCreditHeader";
import VendorCreditLine from "../modals/Transactions/purchase/vendorCredit/vendorCreditLine";
import { DeliveryChallanHeader, DeliveryChallanLine } from "../modals/Transactions/sales/deliveryChallan";
import { PurchaseOrder, PurchaseOrderLine } from "../modals/Transactions/purchase/purchaseOrder";
import { SalesReturnHeader, SalesReturnLine } from "../modals/Transactions/sales/salesReturn";
import { SalesOrderHeader, SalesOrderLine } from "../modals/Transactions/sales/salesOrder";
import ChartOfAccountMaster from "../modals/masters/chartOfAccount/chartOfAccount";
import RegistationType from "../modals/masters/registrationType/registrationType";
import ServiceCategory from "../modals/masters/serviceCategory/serviceCatMaster";
import PanAvailibility from "../modals/masters/panAvailibility/panAvailibility";
import TransportationMode from "../modals/masters/transportMode/transportMode";
import SubsidiaryMaster from "../modals/masters/subsidiaries/subsdiaryMaster";
import ServiceType from "../modals/masters/serviceType/serviceTypeMaster";
import VendorDetails, { VendorAddressBook, VendorSubsidiary } from "../modals/masters/vendorDetails/vendorDetails";
import PaymentMethod from "../modals/masters/paymentMethod/paymentMethod";
import PaymentTerm from "../modals/masters/paymentTerms/paymentTerm";
import AccountTypeMaster from "../modals/platform/accountType/accountType";
import WorkCategory from "../modals/masters/workCategory/workCatMaster";
import CurrencyMaster from "../modals/masters/currency/currencyMaster";
import UserPermission from "../modals/userPermission/userPermission";
import ItemGroupMaster from "../modals/masters/itemGroup/itemGroup";
import { GRN, GRNLine } from "../modals/Transactions/purchase/GRN";
import HSNSACMaster from "../modals/masters/HSN-SAC/HSNSACMaster";
import ItemTypeMaster from "../modals/platform/itemType/itemType";
import CategoryMaster from "../modals/masters/category/category";
import MISTypeMaster from "../modals/masters/MisType/MistType";
import Warehouse from "../modals/masters/warehouse/warehouse";
import ItemMaster from "../modals/masters/items/itemMaster";
import UserSession from "../modals/userSession/userSession";
import Customer from "../modals/masters/customer/customer";
import InventoryCount from "../modals/inventory/inventory";
import Attachment from "../modals/attachments/attachment";
import Permission from "../modals/permission/permission";
import UOMMaster from "../modals/masters/UOM/UOMMaster";
import SystemLog from "../modals/systemLogs/systemLogs";
import Commodity from "../modals/commodity/commodity";
import StateCode from "../modals/masters/state/state";
import Godown from "../modals/masters/godown/godown";
import CityMaster from "../modals/masters/city/city";
import Stack from "../modals/masters/stack/stack";
import Company from "../modals/company/company";
import Token from "../modals/token/token";
import User from "../modals/user/user";
import VoucherTypeMaster from "../modals/finance/voucherType";
import JournalEntryHeader from "../modals/finance/journalEntryHeader";
import JournalEntryLine from "../modals/finance/journalEntryLine";
import GLBalance from "../modals/finance/glBalance";
import DebitNoteHeader from "../modals/finance/debitNoteHeader";
import DebitNoteLine from "../modals/finance/debitNoteLine";
import CreditNoteHeader from "../modals/finance/creditNoteHeader";
import CreditNoteLine from "../modals/finance/creditNoteLine";

// import EmployeeMaster from "../modals/masters/employee/employeeMaster";

async function syncdatabase() {
  // Core entities
  await User.sync();
  await UserSession.sync();
  await Token.sync();
  await Attachment.sync();
  await Company.sync();

  // Master data
  await CurrencyMaster.sync();
  await SubsidiaryMaster.sync();
  await Warehouse.sync();
  await Godown.sync();
  await Stack.sync();
  await StateCode.sync();
  await CityMaster.sync();
  await TransportationMode.sync();
  await UOMMaster.sync();
  await HSNSACMaster.sync();
  await ServiceCategory.sync();
  await ServiceType.sync();
  await RegistationType.sync();
  await PanAvailibility.sync();
  await PaymentMethod.sync();
  await PaymentTerm.sync();
  // await EmployeeMaster.sync();
  await MISTypeMaster.sync();
  await AccountTypeMaster.sync();
  await ItemTypeMaster.sync();
  await ChartOfAccountMaster.sync();
  await ItemGroupMaster.sync();
  await VendorDetails.sync();
  await VendorAddressBook.sync();
  await VendorSubsidiary.sync();
  await CategoryMaster.sync();
  await WorkCategory.sync();
  await ItemMaster.sync();
  await Customer.sync();
  await Permission.sync();
  await UserPermission.sync();
  await Commodity.sync();
  await InventoryCount.sync();
  await VoucherTypeMaster.sync();
  await JournalEntryHeader.sync();
  await JournalEntryLine.sync();
  await GLBalance.sync();
  await DebitNoteHeader.sync();
  await DebitNoteLine.sync();
  await CreditNoteHeader.sync();
  await CreditNoteLine.sync();

  // Purchase models
  await PurchaseOrder.sync();
  await PurchaseOrderLine.sync();

  await GRN.sync();
  await GRNLine.sync();

  await PurchaseInvoiceHeader.sync();
  await PurchaseInvoiceLine.sync();

  await PurchasePaymentHeader.sync();
  await PurchasePaymentLine.sync();

  await PurchaseReturnHeader.sync();
  await PurchaseReturnLine.sync();

  await PurchaseReturnFulfillmentHeader.sync();
  await PurchaseReturnFulfillmentLine.sync();

  await VendorCreditHeader.sync();
  await VendorCreditLine.sync();

  await QualityInspectionHeader.sync();
  await QualityInspectionLine.sync();

  // Sales models
  await SalesOrderHeader.sync();
  await SalesOrderLine.sync();
  await DeliveryChallanHeader.sync();
  await DeliveryChallanLine.sync();
  await SalesReturnHeader.sync();
  await SalesReturnLine.sync();

  //   //vwms models
  //   await StateCode.sync();
  //   await CityMaster.sync();
  //   await VendorDetails.sync();
  //   await SiteMaster.sync();
  //   await EmployeeMaster.sync();
  //   await ServiceCategory.sync();
  //   await MISTypeMaster.sync();
  //   await AccountTypeMaster.sync();
  //   await ChartOfAccountMaster.sync();
  //   await ServiceType.sync();
  //   await UOMMaster.sync();
  //   await HSNSACMaster.sync();
  //   await WorkCategory.sync();
  //   await ItemMaster.sync();
  //   await StoreMaster.sync();
  //   await MaterialStatus.sync();

  //   await TransportationMode.sync();
  //   await VendorServiceWorkOrder.sync();
  //   await DeliveryChallanHeader.sync();
  //   await DeliveryChallanLine.sync();
  //   await VendorIssueMaterialHeader.sync();
  //   await VendorIssueMaterialLine.sync();
  //   await VendorIssueMaterialConsumptionHeader.sync();
  //   await VendorIssueMaterialConsumptionLine.sync();
  //   await VendorBillHeader.sync();
  //   await VendorBillLine.sync();
  //   await InventoryCount.sync();

  //   await CsvUpload.sync();

  //   await ReturnMaterialHeader.sync();
  //   await ReturnMaterialLine.sync();
  await SystemLog.sync();
}

export default syncdatabase;