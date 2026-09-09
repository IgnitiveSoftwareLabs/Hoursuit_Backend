import express from "express";
import PurchaseOrderController from "../controller/Transactions/purchase/purchaseOrderCtr/purchaseOrderCtr";
// import validateGodownStack from "../middleware/validateGodownStack";
import verifyToken from "../middleware/auth/verifyToken";

const purchaseOrderRouter = express.Router();

purchaseOrderRouter.post("/create", verifyToken, PurchaseOrderController.createPurchaseOrder);
purchaseOrderRouter.get("/get", verifyToken, PurchaseOrderController.getAllPurchaseOrder);
purchaseOrderRouter.patch("/bulk-toggle-active", verifyToken, PurchaseOrderController.bulkToggleActivePurchaseOrder);
purchaseOrderRouter.get("/:id", verifyToken, PurchaseOrderController.getPurchaseOrderById);
purchaseOrderRouter.put("/:id", verifyToken, PurchaseOrderController.updatePurchaseOrder);
purchaseOrderRouter.patch("/:id/status", verifyToken, PurchaseOrderController.updateStatusOfPurchaseOrder);
purchaseOrderRouter.patch("/:id/toggle-active", verifyToken, PurchaseOrderController.toggleActivePurchaseOrder);
purchaseOrderRouter.delete("/:id", verifyToken, PurchaseOrderController.deletePurchaseOrder);

export default purchaseOrderRouter;