import express from "express";

import createSystemLoggerMiddleware from "../middleware/systemLoggerMiddleware";
import SubsidiaryController from "../controller/subsdiaryCtr/subsdiaryCtr";
import verifyToken from "../middleware/auth/verifyToken";

const subsidiaryRouter = express.Router();

subsidiaryRouter.post("/",  verifyToken, createSystemLoggerMiddleware("SubsidiaryMaster"), SubsidiaryController.createSubsidiary);
subsidiaryRouter.get("/get", verifyToken, SubsidiaryController.getSubsidiaries);
subsidiaryRouter.get("/:id", verifyToken, createSystemLoggerMiddleware("SubsidiaryMaster"), SubsidiaryController.getSubsidiaryById);
subsidiaryRouter.put("/:id", verifyToken, createSystemLoggerMiddleware("SubsidiaryMaster"), SubsidiaryController.updateSubsidiary);
subsidiaryRouter.delete("/:id", verifyToken, createSystemLoggerMiddleware("SubsidiaryMaster"), SubsidiaryController.deleteSubsidiary);

export default subsidiaryRouter;