import express from "express";

import createSystemLoggerMiddleware from "../../middleware/systemLoggerMiddleware";
import AccountTypeController from "../../controller/platform/accountTypeCtr/accountType";
import verifyToken from "../../middleware/auth/verifyToken";
import { verifyPermission } from "../../middleware/permission";

const accountTypeRouter = express.Router();

accountTypeRouter.post(
    "/",
    verifyToken,
    verifyPermission("platform.accountType.create"),
    createSystemLoggerMiddleware("AccountTypeMaster"),
    AccountTypeController.createAccountType
);

accountTypeRouter.get(
    "/",
    verifyToken,
    verifyPermission("platform.accountType.read"),
    AccountTypeController.getAccountTypes
);

accountTypeRouter.get(
    "/:id",
    verifyToken,
    verifyPermission("platform.accountType.read"),
    AccountTypeController.getAccountTypeById
);

accountTypeRouter.put(
    "/:id",
    verifyToken,
    verifyPermission("platform.accountType.update"),
    createSystemLoggerMiddleware("AccountTypeMaster"),
    AccountTypeController.updateAccountType
);

accountTypeRouter.delete(
    "/:id",
    verifyToken,
    verifyPermission("platform.accountType.delete"),
    createSystemLoggerMiddleware("AccountTypeMaster"),
    AccountTypeController.deleteAccountType
);

export default accountTypeRouter;