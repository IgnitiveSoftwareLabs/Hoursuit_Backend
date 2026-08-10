import express from "express";
import DeliveryChallanController from "../controller/Transactions/sales/deliveryChallan/deliveryChallan";
import validateGodownStack from "../middleware/validateGodownStack";
import verifyToken from "../middleware/auth/verifyToken";

const deliveryChallanRouter = express.Router();

deliveryChallanRouter.post("/create", verifyToken, validateGodownStack, DeliveryChallanController.createDeliveryChallan);
deliveryChallanRouter.get("/get", verifyToken, DeliveryChallanController.getAllDeliveryChallans);
deliveryChallanRouter.get("/:id", verifyToken, DeliveryChallanController.getDeliveryChallanById);
deliveryChallanRouter.put("/:id", verifyToken, validateGodownStack, DeliveryChallanController.updateDeliveryChallan);
deliveryChallanRouter.patch("/:id/status", verifyToken, DeliveryChallanController.updateDeliveryChallanStatus);
deliveryChallanRouter.delete("/:id", verifyToken, DeliveryChallanController.deleteDeliveryChallan);

export default deliveryChallanRouter;