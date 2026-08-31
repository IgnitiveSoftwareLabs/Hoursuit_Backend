import express from "express";
import DepartmentController from "../controller/departmentCtr/departmentCtr";
import verifyToken from "../middleware/auth/verifyToken";
import createSystemLoggerMiddleware from "../middleware/systemLoggerMiddleware";

const departmentRouter = express.Router();

departmentRouter.post(
    "/",
    verifyToken,
    createSystemLoggerMiddleware("DepartmentMaster"),
    DepartmentController.createDepartment
);
departmentRouter.get("/", verifyToken, DepartmentController.getDepartments);
departmentRouter.get("/:id", verifyToken, DepartmentController.getDepartmentById);
departmentRouter.put(
    "/:id",
    verifyToken,
    createSystemLoggerMiddleware("DepartmentMaster"),
    DepartmentController.updateDepartment
);
departmentRouter.delete(
    "/:id",
    verifyToken,
    createSystemLoggerMiddleware("DepartmentMaster"),
    DepartmentController.deleteDepartment
);

export default departmentRouter;
