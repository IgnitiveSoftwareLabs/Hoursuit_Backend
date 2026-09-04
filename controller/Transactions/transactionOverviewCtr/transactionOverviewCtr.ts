import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import { CustomRequest } from "../../../typeRequest/customReq";
import { findCompanyForUser } from "../../../utils/findCompanyForUser";

import { PurchaseOrder } from "../../../modals/Transactions/purchase/purchaseOrder";
import { GRN } from "../../../modals/Transactions/purchase/GRN";
import PurchaseInvoiceHeader from "../../../modals/Transactions/purchase/purchaseInvoice/purchaseInvoiceHeader";
import PurchasePaymentHeader from "../../../modals/Transactions/purchase/purchasePayment/purchasePaymentHeader";
import { PurchaseReturnHeader } from "../../../modals/Transactions/purchase/purchaseReturn";
import VendorCreditHeader from "../../../modals/Transactions/purchase/vendorCredit/vendorCreditHeader";
import VendorRefundHeader from "../../../modals/Transactions/purchase/vendorRefund/vendorRefundHeader";
import { SalesOrderHeader } from "../../../modals/Transactions/sales/salesOrder";
import DeliveryChallanHeader from "../../../modals/Transactions/sales/deliveryChallan/deliveryChallanHeader";
import SalesReturnHeader from "../../../modals/Transactions/sales/salesReturn/salesReturnHeader";
import JournalEntryHeader from "../../../modals/finance/journalEntryHeader";

import VendorDetails from "../../../modals/masters/vendorDetails/vendorDetails";
import Customer from "../../../modals/masters/customer/customer";
import SubsidiaryMaster from "../../../modals/masters/subsidiaries/subsdiaryMaster";

export const TransactionOverviewController = {
  getTransactionSummary: asyncHandler(async (req: CustomRequest, res: Response) => {
    const company = await findCompanyForUser(req.user);
    const companyId = company?.id;

    if (!companyId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User authentication or company required");
    }

    const [poList, grnList, billList, paymentList, returnList, creditList, refundList, soList, dcList, srList, jeList] = await Promise.all([
      PurchaseOrder.findAll({ where: { CompanyId: companyId }, limit: 100 }).catch(() => []),
      GRN.findAll({ where: { CompanyId: companyId }, limit: 100 }).catch(() => []),
      PurchaseInvoiceHeader.findAll({ where: { companyId }, limit: 100 }).catch(() => []),
      PurchasePaymentHeader.findAll({ where: { companyId }, limit: 100 }).catch(() => []),
      PurchaseReturnHeader.findAll({ where: { companyId }, limit: 100 }).catch(() => []),
      VendorCreditHeader.findAll({ where: { companyId }, limit: 100 }).catch(() => []),
      VendorRefundHeader.findAll({ where: { companyId }, limit: 100 }).catch(() => []),
      SalesOrderHeader.findAll({ where: { companyId }, limit: 100 }).catch(() => []),
      DeliveryChallanHeader.findAll({ where: { companyId }, limit: 100 }).catch(() => []),
      SalesReturnHeader.findAll({ where: { companyId }, limit: 100 }).catch(() => []),
      JournalEntryHeader.findAll({ where: { CompanyId: companyId }, limit: 100 }).catch(() => [])
    ]);

    const totalBilledAmount = billList.reduce((acc, b) => acc + Number(b.totalAmount || 0), 0);
    const totalPaidAmount = paymentList.reduce((acc, p) => acc + Number(p.totalAmount || 0), 0);
    const unpaidBillAmount = billList.reduce((acc, b) => acc + Number(b.balanceAmount || 0), 0);
    const totalCreditsAmount = creditList.reduce((acc, c) => acc + Number(c.totalAmount || 0), 0);
    const totalRefundsAmount = refundList.reduce((acc, r) => acc + Number(r.refundAmount || 0), 0);
    const totalSOAmount = soList.reduce((acc, s) => acc + Number(s.totalAmount || 0), 0);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const monthlyTrends = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const label = monthNames[m] + " " + y.toString().slice(-2);

      const monthBills = billList.filter((b) => {
        const bd = new Date(b.invoiceDate || b.createdAt);
        return bd.getMonth() === m && bd.getFullYear() === y;
      });
      const pSum = monthBills.reduce((acc, b) => acc + Number(b.totalAmount || 0), 0);

      const monthSOs = soList.filter((s) => {
        const sd = new Date(s.orderDate || s.createdAt);
        return sd.getMonth() === m && sd.getFullYear() === y;
      });
      const sSum = monthSOs.reduce((acc, s) => acc + Number(s.totalAmount || 0), 0);

      monthlyTrends.push({
        month: label,
        purchaseAmount: Math.round(pSum),
        salesAmount: Math.round(sSum),
        count: monthBills.length + monthSOs.length
      });
    }

    res.status(StatusCodes.OK).json({
      status: true,
      message: "Summary fetched successfully",
      result: {
        kpis: {
          purchases: {
            totalPOs: poList.length,
            openPOs: poList.filter((p) => !["CLOSED", "COMPLETED"].includes(String(p.status).toUpperCase())).length,
            totalGRNs: grnList.length,
            totalBills: billList.length,
            totalBilledAmount,
            totalPaidAmount,
            unpaidBillAmount,
            totalReturns: returnList.length,
            totalCredits: creditList.length,
            totalCreditsAmount,
            totalRefunds: refundList.length,
            totalRefundsAmount,
          },
          sales: {
            totalSOs: soList.length,
            openSOs: soList.filter((s) => !["COMPLETED", "CANCELLED"].includes(String(s.status).toUpperCase())).length,
            totalSOAmount,
            totalChallans: dcList.length,
            totalSalesReturns: srList.length,
          },
          finance: {
            totalJournalEntries: jeList.length,
            totalDebitAmount: jeList.reduce((acc, j) => acc + Number(j.total_debit || 0), 0),
          }
        },
        monthlyTrends,
        recentActivities: []
      }
    });
  }),

  getTransactionList: asyncHandler(async (req: CustomRequest, res: Response) => {
    const company = await findCompanyForUser(req.user);
    const companyId = company?.id;

    if (!companyId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User authentication or company required");
    }

    const { type = "ALL", status, search = "", page = 1, limit = 20 } = req.query as any;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 20));

    let rows: any[] = [];

    if (type === "ALL" || type === "PO") {
      const pos = await PurchaseOrder.findAll({
        where: { CompanyId: companyId, ...(status ? { status } : {}) },
        include: [
          { model: VendorDetails, as: "vendor", attributes: ["id", "company_name"] },
          { model: SubsidiaryMaster, as: "subsidiary", attributes: ["id", "subsidiary_name"] }
        ],
        order: [["purchaseDate", "DESC"]],
        limit: 100
      }).catch(() => []);
      pos.forEach((po: any) => rows.push({
        id: "PO-" + po.id,
        rawId: po.id,
        transactionType: "Purchase Order",
        transactionTypeCode: "PO",
        docNumber: po.purchaseNo || "PO-#" + po.id,
        date: po.purchaseDate || po.createdAt,
        entityName: po.vendor?.company_name || "—",
        entityType: "Vendor",
        subsidiaryName: po.subsidiary?.subsidiary_name || "—",
        status: po.status || "OPEN",
        viewUrl: "/purchase-order?id=" + po.id + "&action=view"
      }));
    }

    if (type === "ALL" || type === "GRN") {
      const grns = await GRN.findAll({
        where: { CompanyId: companyId, ...(status ? { status } : {}) },
        include: [{ model: PurchaseOrder, as: "purchaseOrder", attributes: ["id", "purchaseNo"] }],
        order: [["grnDate", "DESC"]],
        limit: 100
      }).catch(() => []);
      grns.forEach((g: any) => rows.push({
        id: "GRN-" + g.id,
        rawId: g.id,
        transactionType: "Goods Receipt Note",
        transactionTypeCode: "GRN",
        docNumber: g.grnNo || "GRN-#" + g.id,
        date: g.grnDate || g.createdAt,
        entityName: g.purchaseOrder?.purchaseNo ? "PO: " + g.purchaseOrder.purchaseNo : "Warehouse Receipt",
        entityType: "Warehouse",
        subsidiaryName: "—",
        status: g.status || "RECEIVED",
        viewUrl: "/grn?id=" + g.id + "&action=view"
      }));
    }

    if (type === "ALL" || type === "BILL") {
      const bills = await PurchaseInvoiceHeader.findAll({
        where: { companyId, ...(status ? { status } : {}) },
        include: [{ model: VendorDetails, as: "vendor", attributes: ["id", "company_name"] }],
        order: [["invoiceDate", "DESC"]],
        limit: 100
      }).catch(() => []);
      bills.forEach((b: any) => rows.push({
        id: "BILL-" + b.id,
        rawId: b.id,
        transactionType: "Purchase Bill",
        transactionTypeCode: "BILL",
        docNumber: b.invoiceNumber || "BILL-#" + b.id,
        date: b.invoiceDate || b.createdAt,
        entityName: b.vendor?.company_name || "—",
        entityType: "Vendor",
        subsidiaryName: "—",
        amount: Number(b.totalAmount || 0),
        currency: b.currency || "INR",
        status: b.status || "POSTED",
        viewUrl: "/purchase-invoice?id=" + b.id + "&action=view"
      }));
    }

    if (type === "ALL" || type === "PAYMENT") {
      const payments = await PurchasePaymentHeader.findAll({
        where: { companyId, ...(status ? { status } : {}) },
        include: [{ model: VendorDetails, as: "vendor", attributes: ["id", "company_name"] }],
        order: [["paymentDate", "DESC"]],
        limit: 100
      }).catch(() => []);
      payments.forEach((p: any) => rows.push({
        id: "PAY-" + p.id,
        rawId: p.id,
        transactionType: "Purchase Payment",
        transactionTypeCode: "PAY",
        docNumber: p.paymentNumber || "PAY-#" + p.id,
        date: p.paymentDate || p.createdAt,
        entityName: p.vendor?.company_name || "—",
        entityType: "Vendor",
        subsidiaryName: "—",
        amount: Number(p.totalAmount || 0),
        currency: p.currency || "INR",
        status: p.status || "POSTED",
        viewUrl: "/purchase-payment?id=" + p.id + "&action=view"
      }));
    }

    if (type === "ALL" || type === "VENDOR_CREDIT") {
      const credits = await VendorCreditHeader.findAll({
        where: { companyId, ...(status ? { status } : {}) },
        include: [{ model: VendorDetails, as: "vendor", attributes: ["id", "company_name"] }],
        order: [["creditDate", "DESC"]],
        limit: 100
      }).catch(() => []);
      credits.forEach((c: any) => rows.push({
        id: "VC-" + c.id,
        rawId: c.id,
        transactionType: "Vendor Credit",
        transactionTypeCode: "VC",
        docNumber: c.creditNoteNumber || "VC-#" + c.id,
        date: c.creditDate || c.createdAt,
        entityName: c.vendor?.company_name || "—",
        entityType: "Vendor",
        subsidiaryName: "—",
        amount: Number(c.totalAmount || 0),
        currency: "INR",
        status: c.status || "OPEN",
        viewUrl: "/debit-note?id=" + c.id + "&action=view"
      }));
    }

    if (type === "ALL" || type === "VENDOR_REFUND") {
      const refunds = await VendorRefundHeader.findAll({
        where: { companyId, ...(status ? { status } : {}) },
        include: [{ model: VendorDetails, as: "vendor", attributes: ["id", "company_name"] }],
        order: [["refundDate", "DESC"]],
        limit: 100
      }).catch(() => []);
      refunds.forEach((r: any) => rows.push({
        id: "VR-" + r.id,
        rawId: r.id,
        transactionType: "Vendor Refund",
        transactionTypeCode: "VR",
        docNumber: r.refundNumber || "VR-#" + r.id,
        date: r.refundDate || r.createdAt,
        entityName: r.vendor?.company_name || "—",
        entityType: "Vendor",
        subsidiaryName: "—",
        amount: Number(r.refundAmount || 0),
        currency: r.currency || "INR",
        status: r.status || "COMPLETED",
        viewUrl: "/vendor-refund?id=" + r.id + "&action=view"
      }));
    }

    if (type === "ALL" || type === "SALES_ORDER") {
      const sos = await SalesOrderHeader.findAll({
        where: { companyId, ...(status ? { status } : {}) },
        include: [
          { model: Customer, as: "customer", attributes: ["id", "name"] },
          { model: SubsidiaryMaster, as: "subsidiary", attributes: ["id", "subsidiary_name"] }
        ],
        order: [["orderDate", "DESC"]],
        limit: 100
      }).catch(() => []);
      sos.forEach((so: any) => rows.push({
        id: "SO-" + so.id,
        rawId: so.id,
        transactionType: "Sales Order",
        transactionTypeCode: "SO",
        docNumber: so.orderNumber || "SO-#" + so.id,
        date: so.orderDate || so.createdAt,
        entityName: so.customer?.name || "—",
        entityType: "Customer",
        subsidiaryName: so.subsidiary?.subsidiary_name || "—",
        amount: Number(so.totalAmount || 0),
        status: so.status || "CONFIRMED",
        viewUrl: "/sales-order?id=" + so.id + "&action=view"
      }));
    }

    if (search && String(search).trim()) {
      const term = String(search).toLowerCase().trim();
      rows = rows.filter((r) => r.docNumber.toLowerCase().includes(term) || r.entityName.toLowerCase().includes(term) || r.transactionType.toLowerCase().includes(term));
    }

    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = rows.length;
    const startIndex = (pageNum - 1) * limitNum;

    res.status(StatusCodes.OK).json({
      status: true,
      message: "Transactions list fetched successfully",
      result: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        rows: rows.slice(startIndex, startIndex + limitNum)
      }
    });
  })
};

export default TransactionOverviewController;
