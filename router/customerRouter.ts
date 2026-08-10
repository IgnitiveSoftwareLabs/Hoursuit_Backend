import express from "express";

import { createSystemLoggerMiddleware } from "../middleware/systemLoggerMiddleware";
import CustomerController from "../controller/customerCtr/customerCtr";
import verifyToken from "../middleware/auth/verifyToken";
import upload from "../middleware/upload";

const customerRouter = express.Router();

customerRouter.post(
  "/create",
  verifyToken,
  createSystemLoggerMiddleware("Customer"),
  upload.fields([
    // Farmer fields
    { name: "farmer_photo", maxCount: 1 },
    { name: "rin_pustika", maxCount: 1 },
    { name: "signature", maxCount: 1 },
    { name: "auth_letter", maxCount: 1 },
    { name: "sign_verification", maxCount: 1 },

    // Trader / Government Org
    { name: "license", maxCount: 1 },
    { name: "gst", maxCount: 1 },
    { name: "udhayam_aadhar", maxCount: 1 },

    // Seed Company / Corporate/Service Agency
    { name: "aggrement_letter", maxCount: 1 },
  ]),
  CustomerController.createCustomer
);
customerRouter.get("/get", verifyToken, CustomerController.getCustomers);
customerRouter.get("/getSingle/:id", verifyToken, CustomerController.getCustomerById);
customerRouter.put(
  "/update/:id",
  verifyToken,
  createSystemLoggerMiddleware("Customer"),
  upload.fields([
    // Farmer fields
    { name: "farmer_photo", maxCount: 1 },
    { name: "rin_pustika", maxCount: 1 },
    { name: "signature", maxCount: 1 },
    { name: "auth_letter", maxCount: 1 },
    { name: "sign_verification", maxCount: 1 },

    // Trader / Government Org
    { name: "license", maxCount: 1 },
    { name: "gst", maxCount: 1 },
    { name: "udhayam_aadhar", maxCount: 1 },

    // Seed Company / Corporate/Service Agency
    { name: "aggrement_letter", maxCount: 1 },
  ]),
  CustomerController.updateCustomer
);
customerRouter.delete(
  "/delete/:id",
  verifyToken,
  createSystemLoggerMiddleware("Customer"),
  CustomerController.deleteCustomer
);

export default customerRouter;