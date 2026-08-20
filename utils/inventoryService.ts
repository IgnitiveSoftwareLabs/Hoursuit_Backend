import { Transaction } from "sequelize";
import GRN from "../modals/Transactions/purchase/GRN/GRNHeader";
import GRNLine from "../modals/Transactions/purchase/GRN/GRNLine";
import PurchaseOrderLine from "../modals/Transactions/purchase/purchaseOrder/purchaseOrderLine";
import PurchaseOrderHeader from "../modals/Transactions/purchase/purchaseOrder/purchaseOrderHeader";
import { PurchaseReturnHeader, PurchaseReturnLine } from "../modals/Transactions/purchase/purchaseReturn";
import PurchaseReturnFulfillmentHeader from "../modals/Transactions/purchase/purchaseReturn/purchaseReturnFulfillmentHeader";
import PurchaseReturnFulfillmentLine from "../modals/Transactions/purchase/purchaseReturn/purchaseReturnFulfillmentLine";
import ItemMaster from "../modals/masters/items/itemMaster";
import InventoryCount from "../modals/inventory/inventory";
import { normalizePurchaseOrderStatus } from "./p2pStatus";

export const InventoryService = {
  /**
   * Updates warehouse inventory balances on GRN approval or receipt
   */

    updateStockFromGRN: async (
    grnId: number,
    warehouseId: number,
    companyId: number,
    userId: number,
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

      const rate = Number(itemLine.purchaseOrderLine?.rate || 0);
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
          rate,
          amount: qty * rate,
          warehouseId: warehouseId || (grn as any).warehouseId || itemLine.warehouseId,
          godownId: itemLine.godownId || (grn as any).godownId || null,
          stack: itemLine.stack || (grn as any).stackId || null,
          customer_id: null,
          lot_number: itemLine.lot_number || "GENERAL",
          CompanyId: companyId,
          user_id: userId,
          operation: "ADD"
        },
        transaction
      );
    }

    // Auto-update linked Purchase Order status to PARTIAL_RECEIVED / COMPLETED
    if ((grn as any).purchaseOrderId) {
      const poId = Number((grn as any).purchaseOrderId);
      const po = await PurchaseOrderHeader.findByPk(poId, { transaction });
      if (po && po.status !== "CANCELLED") {
        const poLines = await PurchaseOrderLine.findAll({
          where: { purchase_order_header_id: poId, CompanyId: companyId },
          transaction,
        });

        const totalOrderedQty = poLines.reduce((sum, line) => sum + Number((line as any).quantity || 0), 0);
        const totalReceivedQty = grnLines.reduce(
          (sum, line) => sum + Number(line.acceptedQty || line.receivedQty || 0),
          0
        );

        const nextStatus = totalOrderedQty > 0 && totalReceivedQty >= totalOrderedQty
          ? "COMPLETED"
          : "PARTIAL_RECEIVED";
        const normalizedStatus = normalizePurchaseOrderStatus(nextStatus);

        if (po.status !== normalizedStatus) {
          await po.update({ status: normalizedStatus }, { transaction });
        }
      }
    }
  },

  /**
   * Reverses inventory stock entries for GRN cancellation / rejection
   */
  reverseStockFromGRN: async (
    grnId: number,
    warehouseId: number,
    companyId: number,
    userId: number,
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
          warehouseId: warehouseId || (grn as any).warehouseId || itemLine.warehouseId,
          godownId: itemLine.godownId || (grn as any).godownId || null,
          stack: itemLine.stack || (grn as any).stackId || null,
          customer_id: null,
          lot_number: itemLine.lot_number || "GENERAL",
          CompanyId: companyId,
          user_id: userId,
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

