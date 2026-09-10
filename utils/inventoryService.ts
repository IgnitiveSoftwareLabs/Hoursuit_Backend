import { Transaction, Op } from "sequelize";
import { GRN, GRNLine } from "../modals/Transactions/purchase/GRN";
import PurchaseOrderLine from "../modals/Transactions/purchase/purchaseOrder/purchaseOrderLine";
import PurchaseOrderHeader from "../modals/Transactions/purchase/purchaseOrder/purchaseOrderHeader";
import { PurchaseReturnHeader, PurchaseReturnLine } from "../modals/Transactions/purchase/purchaseReturn";
import PurchaseReturnFulfillmentHeader from "../modals/Transactions/purchase/purchaseReturn/purchaseReturnFulfillmentHeader";
import PurchaseReturnFulfillmentLine from "../modals/Transactions/purchase/purchaseReturn/purchaseReturnFulfillmentLine";
import ItemMaster from "../modals/masters/items/itemMaster";
import UOMMaster from "../modals/masters/UOM/UOMMaster";
import CityMaster from "../modals/masters/city/city";
import InventoryCount from "../modals/inventory/inventory";
import { PurchaseInvoiceHeader, PurchaseInvoiceLine } from "../modals/Transactions/purchase/purchaseInvoice";
import { normalizePurchaseOrderStatus, normalizeGRNStatus } from "./p2pStatus";

export const InventoryService = {
  /**
   * Updates warehouse inventory balances on GRN approval or receipt
   */

    updateStockFromGRN: async (
    grnId: number,
    warehouseId?: number,
    companyId?: number,
    userId?: number,
    transaction?: Transaction
  ) => {
    // Fetch GRN Header along with Lines, ItemMaster and PurchaseOrderLine
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

    if (!grn) {
      throw new Error(`GRN record #${grnId} not found.`);
    }

    const grnLines = ((grn as any).lineItems || []) as any[];

    for (const itemLine of grnLines) {
      const acceptedQty = Number(itemLine.acceptedQty || 0);
      const receivedQty = Number(itemLine.receivedQty || 0);
      const qty = acceptedQty > 0 ? acceptedQty : receivedQty;

      if (qty <= 0) continue;

      const pol = itemLine.purchaseOrderLine;
      const poQty = Number(pol?.quantity || itemLine.orderedQty || 1);
      const subtotal = Number(
        pol?.subtotal !== undefined && pol?.subtotal !== null
          ? pol.subtotal
          : pol?.amount !== undefined
          ? Number(pol.amount) - Number(pol.discount_amount || 0)
          : Number(itemLine.unitPrice || itemLine.unit_price || itemLine.rate || pol?.rate || 0) * poQty
      );
      const effectiveRate = subtotal > 0 && poQty > 0
        ? Number((subtotal / poQty).toFixed(4))
        : Number(itemLine.unitPrice || itemLine.unit_price || itemLine.rate || pol?.rate || 0);
      const amount = Number((qty * effectiveRate).toFixed(2));

      const itemId = itemLine.itemId || itemLine.item_id || itemLine.item?.id;
      const uomId = itemLine.uom_id || itemLine.item?.uom_id || 1;

      if (!itemId) {
        throw new Error(`Missing item_id for GRN Line ID: ${itemLine.id}`);
      }

      const rawLocationId = itemLine.locationId || itemLine.location_id || (grn as any).locationId || (grn as any).location_id || (grn as any).city_id;
      let locationName: string | undefined = undefined;
      if (rawLocationId) {
        const city = await CityMaster.findByPk(rawLocationId, { transaction });
        if (city) {
          locationName = city.city_name || (city as any).name;
        } else {
          locationName = String(rawLocationId);
        }
      }

      // Execute inventory addition via InventoryCount model static method
      await InventoryCount.updateInventory(
        {
          item_id: itemId,
          qty,
          uom_id: uomId,
          rate: effectiveRate,
          amount,
          location: locationName,
          warehouseId: warehouseId || (grn as any).warehouseId || 1,
          godownId: itemLine.godownId || (grn as any).godownId || null,
          stack: itemLine.stack || (grn as any).stackId || null,
          customer_id: null,
          lot_number: itemLine.lot_number || "GENERAL",
          CompanyId: companyId!,
          user_id: userId!,
          operation: "ADD"
        },
        transaction
      );
    }

    // Auto-update linked Purchase Order status to PARTIAL_RECEIVED / COMPLETED
    if ((grn as any).purchaseOrderId) {
      const poId = Number((grn as any).purchaseOrderId);
      await InventoryService.syncPurchaseOrderStatus(poId, companyId!, transaction);
    }
  },

  /**
   * Calculates line-by-line receipt progress and remaining open quantities for a Purchase Order
   * across all non-cancelled GRN records (including DRAFT, RECEIVED, etc.).
   */
  getPurchaseOrderReceiptSummary: async (
    poId: number,
    companyId: number,
    excludeGrnId?: number,
    transaction?: Transaction
  ) => {
    const po = await PurchaseOrderHeader.findOne({
      where: { id: poId, CompanyId: companyId },
      include: [
        {
          model: PurchaseOrderLine,
          as: "purchaseOrderLines",
          include: [
            { model: ItemMaster, as: "item" },
            { model: UOMMaster, as: "uom" }
          ]
        }
      ],
      transaction
    });

    if (!po) {
      throw new Error(`Purchase order #${poId} not found.`);
    }

    const grnWhere: any = {
      purchaseOrderId: poId,
      CompanyId: companyId,
      status: { [Op.ne]: "CANCELLED" }
    };
    if (excludeGrnId) {
      grnWhere.id = { [Op.ne]: excludeGrnId };
    }

    const existingGrns = await GRN.findAll({
      where: grnWhere,
      include: [{ model: GRNLine, as: "lineItems" }],
      transaction
    });

    const poLines = ((po as any).purchaseOrderLines || []) as any[];

    const lineSummaries = poLines.map((poLine) => {
      const lineId = Number(poLine.id);
      const itemId = Number(poLine.item_id || poLine.itemId || poLine.item?.id);
      const orderedQty = Number(poLine.quantity || 0);

      let previouslyReceivedQty = 0;
      let previouslyAcceptedQty = 0;
      let previouslyRejectedQty = 0;

      for (const g of existingGrns) {
        const glines = (g as any).lineItems || [];
        for (const gl of glines) {
          const glPoLineId = gl.purchaseOrderLineId ? Number(gl.purchaseOrderLineId) : null;
          const glItemId = Number(gl.itemId || gl.item_id);

          if ((glPoLineId && glPoLineId === lineId) || (!glPoLineId && glItemId === itemId)) {
            previouslyReceivedQty += Number(gl.receivedQty || 0);
            previouslyAcceptedQty += Number(gl.acceptedQty || 0);
            previouslyRejectedQty += Number(gl.rejectedQty || 0);
          }
        }
      }

      const remainingQty = Math.max(0, orderedQty - previouslyReceivedQty);

      return {
        purchaseOrderLineId: lineId,
        itemId,
        item: poLine.item,
        uom: poLine.uom,
        uom_id: poLine.uom_id,
        orderedQty,
        previouslyReceivedQty,
        previouslyAcceptedQty,
        previouslyRejectedQty,
        remainingQty,
        isFullyReceived: remainingQty === 0
      };
    });

    const totalOrderedQty = lineSummaries.reduce((sum, l) => sum + l.orderedQty, 0);
    const totalReceivedQty = lineSummaries.reduce((sum, l) => sum + l.previouslyReceivedQty, 0);
    const totalRemainingQty = lineSummaries.reduce((sum, l) => sum + l.remainingQty, 0);
    const isFullyReceived = lineSummaries.length > 0 && lineSummaries.every((l) => l.isFullyReceived);

    return {
      purchaseOrder: po,
      lineSummaries,
      totalOrderedQty,
      totalReceivedQty,
      totalRemainingQty,
      isFullyReceived
    };
  },

  /**
   * Syncs Purchase Order status based on full P2P cycle progression (Receipts, Billing, Payment)
   */
  syncPurchaseOrderStatus: async (
    poId: number,
    companyId: number,
    transaction?: Transaction
  ) => {
    const po = await PurchaseOrderHeader.findOne({
      where: { id: poId, CompanyId: companyId },
      transaction
    });

    if (!po) return;

    const currentNormStatus = normalizePurchaseOrderStatus(po.status);
    if (currentNormStatus === "CANCELLED" || currentNormStatus === "REJECTED") {
      return;
    }

    // Get cumulative receipt summary from GRN
    const receiptSummary = await InventoryService.getPurchaseOrderReceiptSummary(poId, companyId, undefined, transaction);
    const totalOrderedQty = Number(receiptSummary.totalOrderedQty || 0);
    const totalReceivedQty = Number(receiptSummary.totalReceivedQty || 0);
    const isFullyReceived = receiptSummary.isFullyReceived;

    // Check for any non-cancelled GRNs linked to this PO
    const allGrns = await GRN.findAll({
      where: { purchaseOrderId: poId, CompanyId: companyId, status: { [Op.ne]: "CANCELLED" } } as any,
      attributes: ["id", "status"],
      transaction
    });
    const hasAnyGrn = allGrns.length > 0;
    const grnIds = allGrns.map((g: any) => g.id);

    // Get linked invoices (direct via poHeaderId or indirect via grnHeaderId)
    const invoiceWhere: any = {
      companyId,
      status: { [Op.notIn]: ["CANCELLED", "REJECTED"] },
      [Op.or]: [
        { poHeaderId: poId },
        ...(grnIds.length > 0 ? [{ grnHeaderId: { [Op.in]: grnIds } }] : [])
      ]
    };

    const linkedInvoices = await PurchaseInvoiceHeader.findAll({
      where: invoiceWhere,
      include: [{ model: PurchaseInvoiceLine, as: "purchaseInvoiceLines" }],
      transaction
    });

    const hasAnyInvoice = linkedInvoices.length > 0;
    let totalBilledQty = 0;
    let allInvoicesPaid = linkedInvoices.length > 0;

    for (const inv of linkedInvoices) {
      if (inv.status !== "PAID") {
        allInvoicesPaid = false;
      }
      const lines = (inv as any).purchaseInvoiceLines || [];
      for (const line of lines) {
        totalBilledQty += Number(line.quantity || 0);
      }
    }

    // Determine next P2P status
    let nextStatus: string;

    if (totalReceivedQty === 0 && totalBilledQty === 0) {
      if (currentNormStatus === "PENDING_APPROVAL" || currentNormStatus === "DRAFT") {
        nextStatus = "PENDING_APPROVAL";
      } else if (hasAnyGrn) {
        nextStatus = "PENDING_RECEIPT";
      } else {
        nextStatus = currentNormStatus === "PENDING_RECEIPT" ? "PENDING_RECEIPT" : "APPROVED";
      }
    } else if (totalReceivedQty > 0 && !isFullyReceived) {
      if (totalBilledQty === 0) {
        nextStatus = "PARTIALLY_RECEIVED";
      } else if (totalBilledQty < totalOrderedQty) {
        nextStatus = "PARTIALLY_BILLED";
      } else {
        nextStatus = "FULLY_BILLED";
      }
    } else if (isFullyReceived || (totalOrderedQty > 0 && totalReceivedQty >= totalOrderedQty)) {
      if (totalBilledQty === 0) {
        nextStatus = hasAnyInvoice ? "PENDING_BILLING" : "RECEIVED";
      } else if (totalBilledQty < totalOrderedQty) {
        nextStatus = "PARTIALLY_BILLED";
      } else {
        nextStatus = allInvoicesPaid ? "CLOSED" : "FULLY_BILLED";
      }
    } else if (totalBilledQty > 0) {
      if (totalBilledQty < totalOrderedQty) {
        nextStatus = "PARTIALLY_BILLED";
      } else {
        nextStatus = allInvoicesPaid ? "CLOSED" : "FULLY_BILLED";
      }
    } else {
      nextStatus = currentNormStatus;
    }

    const normalizedStatus = normalizePurchaseOrderStatus(nextStatus);

    if (po.status !== normalizedStatus) {
      await po.update({ status: normalizedStatus }, { transaction });
    }
  },

  /**
   * Syncs Goods Receipt Note (GRN) status based on full P2P cycle progression (Receipts, Billing, Payment)
   */
  syncGRNStatus: async (
    grnId: number,
    companyId: number,
    transaction?: Transaction
  ) => {
    const grn = await GRN.findOne({
      where: { id: grnId, CompanyId: companyId },
      include: [
        { model: GRNLine, as: "lineItems" },
      ],
      transaction
    });

    if (!grn) return;

    const currentNormStatus = normalizeGRNStatus(grn.status);
    if (currentNormStatus === "CANCELLED" || currentNormStatus === "REJECTED") {
      return;
    }

    if (currentNormStatus === "PENDING_RECEIPT" || currentNormStatus === "DRAFT") {
      return;
    }

    const grnLines = ((grn as any).lineItems || []) as any[];
    const totalOrderedQty = grnLines.reduce((sum, l) => sum + Number(l.orderedQty || 0), 0);
    const totalReceivedQty = grnLines.reduce((sum, l) => {
      const q = Number(l.acceptedQty !== undefined && Number(l.acceptedQty) > 0 ? l.acceptedQty : l.receivedQty || 0);
      return sum + q;
    }, 0);
    const isPartialReceipt = totalOrderedQty > 0 && totalReceivedQty < totalOrderedQty;

    // Fetch linked invoices for this GRN
    const grnLineIds = grnLines.map((l: any) => l.id).filter(Boolean);
    const linkedInvoices = await PurchaseInvoiceHeader.findAll({
      where: {
        companyId,
        status: { [Op.notIn]: ["CANCELLED", "REJECTED"] },
        [Op.or]: [
          { grnHeaderId: grnId },
          ...(grnLineIds.length > 0 ? [{ "$purchaseInvoiceLines.grnLineId$": { [Op.in]: grnLineIds } }] : [])
        ]
      } as any,
      include: [{ model: PurchaseInvoiceLine, as: "purchaseInvoiceLines" }],
      transaction
    });

    let totalBilledQty = 0;
    let allInvoicesPaid = linkedInvoices.length > 0;

    for (const inv of linkedInvoices) {
      if (inv.status !== "PAID") {
        allInvoicesPaid = false;
      }
      const lines = (inv as any).purchaseInvoiceLines || [];
      for (const line of lines) {
        const matchesGrn = Number(inv.grnHeaderId) === Number(grnId) || (line.grnLineId && grnLineIds.includes(Number(line.grnLineId)));
        if (matchesGrn) {
          totalBilledQty += Number(line.quantity || 0);
        }
      }
    }

    let nextStatus: string;

    if (totalBilledQty === 0) {
      if (isPartialReceipt) {
        nextStatus = "PARTIALLY_RECEIVED";
      } else {
        nextStatus = "PENDING_BILLING";
      }
    } else if (totalBilledQty < totalReceivedQty) {
      if (isPartialReceipt) {
        nextStatus = "PENDING_BILLING_PARTIALLY_RECEIVED";
      } else {
        nextStatus = "PENDING_BILLING";
      }
    } else if (totalBilledQty >= totalReceivedQty && totalReceivedQty > 0) {
      if (allInvoicesPaid) {
        nextStatus = "CLOSED";
      } else {
        nextStatus = "FULLY_BILLED";
      }
    } else {
      nextStatus = currentNormStatus;
    }

    const normalizedStatus = normalizeGRNStatus(nextStatus);
    if (grn.status !== normalizedStatus) {
      await grn.update({ status: normalizedStatus as any }, { transaction });
    }

    if (grn.purchaseOrderId) {
      await InventoryService.syncPurchaseOrderStatus(grn.purchaseOrderId, companyId, transaction);
    }
  },

  /**
   * Reverses inventory stock entries for GRN cancellation / rejection
   */
  reverseStockFromGRN: async (
    grnId: number,
    warehouseId?: number,
    companyId?: number,
    userId?: number,
    transaction?: Transaction
  ) => {
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

    if (!grn) {
      throw new Error(`GRN record #${grnId} not found.`);
    }

    const grnLines = ((grn as any).lineItems || []) as any[];

    for (const itemLine of grnLines) {
      const acceptedQty = Number(itemLine.acceptedQty || 0);
      const receivedQty = Number(itemLine.receivedQty || 0);
      const qty = acceptedQty > 0 ? acceptedQty : receivedQty;

      if (qty <= 0) continue;

      const rate = Number(itemLine.purchaseOrderLine?.rate || 0);
      const itemId = itemLine.itemId || itemLine.item_id || itemLine.item?.id;
      const uomId = itemLine.uom_id || itemLine.item?.uom_id || 1;

      const rawLocationId = itemLine.locationId || itemLine.location_id || (grn as any).locationId || (grn as any).location_id || (grn as any).city_id;
      let locationName: string | undefined = undefined;
      if (rawLocationId) {
        const city = await CityMaster.findByPk(rawLocationId, { transaction });
        if (city) {
          locationName = city.city_name || (city as any).name;
        } else {
          locationName = String(rawLocationId);
        }
      }

      await InventoryCount.updateInventory(
        {
          item_id: itemId,
          qty,
          uom_id: uomId,
          rate,
          amount: qty * rate,
          location: locationName,
          warehouseId: warehouseId || (grn as any).warehouseId || 1,
          godownId: itemLine.godownId || (grn as any).godownId || null,
          stack: itemLine.stack || (grn as any).stackId || null,
          customer_id: null,
          lot_number: itemLine.lot_number || "GENERAL",
          CompanyId: companyId!,
          user_id: userId!,
          operation: "SUBTRACT"
        },
        transaction
      );
    }
  },

  /**
   * Reduces warehouse inventory balances on Purchase Return execution
   */
  /**
   * Non-reducing operation for Purchase Return Authorization (Authorization does NOT reduce stock)
   */
  reduceStockFromPurchaseReturn: async (
    returnId: number,
    companyId: number,
    userId: number,
    transaction?: Transaction
  ) => {
    // Return Authorization creates NO inventory movement
    return;
  },

  /**
   * Reduces warehouse inventory balances on Purchase Return Fulfillment execution (Physical Return)
   */
  reduceStockFromPurchaseReturnFulfillment: async (
    fulfillmentId: number,
    companyId: number,
    userId: number,
    transaction?: Transaction
  ) => {
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

    if (!fulfillment) {
      throw new Error(`Purchase return fulfillment record #${fulfillmentId} not found.`);
    }

    const lines = ((fulfillment as any).fulfillmentLines || []) as any[];

    for (const line of lines) {
      const qty = Number(line.fulfilledQty || 0);
      if (qty <= 0) continue;

      const rate = Number(line.unitPrice || 0);
      const itemId = line.itemId;
      const uomId = line.item?.uom_id || 1;

      const rawLocId = line.warehouseId || (fulfillment as any).location_id;
      let locationName: string | undefined = undefined;
      if (rawLocId) {
        const city = await CityMaster.findByPk(rawLocId, { transaction });
        if (city) {
          locationName = city.city_name || (city as any).name;
        } else {
          locationName = String(rawLocId);
        }
      }

      await InventoryCount.updateInventory(
        {
          item_id: itemId,
          qty,
          uom_id: uomId,
          rate,
          amount: qty * rate,
          location: locationName,
          warehouseId: 1,
          godownId: null,
          stack: null,
          customer_id: null,
          lot_number: line.batchNo || undefined,
          CompanyId: companyId,
          user_id: userId,
          operation: "SUBTRACT"
        },
        transaction
      );
    }
  }
};

