import { Op, Transaction } from "sequelize";
import { AccountingService, GLLineInput } from "./accounting";
import { resolveAccountName } from "./resolveAccounts";

import { PurchaseInvoiceHeader, PurchaseInvoiceLine } from "../modals/Transactions/purchase/purchaseInvoice";
import { PurchasePaymentHeader, PurchasePaymentLine } from "../modals/Transactions/purchase/purchasePayment";
import { PurchaseReturnHeader, PurchaseReturnLine } from "../modals/Transactions/purchase/purchaseReturn";
import PurchaseReturnFulfillmentHeader from "../modals/Transactions/purchase/purchaseReturn/purchaseReturnFulfillmentHeader";
import PurchaseReturnFulfillmentLine from "../modals/Transactions/purchase/purchaseReturn/purchaseReturnFulfillmentLine";
import VendorCreditHeader from "../modals/Transactions/purchase/vendorCredit/vendorCreditHeader";
import VendorCreditLine from "../modals/Transactions/purchase/vendorCredit/vendorCreditLine";
import PurchaseOrderLine from "../modals/Transactions/purchase/purchaseOrder/purchaseOrderLine";
import GRNLine from "../modals/Transactions/purchase/GRN/GRNLine";
import GRN from "../modals/Transactions/purchase/GRN/GRNHeader";
import ItemMaster from "../modals/masters/items/itemMaster";
import ChartOfAccountMaster from "../modals/masters/chartOfAccount/chartOfAccount";

/**
 * Helper function to dynamically resolve Inventory Asset Account
 */
const resolveInventoryAssetAccount = async (
  companyId: number,
  item: ItemMaster,
  transaction?: Transaction
): Promise<number> => {
  // If item has asset_account_id explicitly defined, return it
  if (item.asset_account_id) return item.asset_account_id;

  // Search ChartOfAccountMaster for Inventory / Stock Asset Account
  const namedAssetAccount = await ChartOfAccountMaster.findOne({
    where: {
      CompanyId: companyId,
      isActive: true,
      [Op.or]: [
        { account_name: { [Op.like]: "%Inventory%" } },
        { account_name: { [Op.like]: "%Stock%" } },
        { account_name: { [Op.like]: "%Asset%" } },
      ],
    },
    transaction,
  });

  if (namedAssetAccount) return namedAssetAccount.id;

  const typeAssetAccount = await ChartOfAccountMaster.findOne({
    where: { CompanyId: companyId, isActive: true },
    include: [
      {
        association: "accountType",
        where: {
          [Op.or]: [
            { account_type_name: { [Op.like]: "%Inventory%" } },
            { account_type_name: { [Op.like]: "%Stock%" } },
            { account_type_name: { [Op.like]: "%Asset%" } },
          ],
        },
      },
    ],
    transaction,
  });

  if (typeAssetAccount) return typeAssetAccount.id;

  // Fallback to item.expense_account_id or item.cogs_account_id
  const fallbackId = item.expense_account_id || item.cogs_account_id;
  if (fallbackId) return fallbackId;

  const fallback = await ChartOfAccountMaster.findOne({
    where: { CompanyId: companyId, isActive: true },
    transaction,
  });

  if (!fallback) {
    throw new Error(`No Inventory Asset or Expense account found for Item "${item.item_name}".`);
  }

  return fallback.id;
};

/**
 * Helper function to dynamically resolve GRNI / Accrued Purchases Liability Account
 */
const resolveGRNIAccount = async (
  companyId: number,
  explicitId?: number,
  transaction?: Transaction
): Promise<number> => {
  if (explicitId) return explicitId;

  // 1. Search by account_name (highest priority for GRNI / Accrued Purchase)
  const namedAccount = await ChartOfAccountMaster.findOne({
    where: {
      CompanyId: companyId,
      isActive: true,
      [Op.or]: [
        { account_name: { [Op.like]: "%Accrued Purchase%" } },
        { account_name: { [Op.like]: "%GRNI%" } },
        { account_name: { [Op.like]: "%Unbilled%" } },
        { account_name: { [Op.like]: "%Goods Received%" } },
        { account_name: { [Op.like]: "%Accrued Liability%" } },
      ],
    },
    transaction,
  });

  if (namedAccount) return namedAccount.id;

  // 2. Search by accountType (strictly Accrued/GRNI/Unbilled, NEVER Payable)
  const grniAccount = await ChartOfAccountMaster.findOne({
    where: { CompanyId: companyId, isActive: true },
    include: [
      {
        association: "accountType",
        where: {
          [Op.or]: [
            { account_type_name: { [Op.like]: "%Accrued%" } },
            { account_type_name: { [Op.like]: "%GRNI%" } },
            { account_type_name: { [Op.like]: "%Unbilled%" } },
          ],
        },
      },
    ],
    order: [["id", "ASC"]],
    transaction,
  });

  if (grniAccount) return grniAccount.id;

  // 3. Fallback to any liability account excluding Payable
  const liabilityAccount = await ChartOfAccountMaster.findOne({
    where: {
      CompanyId: companyId,
      isActive: true,
      account_name: { [Op.notLike]: "%Payable%" },
    },
    include: [
      {
        association: "accountType",
        where: {
          account_type_name: { [Op.like]: "%Liability%" },
        },
      },
    ],
    transaction,
  });

  if (liabilityAccount) return liabilityAccount.id;

  const fallback = await ChartOfAccountMaster.findOne({
    where: { CompanyId: companyId, isActive: true },
    transaction,
  });

  if (!fallback) {
    throw new Error(`No Chart of Accounts found for company ID ${companyId} to resolve GRNI Account.`);
  }

  return fallback.id;
};

/**
 * Helper function to dynamically resolve Accounts Payable (AP) Liability Account
 */
const resolveAPAccount = async (
  companyId: number,
  explicitId?: number,
  transaction?: Transaction
): Promise<number> => {
  if (explicitId) return explicitId;

  const apAccount = await ChartOfAccountMaster.findOne({
    where: { CompanyId: companyId, isActive: true },
    include: [
      {
        association: "accountType",
        where: {
          [Op.or]: [
            { account_type_name: { [Op.like]: "%Payable%" } },
            { account_type_name: { [Op.like]: "%Vendor%" } },
            { account_type_name: { [Op.like]: "%Creditor%" } },
            { account_type_name: { [Op.like]: "%Liability%" } },
          ],
        },
      },
    ],
    order: [["id", "ASC"]],
    transaction,
  });

  if (apAccount) return apAccount.id;

  const namedAccount = await ChartOfAccountMaster.findOne({
    where: {
      CompanyId: companyId,
      isActive: true,
      [Op.or]: [
        { account_name: { [Op.like]: "%Payable%" } },
        { account_name: { [Op.like]: "%Vendor%" } },
        { account_name: { [Op.like]: "%Creditor%" } },
      ],
    },
    transaction,
  });

  if (namedAccount) return namedAccount.id;

  const fallback = await ChartOfAccountMaster.findOne({
    where: { CompanyId: companyId, isActive: true },
    transaction,
  });

  if (!fallback) {
    throw new Error(`No Chart of Accounts found for company ID ${companyId} to resolve Accounts Payable Account.`);
  }

  return fallback.id;
};

/**
 * Helper function to dynamically resolve Purchase Return Clearing Account
 */
const resolvePurchaseReturnClearingAccount = async (
  companyId: number,
  explicitId?: number,
  transaction?: Transaction
): Promise<number> => {
  if (explicitId) return explicitId;

  const namedAccount = await ChartOfAccountMaster.findOne({
    where: {
      CompanyId: companyId,
      isActive: true,
      [Op.or]: [
        { account_name: { [Op.like]: "%Purchase Return Clearing%" } },
        { account_name: { [Op.like]: "%Vendor Return Clearing%" } },
        { account_name: { [Op.like]: "%Return Clearing%" } },
        { account_name: { [Op.like]: "%Purchase Return%" } },
      ],
    },
    transaction,
  });

  if (namedAccount) return namedAccount.id;

  const typeAccount = await ChartOfAccountMaster.findOne({
    where: { CompanyId: companyId, isActive: true },
    include: [
      {
        association: "accountType",
        where: {
          [Op.or]: [
            { account_type_name: { [Op.like]: "%Clearing%" } },
            { account_type_name: { [Op.like]: "%Accrued%" } },
            { account_type_name: { [Op.like]: "%Asset%" } },
          ],
        },
      },
    ],
    transaction,
  });

  if (typeAccount) return typeAccount.id;

  const fallback = await ChartOfAccountMaster.findOne({
    where: { CompanyId: companyId, isActive: true },
    transaction,
  });

  if (fallback) return fallback.id;

  throw new Error(`No Chart of Accounts found for company ID ${companyId} to resolve Purchase Return Clearing Account.`);
};

const resolveFreightExpenseAccount = async (
  companyId: number,
  transaction?: Transaction
): Promise<number> => {
  const namedAccount = await ChartOfAccountMaster.findOne({
    where: {
      CompanyId: companyId,
      isActive: true,
      [Op.or]: [
        { account_name: { [Op.like]: "%Freight%" } },
        { account_name: { [Op.like]: "%Shipping%" } },
        { account_name: { [Op.like]: "%Delivery%" } },
        { account_name: { [Op.like]: "%Carriage%" } },
        { account_name: { [Op.like]: "%Transportation%" } }
      ]
    },
    transaction
  });

  if (namedAccount) return namedAccount.id;

  const expenseAccount = await ChartOfAccountMaster.findOne({
    where: { CompanyId: companyId, isActive: true },
    include: [
      {
        association: "accountType",
        where: { account_type_name: { [Op.like]: "%Expense%" } }
      }
    ],
    transaction
  });

  if (expenseAccount) return expenseAccount.id;

  const fallback = await ChartOfAccountMaster.findOne({
    where: { CompanyId: companyId, isActive: true },
    transaction
  });

  if (fallback) return fallback.id;
  throw new Error(`No Expense account found for company ID ${companyId} to resolve Freight Account.`);
};

const resolveOtherChargesExpenseAccount = async (
  companyId: number,
  transaction?: Transaction
): Promise<number> => {
  const namedAccount = await ChartOfAccountMaster.findOne({
    where: {
      CompanyId: companyId,
      isActive: true,
      [Op.or]: [
        { account_name: { [Op.like]: "%Other Charge%" } },
        { account_name: { [Op.like]: "%Ancillary%" } },
        { account_name: { [Op.like]: "%Misc%" } },
        { account_name: { [Op.like]: "%Charge%" } },
        { account_name: { [Op.like]: "%Expense%" } }
      ]
    },
    transaction
  });

  if (namedAccount) return namedAccount.id;

  const expenseAccount = await ChartOfAccountMaster.findOne({
    where: { CompanyId: companyId, isActive: true },
    include: [
      {
        association: "accountType",
        where: { account_type_name: { [Op.like]: "%Expense%" } }
      }
    ],
    transaction
  });

  if (expenseAccount) return expenseAccount.id;

  const fallback = await ChartOfAccountMaster.findOne({
    where: { CompanyId: companyId, isActive: true },
    transaction
  });

  if (fallback) return fallback.id;
  throw new Error(`No Expense account found for company ID ${companyId} to resolve Other Charges Account.`);
};

export const GLImpactService = {
  /**
   * Calculates Debit/Credit impact for GRN (Goods Receipt Note)
   *
   * NetSuite Accounting Rules:
   *   DEBIT  : Inventory Asset Account (item.asset_account_id or COA Inventory/Stock Asset)
   *   CREDIT : GRNI / Accrued Purchase Liability Account (grniAccountId or dynamic COA lookup)
   */
  calculateGRNImpact: async (
    source_name: string,
    grnId: number,
    companyId: number,
    grniAccountId?: number,
    transaction?: Transaction
  ): Promise<GLLineInput[]> => {
    const grn = await GRN.findOne({
      where: { id: grnId, CompanyId: companyId },
      include: [
        {
          model: GRNLine,
          as: "lineItems",
          include: [
            { model: ItemMaster, as: "item" },
            { model: PurchaseOrderLine, as: "purchaseOrderLine" }
          ]
        }
      ],
      transaction
    });

    if (!grn) throw new Error(`GRN record #${grnId} not found`);

    const lines: GLLineInput[] = [];
    let totalGRNValue = 0;
    const grnLines = ((grn as any).lineItems || []) as any[];

    for (const lineItem of grnLines) {
      const rate = Number(lineItem.purchaseOrderLine?.rate || 0);
      const qty = Number(lineItem.acceptedQty > 0 ? lineItem.acceptedQty : lineItem.receivedQty);
      const amount = Number((qty * rate).toFixed(2));

      if (amount <= 0) continue;
      totalGRNValue += amount;

      const item = lineItem.item as ItemMaster | undefined;

      if (!item) {
        throw new Error(`Item Master record missing for GRN Line #${lineItem.id}`);
      }

      // Debit account dynamically resolved: Inventory Asset Account
      const debitAccountId = await resolveInventoryAssetAccount(companyId, item, transaction);
      const accountName = await resolveAccountName(debitAccountId, transaction);

      lines.push({
        account_id: debitAccountId,
        debit_amount: amount,
        credit_amount: 0,
        narration: `GRN Inward: ${item.item_name} [A/C: ${accountName}] (Qty: ${qty} @ ₹${rate})`
      });
    }

    // CREDIT: GRNI / Accrued Purchases Liability Account
    totalGRNValue = Number(totalGRNValue.toFixed(2));
    if (totalGRNValue > 0) {
      const creditAccountId = await resolveGRNIAccount(companyId, grniAccountId, transaction);
      const grniAccountName = await resolveAccountName(creditAccountId, transaction);

      lines.push({
        account_id: creditAccountId,
        debit_amount: 0,
        credit_amount: totalGRNValue,
        narration: `GRNI Accrual: GRN #${(grn as any).grnNo || grn.id} [A/C: ${grniAccountName}]`
      });
    }

    return lines;
  },

  /**
   * Posts the calculated GRN impact into GL via AccountingService
   */
  processGRNPosting: async (
    source_name: string,
    grnId: number,
    companyId: number,
    userId: number,
    voucherTypeId?: number,
    grniAccountId?: number,
    transaction?: Transaction
  ) => {
    const grn = await GRN.findByPk(grnId, { transaction });
    if (!grn) throw new Error(`GRN record #${grnId} not found`);

    const lines = await GLImpactService.calculateGRNImpact(
      source_name,
      grnId,
      companyId,
      grniAccountId,
      transaction
    );

    if (lines.length === 0) return null;

    const grnNo = (grn as any).grnNo || `GRN-${grn.id}`;
    const grnDate = (grn as any).grnDate ? new Date((grn as any).grnDate) : new Date();

    return await AccountingService.createAndPostJournalEntry(
      {
        companyId,
        userId,
        entryNo: `JE-${grnNo}`,
        voucherTypeId,
        sourceName: source_name,
        sourceId: grnId,
        referenceNo: grnNo,
        narration: `GL Impact posting for GRN #${grnNo}`,
        entryDate: grnDate,
        lines
      },
      transaction
    );
  },

  /**
   * Calculates Debit/Credit impact for Purchase Invoice (Vendor Bill)
   *
   * NetSuite Accounting Rules:
   *   When linked to GRN (Goods Received Previously):
   *     DEBIT  : GRNI / Accrued Purchase Liability Account (clears GRNI liability created at GRN)
   *     DEBIT  : Input Tax Account (GST / Duties & Taxes)
   *     CREDIT : Accounts Payable Liability Account
   *   When direct bill (No GRN):
   *     DEBIT  : Item Asset Account OR Expense Account
   *     DEBIT  : Input Tax Account
   *     CREDIT : Accounts Payable Liability Account
   */
  calculatePurchaseInvoiceImpact: async (
    invoiceId: number,
    companyId: number,
    grniAccountId?: number,
    apAccountId?: number,
    taxAccountId?: number,
    transaction?: Transaction
  ): Promise<GLLineInput[]> => {
    const invoice = await PurchaseInvoiceHeader.findOne({
      where: { id: invoiceId, companyId },
      include: [
        {
          model: PurchaseInvoiceLine,
          as: "purchaseInvoiceLines",
          include: [{ model: ItemMaster, as: "item" }]
        }
      ],
      transaction
    });

    if (!invoice) throw new Error(`Purchase Invoice #${invoiceId} not found`);

    if (String(invoice.status || "").toUpperCase() === "DRAFT") {
      return [];
    }

    const lines: GLLineInput[] = [];
    const invLines = ((invoice as any).purchaseInvoiceLines || []) as any[];

    let totalLineTax = 0;
    const isGRNLinked = Boolean((invoice as any).grnHeaderId || invLines.some((l: any) => l.grnLineId));
    const resolvedGRNIAccountId = await resolveGRNIAccount(companyId, grniAccountId, transaction);

    for (const invLine of invLines) {
      const qty = Number(invLine.quantity || 0);
      const unitPrice = Number(invLine.unitPrice || 0);
      const discount = Number(invLine.discountAmount || 0);
      const taxableLineAmount = Number((qty * unitPrice - discount).toFixed(2));
      const lineTax = Number(invLine.taxAmount || 0);

      totalLineTax += lineTax;

      const item = invLine.item as ItemMaster | undefined;

      if (!item) {
        throw new Error(`Item Master record missing for Invoice Line #${invLine.id}`);
      }

      let debitAccountId: number | undefined;

      if (isGRNLinked) {
        // Linked to GRN — Debit GRNI Account (clearing receiving accrual liability)
        debitAccountId = resolvedGRNIAccountId;
      } else if (item.track_inventory) {
        debitAccountId = (item.asset_account_id || item.expense_account_id) || resolvedGRNIAccountId;
      } else {
        debitAccountId = (item.expense_account_id || item.asset_account_id) || resolvedGRNIAccountId;
      }

      if (!debitAccountId) {
        throw new Error(
          `Item "${item.item_name}" (Code: ${item.item_code || item.id}) has no Asset or Expense Account configured in Item Master.`
        );
      }

      const debitAccountName = await resolveAccountName(debitAccountId, transaction);

      if (taxableLineAmount > 0) {
        lines.push({
          account_id: debitAccountId,
          debit_amount: taxableLineAmount,
          credit_amount: 0,
          narration: `Purchase Invoice (${isGRNLinked ? "GRNI Clearing" : "Direct"}): ${item.item_name} [A/C: ${debitAccountName}] (Qty: ${qty})`
        });
      }
    }

    // DEBIT: Input Tax Account
    const finalTaxAmount = Number((totalLineTax > 0 ? totalLineTax : Number((invoice as any).taxAmount || 0)).toFixed(2));
    if (finalTaxAmount > 0) {
      let resolvedTaxAccountId = taxAccountId;

      if (!resolvedTaxAccountId) {
        const taxAccount = await ChartOfAccountMaster.findOne({
          where: { CompanyId: companyId, isActive: true },
          include: [
            {
              association: "accountType",
              where: {
                [Op.or]: [
                  { account_type_name: { [Op.like]: "%Tax%" } },
                  { account_type_name: { [Op.like]: "%Duty%" } },
                  { account_type_name: { [Op.like]: "%Duties%" } },
                  { account_type_name: { [Op.like]: "%GST%" } },
                ],
              },
            },
          ],
          transaction,
        });

        if (taxAccount) {
          resolvedTaxAccountId = taxAccount.id;
        } else {
          const firstLineItem = invLines[0]?.item as ItemMaster | undefined;
          resolvedTaxAccountId = firstLineItem?.expense_account_id || firstLineItem?.asset_account_id || undefined;
        }
      }

      if (!resolvedTaxAccountId) {
        throw new Error(
          `Tax Amount exists on Invoice #${invoice.invoiceNumber}, but no Input Tax Account ID was provided or could be resolved.`
        );
      }

      const taxAccountName = await resolveAccountName(resolvedTaxAccountId, transaction);

      lines.push({
        account_id: resolvedTaxAccountId,
        debit_amount: finalTaxAmount,
        credit_amount: 0,
        narration: `Input Tax (GST): Invoice #${invoice.invoiceNumber} [A/C: ${taxAccountName}]`
      });
    }

    // DEBIT: Freight Amount (if any)
    const freightAmount = Number((invoice as any).freightAmount || 0);
    if (freightAmount > 0) {
      const freightAccountId = await resolveFreightExpenseAccount(companyId, transaction);
      const freightAccountName = await resolveAccountName(freightAccountId, transaction);
      lines.push({
        account_id: freightAccountId,
        debit_amount: freightAmount,
        credit_amount: 0,
        narration: `Freight / Shipping: Invoice #${invoice.invoiceNumber} [A/C: ${freightAccountName}]`
      });
    }

    // DEBIT: Other Charges (if any)
    const otherCharges = Number((invoice as any).otherCharges || 0);
    if (otherCharges > 0) {
      const otherChargesAccountId = await resolveOtherChargesExpenseAccount(companyId, transaction);
      const otherChargesAccountName = await resolveAccountName(otherChargesAccountId, transaction);
      lines.push({
        account_id: otherChargesAccountId,
        debit_amount: otherCharges,
        credit_amount: 0,
        narration: `Other Charges: Invoice #${invoice.invoiceNumber} [A/C: ${otherChargesAccountName}]`
      });
    }

    // Calculate sum of debits generated so far
    const totalDebitSum = Number(
      lines.reduce((sum, l) => sum + Number(l.debit_amount || 0), 0).toFixed(2)
    );

    const headerTotalAmount = Number((invoice as any).totalAmount || 0);
    const apCreditTarget = headerTotalAmount > 0 ? headerTotalAmount : totalDebitSum;
    const diff = Number((apCreditTarget - totalDebitSum).toFixed(2));

    if (diff > 0) {
      // Header total exceeds sum of line items + tax + freight. Add adjustment debit.
      const miscAccountId = await resolveOtherChargesExpenseAccount(companyId, transaction);
      const miscAccountName = await resolveAccountName(miscAccountId, transaction);
      lines.push({
        account_id: miscAccountId,
        debit_amount: diff,
        credit_amount: 0,
        narration: `Adjustment / Additional Charge: Invoice #${invoice.invoiceNumber} [A/C: ${miscAccountName}]`
      });
    } else if (diff < 0) {
      // Header total is less than sum of debits (e.g. Header Discount). Add adjustment credit.
      const absDiff = Math.abs(diff);
      const discountAccountId = await resolveOtherChargesExpenseAccount(companyId, transaction);
      const discountAccountName = await resolveAccountName(discountAccountId, transaction);
      lines.push({
        account_id: discountAccountId,
        debit_amount: 0,
        credit_amount: absDiff,
        narration: `Invoice Discount / Adjustment: Invoice #${invoice.invoiceNumber} [A/C: ${discountAccountName}]`
      });
    }

    // Calculate final needed Accounts Payable Credit Amount so Total Debit === Total Credit
    const finalTotalDebit = Number(
      lines.reduce((sum, l) => sum + Number(l.debit_amount || 0), 0).toFixed(2)
    );
    const finalTotalCredit = Number(
      lines.reduce((sum, l) => sum + Number(l.credit_amount || 0), 0).toFixed(2)
    );

    const apCreditNeeded = Number((finalTotalDebit - finalTotalCredit).toFixed(2));

    if (apCreditNeeded > 0) {
      const creditAccountId = await resolveAPAccount(companyId, apAccountId, transaction);
      const apAccountName = await resolveAccountName(creditAccountId, transaction);

      lines.push({
        account_id: creditAccountId,
        debit_amount: 0,
        credit_amount: apCreditNeeded,
        narration: `Accounts Payable: Invoice #${invoice.invoiceNumber} [A/C: ${apAccountName}]`
      });
    }

    return lines;
  },

  /**
   * Posts the calculated Purchase Invoice impact into GL via AccountingService
   */
  processPurchaseInvoicePosting: async (
    invoiceId: number,
    companyId: number,
    userId: number,
    voucherTypeId?: number,
    grniAccountId?: number,
    apAccountId?: number,
    taxAccountId?: number,
    transaction?: Transaction
  ) => {
    const invoice = await PurchaseInvoiceHeader.findByPk(invoiceId, { transaction });
    if (!invoice) throw new Error(`Purchase Invoice #${invoiceId} not found`);

    if (String(invoice.status || "").toUpperCase() === "DRAFT") {
      throw new Error(`Cannot post GL Impact for Purchase Invoice #${invoiceId} in DRAFT status`);
    }

    const lines = await GLImpactService.calculatePurchaseInvoiceImpact(
      invoiceId,
      companyId,
      grniAccountId,
      apAccountId,
      taxAccountId,
      transaction
    );

    if (lines.length === 0) return null;

    const invoiceNo = invoice.invoiceNumber || `INV-${invoice.id}`;
    const invoiceDate = invoice.invoiceDate ? new Date(invoice.invoiceDate) : new Date();

    return await AccountingService.createAndPostJournalEntry(
      {
        companyId,
        userId,
        entryNo: `JE-INV-${invoiceNo}`,
        voucherTypeId,
        sourceId: invoiceId,
        sourceName: "PurchaseInvoice",
        referenceNo: invoiceNo,
        narration: `GL Impact posting for Purchase Invoice #${invoiceNo}`,
        entryDate: invoiceDate,
        lines
      },
      transaction
    );
  },

  /**
   * Calculates Debit/Credit impact for Purchase Payment (Vendor Payment)
   *
   * NetSuite Accounting Rules:
   *   DEBIT  : Accounts Payable Account (reduces vendor liability)
   *   CREDIT : Bank / Cash Account (reduces cash/bank asset)
   */
  calculatePurchasePaymentImpact: async (
    paymentId: number,
    companyId: number,
    apAccountId?: number,
    cashBankAccountId?: number,
    transaction?: Transaction
  ): Promise<GLLineInput[]> => {
    const payment = await PurchasePaymentHeader.findOne({
      where: { id: paymentId, companyId },
      transaction
    });

    if (!payment) throw new Error(`Purchase Payment #${paymentId} not found`);

    if (String(payment.status || "").toUpperCase() === "DRAFT") {
      return [];
    }

    const amount = Number(payment.totalAmount || 0);
    if (amount <= 0) return [];

    const resolvedApAccountId = await resolveAPAccount(companyId, apAccountId, transaction);
    const apAccountName = await resolveAccountName(resolvedApAccountId, transaction);

    let bankAccId = cashBankAccountId || (payment.bankAccountId ? payment.bankAccountId : undefined);

    if (!bankAccId) {
      const bankAccount = await ChartOfAccountMaster.findOne({
        where: { CompanyId: companyId, isActive: true },
        include: [
          {
            association: "accountType",
            where: {
              account_type_name: {
                [Op.or]: [
                  { [Op.like]: "%Bank%" },
                  { [Op.like]: "%Cash%" },
                  { [Op.like]: "%Asset%" },
                ],
              },
            },
          },
        ],
        transaction,
      });

      if (bankAccount) {
        bankAccId = bankAccount.id;
      } else {
        const fallbackAcc = await ChartOfAccountMaster.findOne({
          where: { CompanyId: companyId, isActive: true },
          transaction,
        });
        if (fallbackAcc) bankAccId = fallbackAcc.id;
      }
    }

    if (!bankAccId) {
      throw new Error(
        `Bank/Cash Account ID is required for Payment #${payment.paymentNumber}. Please select a bank account.`
      );
    }

    const bankAccountName = await resolveAccountName(bankAccId, transaction);

    const lines: GLLineInput[] = [
      {
        account_id: resolvedApAccountId,
        debit_amount: amount,
        credit_amount: 0,
        narration: `Vendor Payment: #${payment.paymentNumber} [A/C: ${apAccountName}]`
      },
      {
        account_id: bankAccId,
        debit_amount: 0,
        credit_amount: amount,
        narration: `Bank Disbursement: #${payment.paymentNumber} [A/C: ${bankAccountName}]`
      }
    ];

    return lines;
  },

  /**
   * Posts the calculated Purchase Payment impact into GL via AccountingService
   */
  processPurchasePaymentPosting: async (
    paymentId: number,
    companyId: number,
    userId: number,
    voucherTypeId?: number,
    apAccountId?: number,
    cashBankAccountId?: number,
    transaction?: Transaction
  ) => {
    const payment = await PurchasePaymentHeader.findByPk(paymentId, { transaction });
    if (!payment) throw new Error(`Purchase Payment #${paymentId} not found`);

    if (String(payment.status || "").toUpperCase() === "DRAFT") {
      throw new Error(`Cannot post GL Impact for Purchase Payment #${paymentId} in DRAFT status`);
    }

    const lines = await GLImpactService.calculatePurchasePaymentImpact(
      paymentId,
      companyId,
      apAccountId,
      cashBankAccountId,
      transaction
    );

    if (lines.length === 0) return null;

    const paymentNo = payment.paymentNumber || `PAY-${payment.id}`;
    const paymentDate = payment.paymentDate ? new Date(payment.paymentDate) : new Date();

    return await AccountingService.createAndPostJournalEntry(
      {
        companyId,
        userId,
        entryNo: `JE-PAY-${paymentNo}`,
        voucherTypeId,
        sourceId: paymentId,
        sourceName: "PurchasePayment",
        referenceNo: paymentNo,
        narration: `GL Impact posting for Purchase Payment #${paymentNo}`,
        entryDate: paymentDate,
        lines
      },
      transaction
    );
  },

  /**
   * Purchase Return Authorization is a non-posting operational document (NO GL Impact)
   */
  calculatePurchaseReturnImpact: async (
    returnId: number,
    companyId: number,
    apAccountId?: number,
    transaction?: Transaction
  ): Promise<GLLineInput[]> => {
    // Non-posting operational document: Return Authorization creates NO GL entries
    return [];
  },

  /**
   * Non-posting status update for Purchase Return Authorization
   */
  processPurchaseReturnPosting: async (
    returnId: number,
    companyId: number,
    userId: number,
    voucherTypeId?: number,
    apAccountId?: number,
    transaction?: Transaction
  ) => {
    // Return Authorization has NO GL impact
    return null;
  },

  /**
   * Calculates Debit/Credit impact for Return Fulfillment (Physical Goods Returned)
   *
   * Accounting Rules:
   *   DEBIT  : Purchase Return Clearing Account (temporary clearing asset/accrual)
   *   CREDIT : Inventory Asset Account (item.asset_account_id or COA Inventory/Stock Asset)
   */
  calculatePurchaseReturnFulfillmentImpact: async (
    fulfillmentId: number,
    companyId: number,
    clearingAccountId?: number,
    transaction?: Transaction
  ): Promise<GLLineInput[]> => {
    const fulfillment = await PurchaseReturnFulfillmentHeader.findOne({
      where: { id: fulfillmentId, companyId },
      include: [
        {
          model: PurchaseReturnFulfillmentLine,
          as: "fulfillmentLines",
          include: [{ model: ItemMaster, as: "item" }]
        }
      ],
      transaction
    });

    if (!fulfillment) throw new Error(`Purchase Return Fulfillment #${fulfillmentId} not found`);

    const lines: GLLineInput[] = [];
    const fLines = ((fulfillment as any).fulfillmentLines || []) as any[];
    let totalValue = 0;

    for (const fLine of fLines) {
      const qty = Number(fLine.fulfilledQty || 0);
      const price = Number(fLine.unitPrice || 0);
      const amount = Number((qty * price).toFixed(2));

      if (amount <= 0) continue;
      totalValue += amount;

      const item = fLine.item as ItemMaster | undefined;
      if (!item) {
        throw new Error(`Item Master missing for Fulfillment Line #${fLine.id}`);
      }

      // CREDIT: Inventory Asset Account
      const creditAccountId = await resolveInventoryAssetAccount(companyId, item, transaction);
      const creditAccountName = await resolveAccountName(creditAccountId, transaction);

      lines.push({
        account_id: creditAccountId,
        debit_amount: 0,
        credit_amount: amount,
        narration: `Return Fulfillment Outward: ${item.item_name} [A/C: ${creditAccountName}] (Qty: ${qty})`
      });
    }

    // DEBIT: Purchase Return Clearing Account
    totalValue = Number(totalValue.toFixed(2));
    if (totalValue > 0) {
      const debitAccountId = await resolvePurchaseReturnClearingAccount(companyId, clearingAccountId, transaction);
      const clearingAccountName = await resolveAccountName(debitAccountId, transaction);

      lines.unshift({
        account_id: debitAccountId,
        debit_amount: totalValue,
        credit_amount: 0,
        narration: `Purchase Return Clearing: Fulfillment #${fulfillment.fulfillmentNumber} [A/C: ${clearingAccountName}]`
      });
    }

    return lines;
  },

  /**
   * Posts the calculated Return Fulfillment impact into GL via AccountingService
   */
  processPurchaseReturnFulfillmentPosting: async (
    fulfillmentId: number,
    companyId: number,
    userId: number,
    voucherTypeId?: number,
    clearingAccountId?: number,
    transaction?: Transaction
  ) => {
    const fulfillment = await PurchaseReturnFulfillmentHeader.findByPk(fulfillmentId, { transaction });
    if (!fulfillment) throw new Error(`Purchase Return Fulfillment #${fulfillmentId} not found`);

    const lines = await GLImpactService.calculatePurchaseReturnFulfillmentImpact(
      fulfillmentId,
      companyId,
      clearingAccountId,
      transaction
    );

    if (lines.length === 0) return null;

    const fNo = fulfillment.fulfillmentNumber || `PRF-${fulfillment.id}`;
    const fDate = fulfillment.fulfillmentDate ? new Date(fulfillment.fulfillmentDate) : new Date();

    return await AccountingService.createAndPostJournalEntry(
      {
        companyId,
        userId,
        entryNo: `JE-PRF-${fNo}`,
        voucherTypeId,
        sourceId: fulfillmentId,
        sourceName: "PurchaseReturnFulfillment",
        referenceNo: fNo,
        narration: `GL Impact posting for Purchase Return Fulfillment #${fNo}`,
        entryDate: fDate,
        lines
      },
      transaction
    );
  },

  /**
   * Calculates Debit/Credit impact for Vendor Credit (Vendor Credit Note)
   *
   * Accounting Rules:
   *   DEBIT  : Accounts Payable Account (reduces vendor liability)
   *   CREDIT : Purchase Return Clearing Account (clears temporary return accrual)
   */
  calculateVendorCreditImpact: async (
    creditId: number,
    companyId: number,
    apAccountId?: number,
    clearingAccountId?: number,
    transaction?: Transaction
  ): Promise<GLLineInput[]> => {
    const credit = await VendorCreditHeader.findOne({
      where: { id: creditId, companyId },
      include: [
        {
          model: VendorCreditLine,
          as: "creditLines",
          include: [{ model: ItemMaster, as: "item" }]
        }
      ],
      transaction
    });

    if (!credit) throw new Error(`Vendor Credit #${creditId} not found`);

    const totalValue = Number(credit.totalAmount || 0);
    if (totalValue <= 0) return [];

    const resolvedApAccountId = await resolveAPAccount(companyId, apAccountId, transaction);
    const apAccountName = await resolveAccountName(resolvedApAccountId, transaction);

    const resolvedClearingAccountId = await resolvePurchaseReturnClearingAccount(companyId, clearingAccountId, transaction);
    const clearingAccountName = await resolveAccountName(resolvedClearingAccountId, transaction);

    const lines: GLLineInput[] = [
      {
        account_id: resolvedApAccountId,
        debit_amount: totalValue,
        credit_amount: 0,
        narration: `Vendor Credit AP Reduction: Note #${credit.creditNoteNumber} [A/C: ${apAccountName}]`
      },
      {
        account_id: resolvedClearingAccountId,
        debit_amount: 0,
        credit_amount: totalValue,
        narration: `Vendor Credit Clearing Offset: Note #${credit.creditNoteNumber} [A/C: ${clearingAccountName}]`
      }
    ];

    return lines;
  },

  /**
   * Posts the calculated Vendor Credit impact into GL via AccountingService
   */
  processVendorCreditPosting: async (
    creditId: number,
    companyId: number,
    userId: number,
    voucherTypeId?: number,
    apAccountId?: number,
    clearingAccountId?: number,
    transaction?: Transaction
  ) => {
    const credit = await VendorCreditHeader.findByPk(creditId, { transaction });
    if (!credit) throw new Error(`Vendor Credit #${creditId} not found`);

    const lines = await GLImpactService.calculateVendorCreditImpact(
      creditId,
      companyId,
      apAccountId,
      clearingAccountId,
      transaction
    );

    if (lines.length === 0) return null;

    const creditNo = credit.creditNoteNumber || `VC-${credit.id}`;
    const creditDate = credit.creditDate ? new Date(credit.creditDate) : new Date();

    return await AccountingService.createAndPostJournalEntry(
      {
        companyId,
        userId,
        entryNo: `JE-VC-${creditNo}`,
        voucherTypeId,
        sourceId: creditId,
        sourceName: "VendorCredit",
        referenceNo: creditNo,
        narration: `GL Impact posting for Vendor Credit #${creditNo}`,
        entryDate: creditDate,
        lines
      },
      transaction
    );
  }
};

