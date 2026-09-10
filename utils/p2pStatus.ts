export const PURCHASE_ORDER_STATUSES = [
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "PENDING_RECEIPT",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "PENDING_BILLING",
  "PARTIALLY_BILLED",
  "FULLY_BILLED",
  "CLOSED",
  "CANCELLED",
  // Legacy aliases for backward compatibility
  "DRAFT",
  "PARTIAL_RECEIVED",
  "COMPLETED",
] as const;

export const GRN_STATUSES = [
  "PENDING_RECEIPT",
  "APPROVED",
  "PARTIALLY_RECEIVED",
  "PENDING_BILLING",
  "PENDING_BILLING_PARTIALLY_RECEIVED",
  "FULLY_BILLED",
  "CLOSED",
  "CANCELLED",
  "REJECTED",
  // Legacy aliases
  "DRAFT",
  "RECEIVED",
  "QC_PENDING",
  "QC_COMPLETED",
  "COMPLETED",
  "BILLED",
] as const;

export const PURCHASE_INVOICE_STATUSES = [
  "PENDING_APPROVAL",
  "APPROVED",
  "UNPAID",
  "PARTIALLY_PAID",
  "PARTIAL_PAID",
  "PAID",
  "RESUBMIT",
  "REJECTED",
  "CANCELLED",
  // Legacy aliases for backward compatibility
  "DRAFT",
  "POSTED",
] as const;
export const PURCHASE_RETURN_STATUSES = [
  "PENDING_APPROVAL",
  "PENDING_RETURN",
  "PARTIALLY_RETURNED",
  "PENDING_CREDIT",
  "PENDING_CREDIT_PARTIALLY_RETURNED",
  "CREDITED",
  "CLOSED",
  "CANCELLED",
  "REJECTED",
  // Legacy aliases
  "DRAFT",
  "AUTHORIZED",
  "APPROVED",
  "PARTIALLY_FULFILLED",
  "FULFILLED",
  "RETURNED",
] as const;

export const PURCHASE_PAYMENT_STATUSES = [
  "PENDING_APPROVAL",
  "APPROVED",
  "PROCESSED",
  "CANCELLED",
  // Legacy aliases
  "DRAFT",
  "POSTED",
] as const;

export const RETURN_FULFILLMENT_STATUSES = [
  "PENDING_APPROVAL",
  "APPROVED",
  "CANCELLED",
  // Legacy aliases
  "DRAFT",
  "FULFILLED",
] as const;

export const VENDOR_CREDIT_STATUSES = [
  "PENDING_APPROVAL",
  "APPROVED",
  "PARTIALLY_APPLIED",
  "FULLY_APPLIED",
  "CLOSED",
  "CANCELLED",
  // Legacy aliases
  "DRAFT",
  "POSTED",
] as const;

export const VENDOR_REFUND_STATUSES = [
  "PENDING_APPROVAL",
  "APPROVED",
  "PROCESSED",
  "CANCELLED",
  "FAILED",
  // Legacy aliases
  "DRAFT",
  "POSTED",
] as const;

const normalize = (value?: string | null) => (value ?? "").toString().trim().toUpperCase().replace(/\s+/g, "_");

const legacyStatusMap: Record<string, string> = {
  APPROVED: "APPROVED",
  RECEIVED: "RECEIVED",
  POSTED: "POSTED",
  PAID: "PAID",
};

export const normalizePurchaseOrderStatus = (value?: string | null, fallback: string = "PENDING_APPROVAL") => {
  const normalized = normalize(value);
  if (!normalized) return fallback;

  if (normalized === "DRAFT" || normalized === "PENDING_APPROVAL") return "PENDING_APPROVAL";
  if (normalized === "APPROVED") return "APPROVED";
  if (normalized === "REJECTED") return "REJECTED";
  if (normalized === "PENDING_RECEIPT") return "PENDING_RECEIPT";
  if (normalized === "PARTIAL_RECEIVED" || normalized === "PARTIALLY_RECEIVED") return "PARTIALLY_RECEIVED";
  if (normalized === "RECEIVED") return "RECEIVED";
  if (normalized === "PENDING_BILLING") return "PENDING_BILLING";
  if (normalized === "PARTIAL_BILLED" || normalized === "PARTIALLY_BILLED") return "PARTIALLY_BILLED";
  if (normalized === "FULLY_BILLED" || normalized === "FULL_BILLED") return "FULLY_BILLED";
  if (normalized === "CLOSED" || normalized === "COMPLETED" || normalized === "DONE" || normalized === "FINISHED") return "CLOSED";
  if (normalized === "CANCELLED" || normalized === "CANCELED") return "CANCELLED";

  if ((PURCHASE_ORDER_STATUSES as readonly string[]).includes(normalized)) return normalized;

  const mapped = legacyStatusMap[normalized];
  if (mapped && (PURCHASE_ORDER_STATUSES as readonly string[]).includes(mapped)) return mapped;

  return fallback;
};

export const isPurchaseOrderEditable = (status?: string | null) => {
  const normalized = normalizePurchaseOrderStatus(status, "PENDING_APPROVAL");
  return normalized === "PENDING_APPROVAL";
};

export const canManuallyUpdatePurchaseOrderStatus = (currentStatus?: string | null) => {
  const normalized = normalizePurchaseOrderStatus(currentStatus, "PENDING_APPROVAL");
  return normalized === "PENDING_APPROVAL";
};

export const normalizeGRNStatus = (value?: string | null, fallback: string = "PENDING_RECEIPT") => {
  const normalized = normalize(value);
  if (!normalized) return fallback;

  if (normalized === "DRAFT" || normalized === "PENDING_RECEIPT") return "PENDING_RECEIPT";
  if (normalized === "APPROVED" || normalized === "RECEIVED") return "APPROVED";
  if (normalized === "REJECTED") return "REJECTED";
  if (normalized === "PARTIAL_RECEIVED" || normalized === "PARTIALLY_RECEIVED") return "PARTIALLY_RECEIVED";
  if (normalized === "PENDING_BILLING") return "PENDING_BILLING";
  if (
    normalized === "PENDING_BILLING_PARTIALLY_RECEIVED" ||
    normalized === "PENDING_BILLING/PARTIALLY_RECEIVED" ||
    normalized === "PENDING_BILLING_PARTIAL_RECEIVED" ||
    normalized === "PENDING_BILLING/PARTIAL_RECEIVED"
  ) {
    return "PENDING_BILLING_PARTIALLY_RECEIVED";
  }
  if (normalized === "FULLY_BILLED" || normalized === "FULL_BILLED" || normalized === "BILLED") return "FULLY_BILLED";
  if (normalized === "CLOSED" || normalized === "COMPLETED" || normalized === "DONE" || normalized === "FINISHED") return "CLOSED";
  if (normalized === "CANCELLED" || normalized === "CANCELED") return "CANCELLED";

  if ((GRN_STATUSES as readonly string[]).includes(normalized)) return normalized;

  const mapped = legacyStatusMap[normalized];
  if (mapped && (GRN_STATUSES as readonly string[]).includes(mapped)) return mapped;

  return fallback;
};

export const isGRNEditable = (status?: string | null) => {
  const normalized = normalizeGRNStatus(status, "PENDING_RECEIPT");
  return normalized === "PENDING_RECEIPT";
};

export const canManuallyUpdateGRNStatus = (currentStatus?: string | null) => {
  const normalized = normalizeGRNStatus(currentStatus, "PENDING_RECEIPT");
  return normalized === "PENDING_RECEIPT" || normalized === "APPROVED" || normalized === "REJECTED";
};

export const normalizePurchaseInvoiceStatus = (value?: string | null, fallback: string = "PENDING_APPROVAL") => {
  const normalized = normalize(value);
  if (!normalized) return fallback;

  if (normalized === "DRAFT" || normalized === "PENDING_APPROVAL") return "PENDING_APPROVAL";
  if (normalized === "APPROVED" || normalized === "POSTED") return "APPROVED";
  if (normalized === "UNPAID") return "UNPAID";
  if (normalized === "PARTIAL_PAID" || normalized === "PARTIALLY_PAID") return "PARTIAL_PAID";
  if (normalized === "PAID") return "PAID";
  if (normalized === "RESUBMIT") return "RESUBMIT";
  if (normalized === "REJECTED") return "REJECTED";
  if (normalized === "CANCELLED" || normalized === "CANCELED") return "CANCELLED";

  if ((PURCHASE_INVOICE_STATUSES as readonly string[]).includes(normalized)) return normalized;

  const mapped = legacyStatusMap[normalized];
  if (mapped && (PURCHASE_INVOICE_STATUSES as readonly string[]).includes(mapped)) return mapped;

  return fallback;
};

export const isPurchaseInvoiceEditable = (status?: string | null) => {
  const normalized = normalizePurchaseInvoiceStatus(status, "PENDING_APPROVAL");
  return normalized === "PENDING_APPROVAL" || normalized === "RESUBMIT";
};

export const canManuallyUpdatePurchaseInvoiceStatus = (currentStatus?: string | null) => {
  const normalized = normalizePurchaseInvoiceStatus(currentStatus, "PENDING_APPROVAL");
  return normalized === "PENDING_APPROVAL" || normalized === "RESUBMIT";
};

export const normalizePurchaseReturnStatus = (value?: string | null, fallback: typeof PURCHASE_RETURN_STATUSES[number] = "PENDING_APPROVAL"): typeof PURCHASE_RETURN_STATUSES[number] => {
  const normalized = normalize(value);
  if (!normalized) return fallback;

  if (normalized === "DRAFT" || normalized === "PENDING_APPROVAL") return "PENDING_APPROVAL";
  if (normalized === "PENDING_RETURN" || normalized === "AUTHORIZED" || normalized === "APPROVED") return "PENDING_RETURN";
  if (normalized === "PARTIALLY_RETURNED" || normalized === "PARTIALLY_FULFILLED" || normalized === "PARTIAL_RETURNED") return "PARTIALLY_RETURNED";
  if (normalized === "PENDING_CREDIT" || normalized === "FULFILLED") return "PENDING_CREDIT";
  if (
    normalized === "PENDING_CREDIT_PARTIALLY_RETURNED" ||
    normalized === "PENDING_CREDIT_/_PARTIALLY_RETURNED" ||
    normalized === "PENDING_CREDIT/PARTIALLY_RETURNED"
  ) {
    return "PENDING_CREDIT_PARTIALLY_RETURNED";
  }
  if (normalized === "CREDITED" || normalized === "RETURNED") return "CREDITED";
  if (normalized === "CLOSED" || normalized === "COMPLETED" || normalized === "DONE") return "CLOSED";
  if (normalized === "CANCELLED" || normalized === "CANCELED") return "CANCELLED";
  if (normalized === "REJECTED") return "REJECTED";

  if ((PURCHASE_RETURN_STATUSES as readonly string[]).includes(normalized)) return normalized as typeof PURCHASE_RETURN_STATUSES[number];

  return fallback;
};

export const isPurchaseReturnEditable = (status?: string | null) => {
  const normalized = normalizePurchaseReturnStatus(status, "PENDING_APPROVAL");
  return normalized === "PENDING_APPROVAL";
};

export const canManuallyUpdatePurchaseReturnStatus = (currentStatus?: string | null) => {
  const normalized = normalizePurchaseReturnStatus(currentStatus, "PENDING_APPROVAL");
  return normalized === "PENDING_APPROVAL" || normalized === "PENDING_RETURN";
};

export const normalizePurchasePaymentStatus = (value?: string | null, fallback: typeof PURCHASE_PAYMENT_STATUSES[number] = "PENDING_APPROVAL"): typeof PURCHASE_PAYMENT_STATUSES[number] => {
  const normalized = normalize(value);
  if (!normalized) return fallback;

  if (normalized === "DRAFT" || normalized === "PENDING_APPROVAL") return "PENDING_APPROVAL";
  if (normalized === "APPROVED") return "APPROVED";
  if (normalized === "PROCESSED" || normalized === "POSTED" || normalized === "PAID") return "PROCESSED";
  if (normalized === "CANCELLED" || normalized === "CANCELED") return "CANCELLED";

  if ((PURCHASE_PAYMENT_STATUSES as readonly string[]).includes(normalized)) return normalized as typeof PURCHASE_PAYMENT_STATUSES[number];

  return fallback;
};

export const isPurchasePaymentEditable = (status?: string | null) => {
  const normalized = normalizePurchasePaymentStatus(status, "PENDING_APPROVAL");
  return normalized === "PENDING_APPROVAL";
};

export const canManuallyUpdatePurchasePaymentStatus = (currentStatus?: string | null) => {
  const normalized = normalizePurchasePaymentStatus(currentStatus, "PENDING_APPROVAL");
  return normalized === "PENDING_APPROVAL";
};

export const normalizeReturnFulfillmentStatus = (value?: string | null, fallback: typeof RETURN_FULFILLMENT_STATUSES[number] = "PENDING_APPROVAL"): typeof RETURN_FULFILLMENT_STATUSES[number] => {
  const normalized = normalize(value);
  if (!normalized) return fallback;

  if (normalized === "DRAFT" || normalized === "PENDING_APPROVAL") return "PENDING_APPROVAL";
  if (normalized === "FULFILLED" || normalized === "APPROVED" || normalized === "SHIPPED") return "FULFILLED";
  if (normalized === "CANCELLED" || normalized === "CANCELED") return "CANCELLED";

  if ((RETURN_FULFILLMENT_STATUSES as readonly string[]).includes(normalized)) return normalized as typeof RETURN_FULFILLMENT_STATUSES[number];

  return fallback;
};

export const isReturnFulfillmentEditable = (status?: string | null) => {
  const normalized = normalizeReturnFulfillmentStatus(status, "PENDING_APPROVAL");
  return normalized === "PENDING_APPROVAL";
};

export const normalizeVendorCreditStatus = (value?: string | null, fallback: typeof VENDOR_CREDIT_STATUSES[number] = "PENDING_APPROVAL"): typeof VENDOR_CREDIT_STATUSES[number] => {
  const normalized = normalize(value);
  if (!normalized) return fallback;

  if (normalized === "DRAFT" || normalized === "PENDING_APPROVAL") return "PENDING_APPROVAL";
  if (normalized === "APPROVED" || normalized === "POSTED") return "APPROVED";
  if (normalized === "PARTIALLY_APPLIED" || normalized === "PARTIAL_APPLIED") return "PARTIALLY_APPLIED";
  if (normalized === "FULLY_APPLIED" || normalized === "FULL_APPLIED" || normalized === "APPLIED") return "FULLY_APPLIED";
  if (normalized === "CLOSED" || normalized === "COMPLETED") return "CLOSED";
  if (normalized === "CANCELLED" || normalized === "CANCELED") return "CANCELLED";

  if ((VENDOR_CREDIT_STATUSES as readonly string[]).includes(normalized)) return normalized as typeof VENDOR_CREDIT_STATUSES[number];

  return fallback;
};

export const isVendorCreditEditable = (status?: string | null) => {
  const normalized = normalizeVendorCreditStatus(status, "PENDING_APPROVAL");
  return normalized === "PENDING_APPROVAL";
};

export const normalizeVendorRefundStatus = (value?: string | null, fallback: typeof VENDOR_REFUND_STATUSES[number] = "PENDING_APPROVAL"): typeof VENDOR_REFUND_STATUSES[number] => {
  const normalized = normalize(value);
  if (!normalized) return fallback;

  if (normalized === "DRAFT" || normalized === "PENDING_APPROVAL") return "PENDING_APPROVAL";
  if (normalized === "APPROVED") return "APPROVED";
  if (normalized === "PROCESSED" || normalized === "POSTED") return "PROCESSED";
  if (normalized === "CANCELLED" || normalized === "CANCELED") return "CANCELLED";
  if (normalized === "FAILED") return "FAILED";

  if ((VENDOR_REFUND_STATUSES as readonly string[]).includes(normalized)) return normalized as typeof VENDOR_REFUND_STATUSES[number];

  return fallback;
};

export const isVendorRefundEditable = (status?: string | null) => {
  const normalized = normalizeVendorRefundStatus(status, "PENDING_APPROVAL");
  return normalized === "PENDING_APPROVAL";
};


