import express from "express";

import { createSystemLoggerMiddleware } from "../middleware/systemLoggerMiddleware";
import employeeController from "../controller/employeeCtr/employeeCtr";
import verifyToken from "../middleware/auth/verifyToken";

const employeeRouter = express.Router();

employeeRouter.post(
  "/create",
  verifyToken,
  createSystemLoggerMiddleware("EmployeeMaster"),
  employeeController.createEmployee
);
employeeRouter.get(
  "/get",
  verifyToken,
  employeeController.getEmployees
);
employeeRouter.get(
  "/:id",
  verifyToken,
  employeeController.getEmployeeById
);
employeeRouter.put(
  "/:id",
  verifyToken,
  createSystemLoggerMiddleware("EmployeeMaster"),
  employeeController.updateEmployee
);
employeeRouter.delete(
  "/:id",
  verifyToken,
  createSystemLoggerMiddleware("EmployeeMaster"),
  employeeController.deleteEmployee
);

export default employeeRouter;