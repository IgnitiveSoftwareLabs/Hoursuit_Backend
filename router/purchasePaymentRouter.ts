import express from "express";
import PurchasePaymentController from "../controller/Transactions/purchase/purchasePaymentCtr/purchasePaymentCtr";
import verifyToken from "../middleware/auth/verifyToken";

const purchasePaymentRouter = express.Router();

purchasePaymentRouter.post("/create", verifyToken, PurchasePaymentController.createPurchasePayment);
purchasePaymentRouter.get("/get", verifyToken, PurchasePaymentController.getAllPurchasePayments);
purchasePaymentRouter.get("/:id", verifyToken, PurchasePaymentController.getPurchasePaymentById);
purchasePaymentRouter.put("/:id", verifyToken, PurchasePaymentController.updatePurchasePayment);
purchasePaymentRouter.patch("/:id/status", verifyToken, PurchasePaymentController.updatePurchasePaymentStatus);
purchasePaymentRouter.delete("/:id", verifyToken, PurchasePaymentController.deletePurchasePayment);

export default purchasePaymentRouter;
