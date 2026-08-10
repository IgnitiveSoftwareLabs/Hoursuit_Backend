import express from "express";

import paymentMethodController from "../controller/paymentMethodCtr/paymentMethod";
import verifyToken from "../middleware/auth/verifyToken";

const paymentMethodRouter = express.Router();

paymentMethodRouter.post("/create", verifyToken, paymentMethodController.createPaymentMethod);
paymentMethodRouter.get("/get", verifyToken, paymentMethodController.getAllPaymentMethods);
paymentMethodRouter.get("/:id", verifyToken, paymentMethodController.getPaymentMethodById);
paymentMethodRouter.put("/:id", verifyToken, paymentMethodController.updatePaymentMethod);
paymentMethodRouter.delete("/:id", verifyToken, paymentMethodController.deletePaymentMethod);

export default paymentMethodRouter;