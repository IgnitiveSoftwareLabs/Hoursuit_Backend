import express from "express";
import { VendorCreditController } from "../controller/Transactions/purchase/vendorCreditCtr/vendorCreditCtr";
import verifyToken from "../middleware/auth/verifyToken";

const vendorCreditRouter = express.Router();

vendorCreditRouter.post("/create", verifyToken, VendorCreditController.createVendorCredit);
vendorCreditRouter.post("/apply", verifyToken, VendorCreditController.applyVendorCreditToBills);
vendorCreditRouter.post("/apply-to-bill", verifyToken, VendorCreditController.applyCreditsToBill);
vendorCreditRouter.get("/get", verifyToken, VendorCreditController.getAllVendorCredits);
vendorCreditRouter.get("/open-bills/:vendorId", verifyToken, VendorCreditController.getOpenBillsForVendor);
vendorCreditRouter.get("/open-credits/:vendorId", verifyToken, VendorCreditController.getOpenCreditsForVendor);
vendorCreditRouter.get("/:id/applications", verifyToken, VendorCreditController.getVendorCreditApplications);
vendorCreditRouter.get("/:id", verifyToken, VendorCreditController.getVendorCreditById);
vendorCreditRouter.put("/:id", verifyToken, VendorCreditController.updateVendorCredit);
vendorCreditRouter.delete("/:id", verifyToken, VendorCreditController.deleteVendorCredit);

export default vendorCreditRouter;
