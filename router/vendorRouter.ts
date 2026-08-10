import express from "express";

import VendorController from "../controller/vendorCtr/vendorCtr";
import verifyToken from "../middleware/auth/verifyToken";

const vendorControllerRouter = express.Router();

vendorControllerRouter.post("/create", verifyToken, VendorController.createVendor);
vendorControllerRouter.get("/get", verifyToken, VendorController.getVendors);
vendorControllerRouter.get("/:id", verifyToken, VendorController.getVendorById);
vendorControllerRouter.put("/:id", verifyToken, VendorController.updateVendor);
vendorControllerRouter.delete("/:id", verifyToken, VendorController.deleteVendor);

export default vendorControllerRouter;