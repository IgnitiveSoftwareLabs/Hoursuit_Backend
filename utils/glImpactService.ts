import { Transaction } from "sequelize";
import { AccountingService, GLLineInput } from "./accounting";

import GRN from "../modals/Transactions/purchase/GRN/GRNHeader";
import GRNLine from "../modals/Transactions/purchase/GRN/GRNLine";
import PurchaseOrderLine from "../modals/Transactions/purchase/purchaseOrder/purchaseOrderLine";
import ItemMaster from "../modals/masters/items/itemMaster";
import { PurchaseInvoiceHeader, PurchaseInvoiceLine } from "../modals/Transactions/purchase/purchaseInvoice";
import { PurchasePaymentHeader, PurchasePaymentLine } from "../modals/Transactions/purchase/purchasePayment";
import { PurchaseReturnHeader, PurchaseReturnLine } from "../modals/Transactions/purchase/purchaseReturn";

// Default Account Fallbacks (used when specific GL accounts are not configured on Item/Vendor)
const DEFAULT_FALLBACK_ACCOUNTS = {
  INVENTORY_ASSET: 1, // Default Inventory/Expense Account
  GRNI_CLEARING: 2,   // Default Accrued Purchase Liability (GRNI) Account
  ACCOUNTS_PAYABLE: 3,// Default Accounts Payable (Vendor) Account
  INPUT_TAX: 4,       // Default GST / Input Tax Account
  FREIGHT_EXPENSE: 5, // Default Freight & Handling Account
  CASH_BANK: 6,       // Default Bank/Cash Account
};

export const GLImpactService = {
  /**
   * Calculates Debit/Credit impact for GRN (Goods Receipt Note)
   */
  calculateGRNImpact: async (
    source_name: string,
    grnId: number,
    companyId: number,
    grniAccountId: number = DEFAULT_FALLBACK_ACCOUNTS.GRNI_CLEARING,
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

    if (!grn) throw new Error("GRN record not found");

    const lines: GLLineInput[] = [];
    let totalGRNValue = 0;
    const grnLines = ((grn as any).lineItems || []) as any[];

    for (const lineItem of grnLines) {
      const rate = Number(lineItem.purchaseOrderLine?.rate || 0);
      const qty = Number(lineItem.acceptedQty > 0 ? lineItem.acceptedQty : lineItem.receivedQty);
      const amount = qty * rate;

      if (amount <= 0) continue;
      totalGRNValue += amount;

      const item = lineItem.item as ItemMaster | undefined;
      const inventoryAccountId = item?.asset_account_id || item?.expense_account_id || DEFAULT_FALLBACK_ACCOUNTS.INVENTORY_ASSET;

      // DEBIT: Asset (or Expense) Account configured on ItemMaster or fallback
      lines.push({
        account_id: inventoryAccountId,
        debit_amount: amount,
        credit_amount: 0,
        narration: `Inventory Inward - ${item?.item_name || "Item"} (Qty: ${qty} @ ${rate})`
      });
    }

    // CREDIT: GRNI (Accrued Purchases) Account
    if (totalGRNValue > 0) {
      lines.push({
        account_id: grniAccountId || DEFAULT_FALLBACK_ACCOUNTS.GRNI_CLEARING,
        debit_amount: 0,
        credit_amount: totalGRNValue,
        narration: `Accrued Liability for GRN #${(grn as any).grnNo || grn.id}`
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
    grniAccountId: number = DEFAULT_FALLBACK_ACCOUNTS.GRNI_CLEARING,
    transaction?: Transaction
  ) => {
    const grn = await GRN.findByPk(grnId, { transaction });
    if (!grn) throw new Error("GRN record not found");

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
   */
  calculatePurchaseInvoiceImpact: async (
    invoiceId: number,
    companyId: number,
    grniAccountId: number = DEFAULT_FALLBACK_ACCOUNTS.GRNI_CLEARING,
    apAccountId: number = DEFAULT_FALLBACK_ACCOUNTS.ACCOUNTS_PAYABLE,
    taxAccountId: number = DEFAULT_FALLBACK_ACCOUNTS.INPUT_TAX,
    freightAccountId: number = DEFAULT_FALLBACK_ACCOUNTS.FREIGHT_EXPENSE,
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

    if (!invoice) throw new Error("Purchase invoice record not found");

    const lines: GLLineInput[] = [];
    const invLines = ((invoice as any).purchaseInvoiceLines || []) as any[];

    let totalLineTax = 0;

    for (const invLine of invLines) {
      const qty = Number(invLine.quantity || 0);
      const unitPrice = Number(invLine.unitPrice || 0);
      const discount = Number(invLine.discountAmount || 0);
      const taxableLineAmount = qty * unitPrice - discount;
      const lineTax = Number(invLine.taxAmount || 0);

      totalLineTax += lineTax;

      const item = invLine.item as ItemMaster | undefined;
      // If invoice line is linked to GRN, clear GRNI Accrued Liability; else debit item Asset/Expense account
      const debitAccountId = invLine.grnLineId || invoice.grnHeaderId
        ? grniAccountId
        : (item?.asset_account_id || item?.expense_account_id || DEFAULT_FALLBACK_ACCOUNTS.INVENTORY_ASSET);

      if (taxableLineAmount > 0) {
        lines.push({
          account_id: debitAccountId,
          debit_amount: taxableLineAmount,
          credit_amount: 0,
          narration: `Vendor Invoice Purchase - ${item?.item_name || "Item"} (Qty: ${qty})`
        });
      }
    }

    // Tax Impact (DEBIT Input Tax Account)
    const finalTaxAmount = totalLineTax > 0 ? totalLineTax : Number(invoice.taxAmount || 0);
    if (finalTaxAmount > 0) {
      lines.push({
        account_id: taxAccountId,
        debit_amount: finalTaxAmount,
        credit_amount: 0,
        narration: `Input Tax (GST) for Invoice #${invoice.invoiceNumber}`
      });
    }

    // CREDIT: Accounts Payable (Vendor Account) for Total Invoice Amount
    const totalAmount = Number(invoice.totalAmount || 0);
    if (totalAmount > 0) {
      lines.push({
        account_id: apAccountId,
        debit_amount: 0,
        credit_amount: totalAmount,
        narration: `Accounts Payable Vendor Invoice #${invoice.invoiceNumber}`
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
    grniAccountId: number = DEFAULT_FALLBACK_ACCOUNTS.GRNI_CLEARING,
    apAccountId: number = DEFAULT_FALLBACK_ACCOUNTS.ACCOUNTS_PAYABLE,
    transaction?: Transaction
  ) => {
    const invoice = await PurchaseInvoiceHeader.findByPk(invoiceId, { transaction });
    if (!invoice) throw new Error("Purchase invoice record not found");

    const lines = await GLImpactService.calculatePurchaseInvoiceImpact(
      invoiceId,
      companyId,
      grniAccountId,
      apAccountId,
      DEFAULT_FALLBACK_ACCOUNTS.INPUT_TAX,
      DEFAULT_FALLBACK_ACCOUNTS.FREIGHT_EXPENSE,
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
   */
  calculatePurchasePaymentImpact: async (
    paymentId: number,
    companyId: number,
    apAccountId: number = DEFAULT_FALLBACK_ACCOUNTS.ACCOUNTS_PAYABLE,
    cashBankAccountId?: number,
    transaction?: Transaction
  ): Promise<GLLineInput[]> => {
    const payment = await PurchasePaymentHeader.findOne({
      where: { id: paymentId, companyId },
      transaction
    });

    if (!payment) throw new Error("Purchase payment record not found");

    const amount = Number(payment.totalAmount || 0);
    if (amount <= 0) return [];

    const bankAccId = cashBankAccountId || payment.bankAccountId || DEFAULT_FALLBACK_ACCOUNTS.CASH_BANK;
    const lines: GLLineInput[] = [
      {
        account_id: apAccountId,
        debit_amount: amount,
        credit_amount: 0,
        narration: `Payment to Vendor - Purchase Payment #${payment.paymentNumber}`
      },
      {
        account_id: bankAccId,
        debit_amount: 0,
        credit_amount: amount,
        narration: `Disbursement from Cash/Bank - Purchase Payment #${payment.paymentNumber}`
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
    apAccountId: number = DEFAULT_FALLBACK_ACCOUNTS.ACCOUNTS_PAYABLE,
    cashBankAccountId?: number,
    transaction?: Transaction
  ) => {
    const payment = await PurchasePaymentHeader.findByPk(paymentId, { transaction });
    if (!payment) throw new Error("Purchase payment record not found");

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
        sourceName: "PURCHASE_PAYMENT",
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
   */
  calculatePurchaseReturnImpact: async (
    returnId: number,
    companyId: number,
    apAccountId: number = DEFAULT_FALLBACK_ACCOUNTS.ACCOUNTS_PAYABLE,
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

    if (!purchaseReturn) throw new Error("Purchase return record not found");

    const lines: GLLineInput[] = [];
    const returnLines = ((purchaseReturn as any).purchaseReturnLines || []) as any[];
    let totalReturnValue = 0;

    for (const line of returnLines) {
      const qty = Number(line.returnQty || 0);
      const price = Number(line.unitPrice || 0);
      const amount = qty * price;

      if (amount <= 0) continue;
      totalReturnValue += amount;

      const item = line.item as ItemMaster | undefined;
      const inventoryAccountId = item?.asset_account_id || item?.expense_account_id || DEFAULT_FALLBACK_ACCOUNTS.INVENTORY_ASSET;

      // CREDIT: Inventory Asset / Expense Account
      lines.push({
        account_id: inventoryAccountId,
        debit_amount: 0,
        credit_amount: amount,
        narration: `Inventory Return Outward - ${item?.item_name || "Item"} (Qty: ${qty})`
      });
    }

    // DEBIT: Accounts Payable (Vendor Account) for Total Return Amount
    if (totalReturnValue > 0) {
      lines.unshift({
        account_id: apAccountId,
        debit_amount: totalReturnValue,
        credit_amount: 0,
        narration: `Accounts Payable Vendor Return #${purchaseReturn.returnNumber}`
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
    apAccountId: number = DEFAULT_FALLBACK_ACCOUNTS.ACCOUNTS_PAYABLE,
    transaction?: Transaction
  ) => {
    const purchaseReturn = await PurchaseReturnHeader.findByPk(returnId, { transaction });
    if (!purchaseReturn) throw new Error("Purchase return record not found");

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
        sourceName: "PURCHASE_RETURN",
        referenceNo: returnNo,
        narration: `GL Impact posting for Purchase Return #${returnNo}`,
        entryDate: returnDate,
        lines
      },
      transaction
    );
  }
};

