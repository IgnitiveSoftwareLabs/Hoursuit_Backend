const PURCHASE_ORDER_STATUSES = ["DRAFT", "APPROVED", "PARTIAL_RECEIVED", "COMPLETED", "CANCELLED"] as const;
const GRN_STATUSES = ["DRAFT", "RECEIVED", "QC_PENDING", "QC_COMPLETED", "COMPLETED", "CANCELLED"] as const;
const PURCHASE_INVOICE_STATUSES = ["DRAFT", "POSTED", "PARTIAL_PAID", "PAID", "CANCELLED"] as const;
const PURCHASE_RETURN_STATUSES = ["DRAFT", "APPROVED", "RETURNED", "CANCELLED"] as const;

const normalize = (value?: string | null) => (value ?? "").toString().trim().toUpperCase();

const legacyStatusMap: Record<string, string> = {
  APPROVED: "APPROVED",
  RECEIVED: "RECEIVED",
  POSTED: "POSTED",
  PAID: "PAID",
};

export const normalizePurchaseOrderStatus = (value?: string | null, fallback: string = "DRAFT") => {
  const normalized = normalize(value);
  if (!normalized) return fallback;

  if (normalized === "RECEIVED") return "PARTIAL_RECEIVED";
  if (normalized === "DONE" || normalized === "FINISHED") return "COMPLETED";
  if ((PURCHASE_ORDER_STATUSES as readonly string[]).includes(normalized)) return normalized;

  const mapped = legacyStatusMap[normalized];
  if (mapped && (PURCHASE_ORDER_STATUSES as readonly string[]).includes(mapped)) return mapped;

  throw new Error(`Invalid purchase order status: ${value}`);
};

export const normalizeGRNStatus = (value?: string | null, fallback: string = "DRAFT") => {
  const normalized = normalize(value);
  if (!normalized) return fallback;

  if (normalized === "APPROVED") return "RECEIVED";
  if ((GRN_STATUSES as readonly string[]).includes(normalized)) return normalized;

  const mapped = legacyStatusMap[normalized];
  if (mapped && (GRN_STATUSES as readonly string[]).includes(mapped)) return mapped;

  throw new Error(`Invalid GRN status: ${value}`);
};

export const normalizePurchaseInvoiceStatus = (value?: string | null, fallback: string = "DRAFT") => {
  const normalized = normalize(value);
  if (!normalized) return fallback;

  if (normalized === "APPROVED") return "POSTED";
  if ((PURCHASE_INVOICE_STATUSES as readonly string[]).includes(normalized)) return normalized;

  const mapped = legacyStatusMap[normalized];
  if (mapped && (PURCHASE_INVOICE_STATUSES as readonly string[]).includes(mapped)) return mapped;

  throw new Error(`Invalid purchase invoice status: ${value}`);
};

export const normalizePurchaseReturnStatus = (value?: string | null, fallback: string = "DRAFT") => {
  const normalized = normalize(value);
  if (!normalized) return fallback;

  if ((PURCHASE_RETURN_STATUSES as readonly string[]).includes(normalized)) return normalized;

  const mapped = legacyStatusMap[normalized];
  if (mapped && (PURCHASE_RETURN_STATUSES as readonly string[]).includes(mapped)) return mapped;

  throw new Error(`Invalid purchase return status: ${value}`);
};

const PURCHASE_PAYMENT_STATUSES = ["DRAFT", "POSTED", "CANCELLED"] as const;

export const normalizePurchasePaymentStatus = (value?: string | null, fallback: string = "DRAFT") => {
  const normalized = normalize(value);
  if (!normalized) return fallback;

  if (normalized === "APPROVED") return "POSTED";
  if ((PURCHASE_PAYMENT_STATUSES as readonly string[]).includes(normalized)) return normalized;

  const mapped = legacyStatusMap[normalized];
  if (mapped && (PURCHASE_PAYMENT_STATUSES as readonly string[]).includes(mapped)) return mapped;

  throw new Error(`Invalid purchase payment status: ${value}`);
};

