import express from "express";

import createSystemLoggerMiddleware from "../middleware/systemLoggerMiddleware";
import WorkCategoryController from "../controller/workCatCtr/workCatCtr";
import verifyToken from "../middleware/auth/verifyToken";

const workCategoryRouter = express.Router();

workCategoryRouter.post(
  "/",
  verifyToken,
  createSystemLoggerMiddleware("WorkCategory"),
  WorkCategoryController.createWorkCategory
);
// Get all work categories for the company
workCategoryRouter.get(
  "/get",
  verifyToken,
  WorkCategoryController.getWorkCategories
);
// Get specific work category by ID (must come after other specific routes)
workCategoryRouter.get(
  "/:id",
  verifyToken,
  WorkCategoryController.getWorkCategoryById
);
// Update work category
workCategoryRouter.patch(
  "/:id",
  verifyToken,
  createSystemLoggerMiddleware("WorkCategory"),
  WorkCategoryController.updateWorkCategory
);
// Delete work category
workCategoryRouter.delete(
  "/:id",
  verifyToken,
  createSystemLoggerMiddleware("WorkCategory"),
  WorkCategoryController.deleteWorkCategory
);

export default workCategoryRouter;