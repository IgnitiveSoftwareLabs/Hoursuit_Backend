import express from "express";

import createSystemLoggerMiddleware from "../middleware/systemLoggerMiddleware";
import CategoryController from "../controller/categoryCtr/categoryCtr";
import verifyToken from "../middleware/auth/verifyToken";

const categoryRouter = express.Router();

categoryRouter.post("/", verifyToken, createSystemLoggerMiddleware("Category"), CategoryController.createCategory);
categoryRouter.get("/get", verifyToken, CategoryController.getCategories);
categoryRouter.get("/:id", verifyToken, createSystemLoggerMiddleware("Category"), CategoryController.getCategoryById);
categoryRouter.put("/:id", verifyToken, createSystemLoggerMiddleware("Category"), CategoryController.updateCategory);
categoryRouter.delete("/:id", verifyToken, createSystemLoggerMiddleware("Category"), CategoryController.deleteCategory);

export default categoryRouter;