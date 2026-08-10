import express from "express";

import { createSystemLoggerMiddleware } from "../middleware/systemLoggerMiddleware";
import ServiceTypeController from "../controller/serviceTypeCtr/serviceTypeCtr";
import verifyToken from "../middleware/auth/verifyToken";

const serviceTypeRouter = express.Router();

serviceTypeRouter.post("/", verifyToken,   createSystemLoggerMiddleware("SubsidiaryMaster"), ServiceTypeController.createServiceType);
serviceTypeRouter.get("/get", verifyToken, ServiceTypeController.getServiceTypes);
serviceTypeRouter.get("/:id", verifyToken,   createSystemLoggerMiddleware("SubsidiaryMaster"), ServiceTypeController.getServiceTypeById);
serviceTypeRouter.put("/:id", verifyToken,   createSystemLoggerMiddleware("SubsidiaryMaster"), ServiceTypeController.updateServiceType);
serviceTypeRouter.delete("/:id", verifyToken,   createSystemLoggerMiddleware("SubsidiaryMaster"), ServiceTypeController.deleteServiceType);

export default serviceTypeRouter;