import { Op, Transaction } from "sequelize";
import { AccountingService, GLLineInput } from "./accounting";
import { resolveAccountName } from "./resolveAccounts";

import { PurchaseInvoiceHeader, PurchaseInvoiceLine } from "../modals/Transactions/purchase/purchaseInvoice";
import { PurchasePaymentHeader, PurchasePaymentLine } from "../modals/Transactions/purchase/purchasePayment";
import { PurchaseReturnHeader, PurchaseReturnLine } from "../modals/Transactions/purchase/purchaseReturn";
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

    // CREDIT: Accounts Payable (Vendor) Account
    const totalAmount = Number(invoice.totalAmount || 0);
    if (totalAmount > 0) {
      const creditAccountId = await resolveAPAccount(companyId, apAccountId, transaction);
      const apAccountName = await resolveAccountName(creditAccountId, transaction);

      lines.push({
        account_id: creditAccountId,
        debit_amount: 0,
        credit_amount: totalAmount,
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
   * Calculates Debit/Credit impact for Purchase Return (Vendor Return)
   *
   * NetSuite Accounting Rules:
   *   DEBIT  : Accounts Payable Account (or GRNI Account)
   *   CREDIT : Item Asset Account (if inventory item) OR Item Expense Account
   */
  calculatePurchaseReturnImpact: async (
    returnId: number,
    companyId: number,
    apAccountId?: number,
    transaction?: Transaction
  ): Promise<GLLineInput[]> => {
    const purchaseReturn = await PurchaseReturnHeader.findOne({
      where: { id: returnId, companyId },
      include: [
        {
          model: PurchaseReturnLine,
          as: "purchaseReturnLines",
          include: [{ model: ItemMaster, as: "item" }]
        }
      ],
      transaction
    });

    if (!purchaseReturn) throw new Error(`Purchase Return #${returnId} not found`);

    const lines: GLLineInput[] = [];
    const returnLines = ((purchaseReturn as any).purchaseReturnLines || []) as any[];
    let totalReturnValue = 0;

    for (const line of returnLines) {
      const qty = Number(line.returnQty || 0);
      const price = Number(line.unitPrice || 0);
      const amount = Number((qty * price).toFixed(2));

      if (amount <= 0) continue;
      totalReturnValue += amount;

      const item = line.item as ItemMaster | undefined;

      if (!item) {
        throw new Error(`Item Master record missing for Return Line #${line.id}`);
      }

      let creditAccountId: number | undefined;
      if (item.track_inventory) {
        creditAccountId = (item.asset_account_id || item.expense_account_id) || undefined;
      } else {
        creditAccountId = (item.expense_account_id || item.asset_account_id) || undefined;
      }

      if (!creditAccountId) {
        throw new Error(
          `Item "${item.item_name}" (Code: ${item.item_code || item.id}) has no Asset or Expense Account configured in Item Master.`
        );
      }

      const accountName = await resolveAccountName(creditAccountId, transaction);

      lines.push({
        account_id: creditAccountId,
        debit_amount: 0,
        credit_amount: amount,
        narration: `Return Outward: ${item.item_name} [A/C: ${accountName}] (Qty: ${qty})`
      });
    }

    // DEBIT: Accounts Payable Account (or GRNI Account)
    totalReturnValue = Number(totalReturnValue.toFixed(2));
    if (totalReturnValue > 0) {
      const debitAccountId = await resolveAPAccount(companyId, apAccountId, transaction);
      const apAccountName = await resolveAccountName(debitAccountId, transaction);

      lines.unshift({
        account_id: debitAccountId,
        debit_amount: totalReturnValue,
        credit_amount: 0,
        narration: `A/P Vendor Return: #${purchaseReturn.returnNumber} [A/C: ${apAccountName}]`
      });
    }

    return lines;
  },

  /**
   * Posts the calculated Purchase Return impact into GL via AccountingService
   */
  processPurchaseReturnPosting: async (
    returnId: number,
    companyId: number,
    userId: number,
    voucherTypeId?: number,
    apAccountId?: number,
    transaction?: Transaction
  ) => {
    const purchaseReturn = await PurchaseReturnHeader.findByPk(returnId, { transaction });
    if (!purchaseReturn) throw new Error(`Purchase Return #${returnId} not found`);

    const lines = await GLImpactService.calculatePurchaseReturnImpact(
      returnId,
      companyId,
      apAccountId,
      transaction
    );

    if (lines.length === 0) return null;

    const returnNo = purchaseReturn.returnNumber || `RET-${purchaseReturn.id}`;
    const returnDate = purchaseReturn.returnDate ? new Date(purchaseReturn.returnDate) : new Date();

    return await AccountingService.createAndPostJournalEntry(
      {
        companyId,
        userId,
        entryNo: `JE-RET-${returnNo}`,
        voucherTypeId,
        sourceId: returnId,
        sourceName: "PurchaseReturn",
        referenceNo: returnNo,
        narration: `GL Impact posting for Purchase Return #${returnNo}`,
        entryDate: returnDate,
        lines
      },
      transaction
    );
  }
};

