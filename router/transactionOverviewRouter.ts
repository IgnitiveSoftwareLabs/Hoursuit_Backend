import express from "express";
import TransactionOverviewController from "../controller/Transactions/transactionOverviewCtr/transactionOverviewCtr";
import verifyToken from "../middleware/auth/verifyToken";

const transactionOverviewRouter = express.Router();

transactionOverviewRouter.get("/summary", verifyToken, TransactionOverviewController.getTransactionSummary);
transactionOverviewRouter.get("/list", verifyToken, TransactionOverviewController.getTransactionList);

export default transactionOverviewRouter;
