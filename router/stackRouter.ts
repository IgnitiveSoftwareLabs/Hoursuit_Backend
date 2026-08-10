import express from "express";
import StackController from "../controller/stackCtr/stackCtr";
import verifyToken from "../middleware/auth/verifyToken";

const stackRouter = express.Router();

// Create a stack (requires GodownId in body)
stackRouter.post("/create", verifyToken, StackController.createStack);

// Get all stacks under a godown
stackRouter.get("/get/:godownId", verifyToken, StackController.getStacks);

// Update a specific stack
stackRouter.put("/update/:id", verifyToken, StackController.updateStack);

// Delete a specific stack
stackRouter.delete("/delete/:id", verifyToken, StackController.deleteStack);

export default stackRouter;