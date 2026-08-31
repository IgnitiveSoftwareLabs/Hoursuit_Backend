import express from "express";

import VendorController from "../controller/vendorCtr/vendorCtr";
import verifyToken from "../middleware/auth/verifyToken";

const vendorControllerRouter = express.Router();

// Main Vendor Entity Routes
vendorControllerRouter.post("/create", verifyToken, VendorController.createVendor);
vendorControllerRouter.get("/get", verifyToken, VendorController.getVendors);
vendorControllerRouter.get("/:id", verifyToken, VendorController.getVendorById);
vendorControllerRouter.put("/:id", verifyToken, VendorController.updateVendor);
vendorControllerRouter.delete("/:id", verifyToken, VendorController.deleteVendor);

// Sublist Routes: Address Book
vendorControllerRouter.post("/:id/address", verifyToken, VendorController.addAddress);
vendorControllerRouter.put("/:id/address/:addressId", verifyToken, VendorController.updateAddress);
vendorControllerRouter.delete("/:id/address/:addressId", verifyToken, VendorController.deleteAddress);

// Sublist Routes: Subsidiary Assignments
vendorControllerRouter.post("/:id/subsidiaries", verifyToken, VendorController.assignSubsidiary);
vendorControllerRouter.delete("/:id/subsidiaries/:subsidiaryId", verifyToken, VendorController.removeSubsidiary);

export default vendorControllerRouter;