import express from "express";

import createSystemLoggerMiddleware from "../middleware/systemLoggerMiddleware";
import WarehouseController from "../controller/warehouseCtr/warehouseCtr";
import verifyToken from "../middleware/auth/verifyToken";
import upload from "../middleware/upload";

const warehouseRouter = express.Router();

// Create a warehouse (body should contain CompanyId)
warehouseRouter.post(
  "/create",
  verifyToken,
  createSystemLoggerMiddleware("Warehouse"),
  upload.fields([
    { name: "License_Number", maxCount: 1 },
    { name: "Utility_Certificate", maxCount: 1 },
    { name: "Fssai_Certificate", maxCount: 1 },
  ]),
  WarehouseController.createWarehouse
);

// Get all warehouses for a specific company
warehouseRouter.get("/get", verifyToken, WarehouseController.getWarehouses);

// Update a specific warehouse
warehouseRouter.put(
  "/update/:id",
  verifyToken,
  createSystemLoggerMiddleware("Warehouse"),
  upload.fields([
    { name: "License_Number", maxCount: 1 },
    { name: "Utility_Certificate", maxCount: 1 },
    { name: "Fssai_Certificate", maxCount: 1 },
  ]),
  WarehouseController.updateWarehouse
);

// Delete a specific warehouse
warehouseRouter.delete(
  "/delete/:id",
  verifyToken,
  createSystemLoggerMiddleware("Warehouse"),
  WarehouseController.deleteWarehouse
);

export default warehouseRouter;