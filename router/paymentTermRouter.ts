import express from "express";
import verifyToken from "../middleware/auth/verifyToken";
import PaymentTermController from "../controller/paymentTermsCtr/paymentTerm";

const paymentTermRouter = express.Router();

paymentTermRouter.post("/create", verifyToken, PaymentTermController.createPaymentTerm);
paymentTermRouter.get("/get", verifyToken, PaymentTermController.getAllPaymentTerms);
paymentTermRouter.get("/:id", verifyToken, PaymentTermController.getPaymentTermById);
paymentTermRouter.put("/:id", verifyToken, PaymentTermController.updatePaymentTerm);
paymentTermRouter.delete("/:id", verifyToken, PaymentTermController.deletePaymentTerm);

export default paymentTermRouter;
