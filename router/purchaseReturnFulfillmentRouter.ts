import express from "express";
import PurchaseReturnFulfillmentController from "../controller/Transactions/purchase/purchaseReturnCtr/purchaseReturnFulfillmentCtr";
import verifyToken from "../middleware/auth/verifyToken";

const purchaseReturnFulfillmentRouter = express.Router();

purchaseReturnFulfillmentRouter.post("/create", verifyToken, PurchaseReturnFulfillmentController.createFulfillment);
purchaseReturnFulfillmentRouter.get("/get", verifyToken, PurchaseReturnFulfillmentController.getAllFulfillments);
purchaseReturnFulfillmentRouter.get("/export-csv", verifyToken, PurchaseReturnFulfillmentController.exportFulfillmentsCSV);
purchaseReturnFulfillmentRouter.get("/:id", verifyToken, PurchaseReturnFulfillmentController.getFulfillmentById);
purchaseReturnFulfillmentRouter.put("/:id", verifyToken, PurchaseReturnFulfillmentController.updateFulfillment);
purchaseReturnFulfillmentRouter.patch("/:id/status", verifyToken, PurchaseReturnFulfillmentController.updateFulfillmentStatus);

export default purchaseReturnFulfillmentRouter;
