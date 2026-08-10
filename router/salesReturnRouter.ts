import express from "express";
import SalesReturnController from "../controller/Transactions/sales/salesReturn/salesReturn";
import verifyToken from "../middleware/auth/verifyToken";

const salesReturnRouter = express.Router();

salesReturnRouter.post("/create", verifyToken, SalesReturnController.createSalesReturn);
salesReturnRouter.get("/get", verifyToken, SalesReturnController.getAllSalesReturns);
salesReturnRouter.get("/:id", verifyToken, SalesReturnController.getSalesReturnById);
salesReturnRouter.put("/:id", verifyToken, SalesReturnController.updateSalesReturn);
salesReturnRouter.patch("/:id/status", verifyToken, SalesReturnController.updateSalesReturnStatus);
salesReturnRouter.delete("/:id", verifyToken, SalesReturnController.deleteSalesReturn);

export default salesReturnRouter;