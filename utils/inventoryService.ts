import { Transaction, Op } from "sequelize";
import { GRN, GRNLine } from "../modals/Transactions/purchase/GRN";
import PurchaseOrderLine from "../modals/Transactions/purchase/purchaseOrder/purchaseOrderLine";
import PurchaseOrderHeader from "../modals/Transactions/purchase/purchaseOrder/purchaseOrderHeader";
import { PurchaseReturnHeader, PurchaseReturnLine } from "../modals/Transactions/purchase/purchaseReturn";
import PurchaseReturnFulfillmentHeader from "../modals/Transactions/purchase/purchaseReturn/purchaseReturnFulfillmentHeader";
import PurchaseReturnFulfillmentLine from "../modals/Transactions/purchase/purchaseReturn/purchaseReturnFulfillmentLine";
import ItemMaster from "../modals/masters/items/itemMaster";
import UOMMaster from "../modals/masters/UOM/UOMMaster";
import InventoryCount from "../modals/inventory/inventory";
import { normalizePurchaseOrderStatus } from "./p2pStatus";

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

      // Execute inventory addition via InventoryCount model static method
      await InventoryCount.updateInventory(
        {
          item_id: itemId,
          qty,
          uom_id: uomId,
          rate: effectiveRate,
          amount,
          warehouseId: warehouseId || (grn as any).warehouseId || itemLine.locationId || itemLine.warehouseId || 1,
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
   * Syncs Purchase Order status based on cumulative received quantities across all GRNs
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

    if (!po || po.status === "CANCELLED" || po.status === "DRAFT") {
      return;
    }

    const summary = await InventoryService.getPurchaseOrderReceiptSummary(poId, companyId, undefined, transaction);

    const nextStatus = summary.isFullyReceived
      ? "COMPLETED"
      : summary.totalReceivedQty > 0
      ? "PARTIAL_RECEIVED"
      : "APPROVED";

    const normalizedStatus = normalizePurchaseOrderStatus(nextStatus);

    if (po.status !== normalizedStatus) {
      await po.update({ status: normalizedStatus }, { transaction });
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

      await InventoryCount.updateInventory(
        {
          item_id: itemId,
          qty,
          uom_id: uomId,
          rate,
          amount: qty * rate,
          warehouseId: warehouseId || (grn as any).warehouseId || itemLine.locationId || itemLine.warehouseId || 1,
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

      await InventoryCount.updateInventory(
        {
          item_id: itemId,
          qty,
          uom_id: uomId,
          rate,
          amount: qty * rate,
          warehouseId: line.warehouseId || undefined,
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

