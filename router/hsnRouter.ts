import express from "express";

import { createSystemLoggerMiddleware } from "../middleware/systemLoggerMiddleware";
import HSNSACController from "../controller/HSNCtr/HSNCtr";
import verifyToken from "../middleware/auth/verifyToken";

const hsnRouter = express.Router();

hsnRouter.post("/", verifyToken,  createSystemLoggerMiddleware("HSNSACMaster"), HSNSACController.createHSNSAC);
hsnRouter.get("/get", verifyToken, HSNSACController.getHSNSACs);
hsnRouter.get("/:id", verifyToken,  createSystemLoggerMiddleware("HSNSACMaster"), HSNSACController.getHSNSACById);
hsnRouter.put("/:id", verifyToken,  createSystemLoggerMiddleware("HSNSACMaster"), HSNSACController.updateHSNSAC);
hsnRouter.delete("/:id", verifyToken,  createSystemLoggerMiddleware("HSNSACMaster"), HSNSACController.deleteHSNSAC);

export default hsnRouter;