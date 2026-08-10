import express from "express";
import PurchaseReturnController from "../controller/Transactions/purchase/purchaseReturnCtr/purchaseReturnCtr";
import verifyToken from "../middleware/auth/verifyToken";

const purchaseReturnRouter = express.Router();

purchaseReturnRouter.post("/create", verifyToken, PurchaseReturnController.createPurchaseReturn);
purchaseReturnRouter.get("/get", verifyToken, PurchaseReturnController.getAllPurchaseReturns);
purchaseReturnRouter.get("/:id", verifyToken, PurchaseReturnController.getPurchaseReturnById);
purchaseReturnRouter.put("/:id", verifyToken, PurchaseReturnController.updatePurchaseReturn);
purchaseReturnRouter.patch("/:id/status", verifyToken, PurchaseReturnController.updatePurchaseReturnStatus);
purchaseReturnRouter.delete("/:id", verifyToken, PurchaseReturnController.deletePurchaseReturn);

export default purchaseReturnRouter;