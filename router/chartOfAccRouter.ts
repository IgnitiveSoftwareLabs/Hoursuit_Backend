import express from "express";

import createSystemLoggerMiddleware from "../middleware/systemLoggerMiddleware";
import ChartOfAccountController from "../controller/chartOfAccountCtr/chartOfAccount";
import verifyToken from "../middleware/auth/verifyToken";

const chartOfAccountRouter = express.Router();


chartOfAccountRouter.post(
    "/",
    verifyToken,
    createSystemLoggerMiddleware("ChartOfAccountMaster"),
    ChartOfAccountController.createChartAccount
);
chartOfAccountRouter.get(
    "/",
    verifyToken,
    ChartOfAccountController.getChartAccounts
);
chartOfAccountRouter.get(
    "/:id",
    verifyToken,
    ChartOfAccountController.getChartAccountById
);
chartOfAccountRouter.put(
    "/:id",
    verifyToken,
    createSystemLoggerMiddleware("ChartOfAccountMaster"),
    ChartOfAccountController.updateChartAccount
);
chartOfAccountRouter.delete(
    "/:id",
    verifyToken,
    createSystemLoggerMiddleware("ChartOfAccountMaster"),
    ChartOfAccountController.deleteChartAccount
);

export default chartOfAccountRouter;