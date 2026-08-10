import express from "express";

import createSystemLoggerMiddleware from "../middleware/systemLoggerMiddleware";
import MisTypController from "../controller/mistTypeCtr/misTypeCtr";
import verifyToken from "../middleware/auth/verifyToken";

const misTypeRouter = express.Router();

misTypeRouter.post(
    "/",
    verifyToken,
    createSystemLoggerMiddleware("MISTypeMaster"),
    MisTypController.createMISType
);
misTypeRouter.get("/", verifyToken, MisTypController.getMISTypes);
misTypeRouter.get("/:id", verifyToken, MisTypController.getMISTypeById);
misTypeRouter.put(
    "/:id",
    verifyToken,
    createSystemLoggerMiddleware("MISTypeMaster"),
    MisTypController.updateMISType
);
misTypeRouter.delete(
    "/:id",
    verifyToken,
    createSystemLoggerMiddleware("MISTypeMaster"),
    MisTypController.deleteMISType
);

export default misTypeRouter