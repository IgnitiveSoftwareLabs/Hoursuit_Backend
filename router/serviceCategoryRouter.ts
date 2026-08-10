import express from "express";

import ServiceCategoryController from "../controller/serviceCatCtr/serviceCatCtr";
import createSystemLoggerMiddleware from "../middleware/systemLoggerMiddleware";
import verifyToken from "../middleware/auth/verifyToken";

const serviceCategoryRouter = express.Router();

serviceCategoryRouter.post(
  "/",
  verifyToken,
  createSystemLoggerMiddleware("ServiceCategory"),
  ServiceCategoryController.createServiceCategory
);
serviceCategoryRouter.get(
  "/get",
  verifyToken,
  ServiceCategoryController.getServiceCategories
);
serviceCategoryRouter.get(
  "/:id",
  verifyToken,
  ServiceCategoryController.getServiceCategoryById
);
serviceCategoryRouter.put(
  "/:id",
  verifyToken,
  createSystemLoggerMiddleware("ServiceCategory"),
  ServiceCategoryController.updateServiceCategory
);
serviceCategoryRouter.delete(
  "/:id",
  verifyToken,
  createSystemLoggerMiddleware("ServiceCategory"),
  ServiceCategoryController.deleteServiceCategory
);

export default serviceCategoryRouter;