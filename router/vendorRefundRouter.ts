import express from "express";
import VendorRefundController from "../controller/Transactions/purchase/vendorRefundCtr/vendorRefundCtr";
import verifyToken from "../middleware/auth/verifyToken";

const vendorRefundRouter = express.Router();

vendorRefundRouter.post("/create", verifyToken, VendorRefundController.createVendorRefund);
vendorRefundRouter.get("/get", verifyToken, VendorRefundController.getAllVendorRefunds);
vendorRefundRouter.get("/:id", verifyToken, VendorRefundController.getVendorRefundById);
vendorRefundRouter.put("/:id", verifyToken, VendorRefundController.updateVendorRefund);
vendorRefundRouter.delete("/:id", verifyToken, VendorRefundController.deleteVendorRefund);

export default vendorRefundRouter;
