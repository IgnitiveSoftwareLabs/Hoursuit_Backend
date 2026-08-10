import express from "express";

import GodownController from "../controller/godownCtr/godownCtr";
import verifyToken from "../middleware/auth/verifyToken";

const godownRouter = express.Router();

// Create a godown (requires WarehouseId in body)
godownRouter.post("/create", verifyToken, GodownController.createGodown);

// Get all godowns under a warehouse
godownRouter.get("/get/:warehouseId", verifyToken, GodownController.getGodowns);

// Update a specific godown
godownRouter.put("/update/:id", verifyToken, GodownController.updateGodown);

// Delete a specific godown
godownRouter.delete("/delete/:id", verifyToken, GodownController.deleteGodown);

export default godownRouter;