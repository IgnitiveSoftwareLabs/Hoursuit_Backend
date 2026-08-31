import express from "express";
import ClassController from "../controller/classCtr/classCtr";
import verifyToken from "../middleware/auth/verifyToken";
import createSystemLoggerMiddleware from "../middleware/systemLoggerMiddleware";

const classRouter = express.Router();

classRouter.post(
    "/",
    verifyToken,
    createSystemLoggerMiddleware("ClassMaster"),
    ClassController.createClass
);
classRouter.get("/", verifyToken, ClassController.getClasses);
classRouter.get("/:id", verifyToken, ClassController.getClassById);
classRouter.put(
    "/:id",
    verifyToken,
    createSystemLoggerMiddleware("ClassMaster"),
    ClassController.updateClass
);
classRouter.delete(
    "/:id",
    verifyToken,
    createSystemLoggerMiddleware("ClassMaster"),
    ClassController.deleteClass
);

export default classRouter;
