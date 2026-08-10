import express from "express";
import createSystemLoggerMiddleware from "../../middleware/systemLoggerMiddleware";
import VoucherTypeController from "../../controller/finance/voucherTypeCtr/voucherType";
import verifyToken from "../../middleware/auth/verifyToken";
import { verifyPermission } from "../../middleware/permission";

const voucherTypeRouter = express.Router();

voucherTypeRouter.post(
    "/",
    verifyToken,
    verifyPermission("finance.voucherType.create"),
    createSystemLoggerMiddleware("VoucherTypeMaster"),
    VoucherTypeController.createVoucherType
);

voucherTypeRouter.get(
    "/",
    verifyToken,
    verifyPermission("finance.voucherType.read"),
    VoucherTypeController.getVoucherTypes
);

voucherTypeRouter.get(
    "/:id",
    verifyToken,
    verifyPermission("finance.voucherType.read"),
    VoucherTypeController.getVoucherTypeById
);

voucherTypeRouter.put(
    "/:id",
    verifyToken,
    verifyPermission("finance.voucherType.update"),
    createSystemLoggerMiddleware("VoucherTypeMaster"),
    VoucherTypeController.updateVoucherType
);

voucherTypeRouter.delete(
    "/:id",
    verifyToken,
    verifyPermission("finance.voucherType.delete"),
    createSystemLoggerMiddleware("VoucherTypeMaster"),
    VoucherTypeController.deleteVoucherType
);

export default voucherTypeRouter;
