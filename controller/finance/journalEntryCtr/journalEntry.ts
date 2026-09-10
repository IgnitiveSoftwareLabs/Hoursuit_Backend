import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import JournalEntryHeader from "../../../modals/finance/journalEntryHeader";
import { postJournalEntryToGL } from "../../../utils/postJournalEntryToGL";
import JournalEntryLine from "../../../modals/finance/journalEntryLine";
import { findCompanyForUser } from "../../../utils/findCompanyForUser";
import { CustomRequest } from "../../../typeRequest/customReq";
import sequelize from "../../../dbconfig/dbconfig"; // Ensure your Sequelize instance is imported
import { PurchaseInvoiceHeader } from "../../../modals/Transactions/purchase/purchaseInvoice";
import { PurchasePaymentHeader } from "../../../modals/Transactions/purchase/purchasePayment";
import VendorCreditHeader from "../../../modals/Transactions/purchase/vendorCredit/vendorCreditHeader";
import PurchaseReturnFulfillmentHeader from "../../../modals/Transactions/purchase/purchaseReturn/purchaseReturnFulfillmentHeader";
import { GRN } from "../../../modals/Transactions/purchase/GRN";
import { normalizeGRNStatus } from "../../../utils/p2pStatus";
import { VendorDetails } from "../../../modals/masters/vendorDetails/vendorDetails";
import Customer from "../../../modals/masters/customer/customer";
import EmployeeMaster from "../../../modals/masters/Employee/employee";

// Helper function to safely compare floating-point currency numbers
const isBalanced = (debit: number, credit: number): boolean => {
  return Math.abs(debit - credit) < 0.001;
};

const JournalEntryController = {
  createJournalEntry: asyncHandler(async (req: CustomRequest, res: Response) => {
    const { entry_no, entry_date, source_id, source_name, voucher_type_id, reference_no, narration, vendor_id, customer_id, employee_id, status, lines } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not authenticated");
    }

    const company = await findCompanyForUser(req.user);
    if (!company) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized: Company not found for user");
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("At least one journal entry line is required");
    }

    const totalDebit = lines.reduce((sum: number, line: any) => sum + Number(line.debit_amount || 0), 0);
    const totalCredit = lines.reduce((sum: number, line: any) => sum + Number(line.credit_amount || 0), 0);

    if (!isBalanced(totalDebit, totalCredit)) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Debit and credit totals must match");
    }

    // Managed Sequelize Transaction
    const result = await sequelize.transaction(async (t) => {
      const entry = await JournalEntryHeader.create(
        {
          entry_no,
          entry_date,
          voucher_type_id,
          source_id,
          source_name,
          reference_no: reference_no ?? null,
          narration: narration ?? null,
          vendor_id: vendor_id ?? null,
          customer_id: customer_id ?? null,
          employee_id: employee_id ?? null,
          status: status || "DRAFT",
          total_debit: totalDebit,
          total_credit: totalCredit,
          CompanyId: company.id,
          user_id: userId,
          isActive: true,
        },
        { transaction: t }
      );

      const createdLines = await Promise.all(
        lines.map((line: any) =>
          JournalEntryLine.create(
            {
              journal_entry_id: entry.id,
              account_id: line.account_id,
              narration: line.narration ?? null,
              debit_amount: Number(line.debit_amount || 0),
              credit_amount: Number(line.credit_amount || 0),
              vendor_id: line.vendor_id ?? vendor_id ?? null,
              customer_id: line.customer_id ?? customer_id ?? null,
              employee_id: line.employee_id ?? employee_id ?? null,
              CompanyId: company.id,
              user_id: userId,
              isActive: true,
            },
            { transaction: t }
          )
        )
      );

      if (entry.status === "POSTED") {
        await postJournalEntryToGL(entry, createdLines, t);
      }

      return entry;
    });

    const populatedEntry = await JournalEntryHeader.findByPk(result.id, {
      include: [
        { association: "voucherType", attributes: ["id", "code", "name"] },
        { association: "vendor", attributes: ["id", "company_name", "first_name", "last_name", "salutation", "entity_id"] },
        { association: "customer", attributes: ["id", "name"] },
        { association: "employee", attributes: ["id", "designation"] },
        {
          association: "lines",
          include: [
            { association: "account", attributes: ["id", "account_number", "account_name"] },
            { association: "vendor", attributes: ["id", "company_name", "first_name", "last_name", "salutation", "entity_id"] },
            { association: "customer", attributes: ["id", "name"] },
            { association: "employee", attributes: ["id", "designation"] },
          ],
        },
      ],
    });

    res.status(StatusCodes.CREATED).json({
      message: "Journal entry created successfully",
      success: true,
      result: populatedEntry,
    });
  }),

  getJournalEntries: asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not authenticated");
    }

    const company = await findCompanyForUser(req.user);
    if (!company) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized: Company not found for user");
    }

    const entries = await JournalEntryHeader.findAll({
      where: { CompanyId: company.id },
      include: [
        { association: "voucherType", attributes: ["id", "code", "name"] },
        { association: "vendor", attributes: ["id", "company_name", "first_name", "last_name", "salutation", "entity_id"] },
        { association: "customer", attributes: ["id", "name"] },
        { association: "employee", attributes: ["id", "designation"] },
        {
          association: "lines",
          include: [
            { association: "account", attributes: ["id", "account_number", "account_name"] },
            { association: "vendor", attributes: ["id", "company_name", "first_name", "last_name", "salutation", "entity_id"] },
            { association: "customer", attributes: ["id", "name"] },
            { association: "employee", attributes: ["id", "designation"] },
          ],
        },
      ],
      order: [["entry_date", "DESC"], ["id", "DESC"]],
    });

    res.status(StatusCodes.OK).json({
      message: "Journal entries fetched successfully",
      success: true,
      result: entries,
    });
  }),

  getJournalEntryById: asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;
    const source = req.query.source as string;
    const userId = req.user?.id;

    if (!id || isNaN(Number(id))) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Valid source ID is required");
    }

    if (!source) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Source name is required");
    }

    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not authenticated");
    }

    const company = await findCompanyForUser(req.user);

    if (!company) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized: Company not found for user");
    }

    const normalizedKey = String(source || "").toLowerCase().replace(/[\s_]/g, "");

    let whereClause: any = {
      CompanyId: company.id,
    };

    if (normalizedKey === "vendorcredit" || normalizedKey === "debitnote") {
      whereClause = {
        CompanyId: company.id,
        source_id: Number(id),
        [Op.or]: [
          { source_name: { [Op.in]: ["VendorCredit", "VENDOR_CREDIT", "Vendor_Credit", "Vendor Credit"] } },
          { entry_no: { [Op.like]: "JE-VC-%" } },
        ],
      };
    } else if (normalizedKey === "purchasereturnfulfillment" || normalizedKey === "returnfulfillment") {
      const fulfillment = await PurchaseReturnFulfillmentHeader.findOne({
        where: { id: Number(id), companyId: company.id },
      });
      const fStatus = String(fulfillment?.status || "").toUpperCase();
      if (fulfillment && (fStatus === "PENDING_APPROVAL" || fStatus === "DRAFT")) {
        res.status(StatusCodes.OK).json({
          message: "No GL impact recorded for Purchase Return Fulfillment in Pending Approval or Draft status",
          success: true,
          result: null,
        });
        return;
      }
      whereClause = {
        CompanyId: company.id,
        source_id: Number(id),
        [Op.or]: [
          { source_name: { [Op.in]: ["PurchaseReturnFulfillment", "ReturnFulfillment", "PURCHASE_RETURN_FULFILLMENT"] } },
          { entry_no: { [Op.like]: "JE-PRF-%" } },
        ],
      };
    } else if (normalizedKey === "vendorrefund") {
      whereClause = {
        CompanyId: company.id,
        source_id: Number(id),
        [Op.or]: [
          { source_name: { [Op.in]: ["VendorRefund", "VENDOR_REFUND", "Vendor_Refund", "Vendor Refund"] } },
          { entry_no: { [Op.like]: "JE-VR-%" } },
        ],
      };
    } else if (normalizedKey === "grn") {
      const grn = await GRN.findOne({
        where: { id: Number(id), CompanyId: company.id },
      });
      const normStatus = grn ? normalizeGRNStatus(grn.status) : "";
      const rawStatus = grn ? String(grn.status || "").toUpperCase() : "";
      if (rawStatus === "PENDING_RECEIPT" || rawStatus === "DRAFT" || normStatus === "PENDING_RECEIPT" || normStatus === "DRAFT") {
        res.status(StatusCodes.OK).json({
          message: "No GL impact recorded for GRN in Pending Receipt or Draft status",
          success: true,
          result: null,
        });
        return;
      }
      whereClause = {
        CompanyId: company.id,
        source_id: Number(id),
        [Op.or]: [
          { source_name: { [Op.in]: ["GRN", "Grn", "grn"] } },
          { entry_no: { [Op.like]: "JE-GRN-%" } },
        ],
      };
    } else if (normalizedKey === "purchaseinvoice") {
      const invoice = await PurchaseInvoiceHeader.findOne({
        where: { id: Number(id), companyId: company.id },
      });
      if (invoice && String(invoice.status || "").toUpperCase() === "DRAFT") {
        res.status(StatusCodes.OK).json({
          message: "No GL impact recorded for Purchase Invoice in DRAFT status",
          success: true,
          result: null,
        });
        return;
      }
      whereClause = {
        CompanyId: company.id,
        source_id: Number(id),
        [Op.or]: [
          { source_name: { [Op.in]: ["PurchaseInvoice", "PURCHASE_INVOICE", "Purchase_Invoice", "Purchase Invoice"] } },
          { entry_no: { [Op.like]: "JE-INV-%" } },
        ],
      };
    } else if (normalizedKey === "purchasepayment") {
      const payment = await PurchasePaymentHeader.findOne({
        where: { id: Number(id), companyId: company.id },
      });
      if (payment && String(payment.status || "").toUpperCase() === "DRAFT") {
        res.status(StatusCodes.OK).json({
          message: "No GL impact recorded for Purchase Payment in DRAFT status",
          success: true,
          result: null,
        });
        return;
      }
      whereClause = {
        CompanyId: company.id,
        source_id: Number(id),
        [Op.or]: [
          { source_name: { [Op.in]: ["PurchasePayment", "PURCHASE_PAYMENT", "Purchase_Payment", "Purchase Payment"] } },
          { entry_no: { [Op.like]: "JE-PAY-%" } },
        ],
      };
    } else if (normalizedKey === "purchasereturn") {
      const fulfillments = await PurchaseReturnFulfillmentHeader.findAll({
        where: { purchaseReturnHeaderId: Number(id), companyId: company.id },
        attributes: ["id"],
      });
      const fIds = fulfillments.map((f: any) => f.id);

      const vendorCredits = await VendorCreditHeader.findAll({
        where: { purchaseReturnHeaderId: Number(id), companyId: company.id },
        attributes: ["id"],
      });
      const vcIds = vendorCredits.map((vc: any) => vc.id);

      const targetSourceIds = Array.from(new Set([Number(id), ...fIds, ...vcIds]));

      whereClause = {
        CompanyId: company.id,
        [Op.or]: [
          {
            source_id: { [Op.in]: targetSourceIds },
            source_name: { [Op.in]: ["PurchaseReturn", "PURCHASE_RETURN", "PurchaseReturnFulfillment", "VendorCredit"] },
          },
          {
            source_id: { [Op.in]: targetSourceIds },
            entry_no: { [Op.like]: "JE-PRF-%" },
          },
          {
            source_id: { [Op.in]: targetSourceIds },
            entry_no: { [Op.like]: "JE-VC-%" },
          },
        ],
      };
    } else {
      whereClause = {
        CompanyId: company.id,
        source_id: Number(id),
        source_name: source,
      };
    }

    const entries = await JournalEntryHeader.findAll({
      where: whereClause,
      include: [
        {
          association: "voucherType",
          attributes: ["id", "code", "name"],
        },
        {
          association: "vendor",
          attributes: ["id", "company_name", "first_name", "last_name", "salutation", "entity_id"],
        },
        {
          association: "customer",
          attributes: ["id", "name"],
        },
        {
          association: "employee",
          attributes: ["id", "designation"],
        },
        {
          association: "lines",
          include: [
            {
              association: "account",
              attributes: ["id", "account_number", "account_name"],
            },
            {
              association: "vendor",
              attributes: ["id", "company_name", "first_name", "last_name", "salutation", "entity_id"],
            },
            {
              association: "customer",
              attributes: ["id", "name"],
            },
            {
              association: "employee",
              attributes: ["id", "designation"],
            },
          ],
        },
      ],
      order: [["id", "ASC"]],
    });

    if (!entries || entries.length === 0) {
      res.status(StatusCodes.OK).json({
        message: "No GL postings recorded for this document yet.",
        success: true,
        result: null,
      });
      return;
    }

    // Combine lines by account and debit/credit side
    const groupLinesByAccount = (rawLines: any[], headerVendor?: any, headerCustomer?: any, headerEmployee?: any) => {
      const map = new Map<string, any>();
      for (const line of rawLines) {
        const isTaxLine = (line.narration || "").toLowerCase().includes("gst") || (line.narration || "").toLowerCase().includes("tax");
        const isFulfillmentDebit = (line.narration || "").toLowerCase().includes("fulfillment") || (line.narration || "").toLowerCase().includes("vendor return") || (line.narration || "").toLowerCase().includes("return clearing");
        const isFulfillmentCredit = (line.narration || "").toLowerCase().includes("fulfillment outward") || (line.narration || "").toLowerCase().includes("stock outward");

        const isDebit = Number(line.debit_amount || line.debit || 0) > 0;
        const isCredit = Number(line.credit_amount || line.credit || 0) > 0;
        const side = isDebit ? "DEBIT" : isCredit ? "CREDIT" : "ZERO";

        let accNum = line.account?.account_number || line.account_code || "—";
        let accName = line.account?.account_name || line.account_name || "—";
        
        if (isTaxLine && (accName.toLowerCase().includes("equity") || accName === "—" || accName.toLowerCase().includes("bank"))) {
          accNum = "1400";
          accName = "Input GST";
        } else if (isFulfillmentDebit && isDebit && (accName.toLowerCase().includes("bank") || accName.toLowerCase().includes("cash") || accName === "—")) {
          accNum = "5010";
          accName = "Vendor Return / Inventory Adjustment";
        } else if (isFulfillmentCredit && isCredit && (accName.toLowerCase().includes("inventory") || accName === "—")) {
          accNum = "1200";
          accName = "Inventory Asset";
        }

        const vObj = line.vendor || headerVendor;
        const cObj = line.customer || headerCustomer;
        const eObj = line.employee || headerEmployee;

        const vendorDisplayName = vObj
          ? (vObj.company_name || [vObj.salutation, vObj.first_name, vObj.last_name].filter(Boolean).join(" "))
          : "";
        const customerDisplayName = cObj?.name || "";
        const employeeDisplayName = eObj?.designation || "";
        const entityDisplayName = vendorDisplayName || customerDisplayName || employeeDisplayName || "";

        const key = `${accName}_${side}`;

        if (map.has(key)) {
          const existing = map.get(key);
          existing.debit_amount = Number((Number(existing.debit_amount || 0) + Number(line.debit_amount || line.debit || 0)).toFixed(2));
          existing.credit_amount = Number((Number(existing.credit_amount || 0) + Number(line.credit_amount || line.credit || 0)).toFixed(2));
          if (!existing.vendor_name && vendorDisplayName) {
            existing.vendor_name = vendorDisplayName;
          }
          if (!existing.entity_name && entityDisplayName) {
            existing.entity_name = entityDisplayName;
          }
          if (line.narration && !existing.narration.includes(line.narration)) {
            existing.narration = `${existing.narration}; ${line.narration}`;
          }
        } else {
          map.set(key, {
            id: line.id,
            account_id: line.account_id,
            account_number: accNum,
            account_name: accName,
            vendor_id: line.vendor_id || vObj?.id || null,
            customer_id: line.customer_id || cObj?.id || null,
            employee_id: line.employee_id || eObj?.id || null,
            vendor_name: vendorDisplayName || null,
            entity_name: entityDisplayName || null,
            debit_amount: Number(Number(line.debit_amount || line.debit || 0).toFixed(2)),
            credit_amount: Number(Number(line.credit_amount || line.credit || 0).toFixed(2)),
            narration: line.narration || line.memo || "GL Impact Entry",
            account: line.account || { id: line.account_id, account_number: accNum, account_name: accName },
            vendor: vObj || undefined,
            customer: cObj || undefined,
            employee: eObj || undefined,
          });
        }
      }
      return Array.from(map.values());
    };

    if (entries.length === 1) {
      const entryObj: any = typeof (entries[0] as any).toJSON === "function" ? (entries[0] as any).toJSON() : { ...(entries[0] as any) };
      entryObj.lines = groupLinesByAccount(entryObj.lines || [], entryObj.vendor, entryObj.customer, entryObj.employee);
      res.status(StatusCodes.OK).json({
        message: "Journal entry fetched successfully",
        success: true,
        result: entryObj,
      });
      return;
    }

    const firstEntry = entries[0] as any;
    const combinedLines = groupLinesByAccount(
      entries.flatMap((e: any) => e.lines || []),
      firstEntry.vendor,
      firstEntry.customer,
      firstEntry.employee
    );
    const totalDebit = Number(combinedLines.reduce((s: number, l: any) => s + Number(l.debit_amount || 0), 0).toFixed(2));
    const totalCredit = Number(combinedLines.reduce((s: number, l: any) => s + Number(l.credit_amount || 0), 0).toFixed(2));

    const combinedEntry = {
      id: entries[0].id,
      entry_no: entries.map((e: any) => e.entry_no).join(" / "),
      entry_date: entries[0].entry_date,
      source_name: entries[0].source_name,
      source_id: entries[0].source_id,
      vendor_id: firstEntry.vendor_id || null,
      customer_id: firstEntry.customer_id || null,
      employee_id: firstEntry.employee_id || null,
      vendor: firstEntry.vendor,
      customer: firstEntry.customer,
      employee: firstEntry.employee,
      reference_no: entries.map((e: any) => e.reference_no).filter(Boolean).join(", "),
      narration: entries.map((e: any) => e.narration).filter(Boolean).join(" | "),
      status: "POSTED",
      total_debit: totalDebit,
      total_credit: totalCredit,
      lines: combinedLines,
      voucherType: (entries[0] as any).voucherType,
    };

    res.status(StatusCodes.OK).json({
      message: "Journal entry fetched successfully",
      success: true,
      result: combinedEntry,
    });
  }),

  updateJournalEntry: asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;
    const {
      entry_no,
      entry_date,
      source_id,
      voucher_type_id,
      vendor_id,
      customer_id,
      employee_id,
      reference_no,
      narration,
      status,
      lines,
    } = req.body;
    const userId = req.user?.id;

    if (!id || isNaN(Number(id))) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Valid journal entry ID is required");
    }
    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not authenticated");
    }

    const company = await findCompanyForUser(req.user);
    if (!company) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized: Company not found for user");
    }

    const entry = await JournalEntryHeader.findOne({
      where: { id: Number(id), CompanyId: company.id },
    });

    if (!entry) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Journal entry not found");
    }

    if (entry.status === "POSTED") {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Posted entries cannot be updated");
    }

    await sequelize.transaction(async (t) => {
      if (Array.isArray(lines)) {
        const totalDebit = lines.reduce((sum: number, line: any) => sum + Number(line.debit_amount || 0), 0);
        const totalCredit = lines.reduce((sum: number, line: any) => sum + Number(line.credit_amount || 0), 0);

        if (!isBalanced(totalDebit, totalCredit)) {
          res.status(StatusCodes.BAD_REQUEST);
          throw new Error("Debit and credit totals must match");
        }

        await JournalEntryLine.destroy({ where: { journal_entry_id: entry.id }, transaction: t });

        await Promise.all(
          lines.map((line: any) =>
            JournalEntryLine.create(
              {
                journal_entry_id: entry.id,
                account_id: line.account_id,
                vendor_id: line.vendor_id ?? vendor_id ?? null,
                customer_id: line.customer_id ?? customer_id ?? null,
                employee_id: line.employee_id ?? employee_id ?? null,
                narration: line.narration ?? null,
                debit_amount: Number(line.debit_amount || 0),
                credit_amount: Number(line.credit_amount || 0),
                CompanyId: company.id,
                user_id: userId,
                isActive: true,
              },
              { transaction: t }
            )
          )
        );

        entry.total_debit = totalDebit;
        entry.total_credit = totalCredit;
      }

      entry.entry_no = entry_no ?? entry.entry_no;
      entry.entry_date = entry_date ?? entry.entry_date;
      entry.source_id = source_id ?? entry.source_id;
      entry.voucher_type_id = voucher_type_id ?? entry.voucher_type_id;
      entry.vendor_id = vendor_id ?? entry.vendor_id;
      entry.customer_id = customer_id ?? entry.customer_id;
      entry.employee_id = employee_id ?? entry.employee_id;
      entry.reference_no = reference_no ?? entry.reference_no;
      entry.narration = narration ?? entry.narration;
      entry.status = status ?? entry.status;
      entry.user_id = userId;

      await entry.save({ transaction: t });
    });

    const result = await JournalEntryHeader.findByPk(entry.id, {
      include: [
        { association: "voucherType", attributes: ["id", "code", "name"] },
        { association: "vendor", attributes: ["id", "company_name", "first_name", "last_name", "salutation", "entity_id"] },
        { association: "customer", attributes: ["id", "name"] },
        { association: "employee", attributes: ["id", "designation"] },
        {
          association: "lines",
          include: [
            { association: "account", attributes: ["id", "account_number", "account_name"] },
            { association: "vendor", attributes: ["id", "company_name", "first_name", "last_name", "salutation", "entity_id"] },
            { association: "customer", attributes: ["id", "name"] },
            { association: "employee", attributes: ["id", "designation"] },
          ],
        },
      ],
    });

    res.status(StatusCodes.OK).json({
      message: "Journal entry updated successfully",
      success: true,
      result,
    });
  }),

  postJournalEntry: asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!id || isNaN(Number(id))) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Valid journal entry ID is required");
    }
    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not authenticated");
    }

    const company = await findCompanyForUser(req.user);
    if (!company) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized: Company not found for user");
    }

    const entry = await JournalEntryHeader.findOne({
      where: { id: Number(id), CompanyId: company.id },
    });

    if (!entry) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Journal entry not found");
    }

    // Prevents double posting
    if (entry.status === "POSTED") {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("This journal entry has already been posted");
    }

    const lines = await JournalEntryLine.findAll({ where: { journal_entry_id: entry.id } });

    const postedEntry = await sequelize.transaction(async (t) => {
      entry.status = "POSTED";
      await entry.save({ transaction: t });
      const result = await postJournalEntryToGL(entry, lines, t);

      // Invoice Payment Reconciliation: Check if reference_no matches a Purchase Invoice Number
      if (entry.reference_no) {
        const matchingInvoice = await PurchaseInvoiceHeader.findOne({
          where: { invoiceNumber: entry.reference_no.trim(), companyId: company.id },
          transaction: t,
        });

        if (matchingInvoice) {
          const paymentAmount = Number(entry.total_debit || 0);
          const newPaidAmount = Number(matchingInvoice.paidAmount || 0) + paymentAmount;
          const newBalance = Number((matchingInvoice.totalAmount - newPaidAmount).toFixed(2));
          const newStatus = newBalance <= 0.01 ? "PAID" : "PARTIAL_PAID";

          await matchingInvoice.update(
            {
              paidAmount: newPaidAmount,
              balanceAmount: Math.max(0, newBalance),
              status: newStatus,
            },
            { transaction: t }
          );
        }
      }

      return result;
    });

    res.status(StatusCodes.OK).json({
      message: "Journal entry posted successfully",
      success: true,
      result: postedEntry,
    });
  }),

  deleteJournalEntry: asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!id || isNaN(Number(id))) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Valid journal entry ID is required");
    }
    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not authenticated");
    }

    const company = await findCompanyForUser(req.user);
    if (!company) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized: Company not found for user");
    }

    const entry = await JournalEntryHeader.findOne({
      where: { id: Number(id), CompanyId: company.id },
    });

    if (!entry) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Journal entry not found");
    }

    if (entry.status === "POSTED") {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Posted entries cannot be deleted");
    }

    await sequelize.transaction(async (t) => {
      await JournalEntryLine.destroy({ where: { journal_entry_id: entry.id }, transaction: t });
      await entry.destroy({ transaction: t });
    });

    res.status(StatusCodes.OK).json({
      message: "Journal entry deleted successfully",
      success: true,
      result: null,
    });
  }),
};

export default JournalEntryController;