import express from "express";
import PurchaseInvoiceController from "../controller/Transactions/purchase/purchaseInvoiceCtr/purchaseInvoiceCtr";
import verifyToken from "../middleware/auth/verifyToken";

const purchaseInvoiceRouter = express.Router();

purchaseInvoiceRouter.post("/create", verifyToken, PurchaseInvoiceController.createPurchaseInvoice);
purchaseInvoiceRouter.get("/get", verifyToken, PurchaseInvoiceController.getAllPurchaseInvoices);
purchaseInvoiceRouter.get("/:id", verifyToken, PurchaseInvoiceController.getPurchaseInvoiceById);
purchaseInvoiceRouter.put("/:id", verifyToken, PurchaseInvoiceController.updatePurchaseInvoice);
purchaseInvoiceRouter.patch("/:id/status", verifyToken, PurchaseInvoiceController.updatePurchaseInvoiceStatus);
purchaseInvoiceRouter.delete("/:id", verifyToken, PurchaseInvoiceController.deletePurchaseInvoice);

export default purchaseInvoiceRouter;