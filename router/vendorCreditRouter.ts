import express from "express";
import VendorCreditController from "../controller/Transactions/purchase/vendorCreditCtr/vendorCreditCtr";
import verifyToken from "../middleware/auth/verifyToken";

const vendorCreditRouter = express.Router();

vendorCreditRouter.post("/create", verifyToken, VendorCreditController.createVendorCredit);
vendorCreditRouter.get("/get", verifyToken, VendorCreditController.getAllVendorCredits);
vendorCreditRouter.get("/:id", verifyToken, VendorCreditController.getVendorCreditById);

export default vendorCreditRouter;
