import express from "express";
import PurchaseOrderController from "../controller/Transactions/purchase/purchaseOrderCtr/purchaseOrderCtr";
import validateGodownStack from "../middleware/validateGodownStack";
import verifyToken from "../middleware/auth/verifyToken";

const purchaseOrderRouter = express.Router();

purchaseOrderRouter.post("/create", verifyToken, PurchaseOrderController.createPurchaseOrder);
purchaseOrderRouter.get("/get", verifyToken, PurchaseOrderController.getAllPurchaseOrder);
purchaseOrderRouter.get("/:id", verifyToken, PurchaseOrderController.getPurchaseOrderById);
purchaseOrderRouter.put("/:id", verifyToken, PurchaseOrderController.updatePurchaseOrder);
purchaseOrderRouter.patch("/:id/status", verifyToken, PurchaseOrderController.updateStatusOfPurchaseOrder);
purchaseOrderRouter.delete("/:id", verifyToken, PurchaseOrderController.deletePurchaseOrder);

export default purchaseOrderRouter;