import express from "express";
import SalesOrderController from "../controller/Transactions/sales/salesOrder/salesOrder";
import validateGodownStack from "../middleware/validateGodownStack";
import verifyToken from "../middleware/auth/verifyToken";

const salesOrderRouter = express.Router();

salesOrderRouter.post("/create", verifyToken, validateGodownStack, SalesOrderController.createSalesOrder);
salesOrderRouter.get("/get", verifyToken, SalesOrderController.getAllSalesOrders);
salesOrderRouter.get("/:id", verifyToken, SalesOrderController.getSalesOrderById);
salesOrderRouter.put("/:id", verifyToken, validateGodownStack, SalesOrderController.updateSalesOrder);
salesOrderRouter.patch("/:id/status", verifyToken, SalesOrderController.updateSalesOrderStatus);
salesOrderRouter.delete("/:id", verifyToken, SalesOrderController.deleteSalesOrder);

export default salesOrderRouter;