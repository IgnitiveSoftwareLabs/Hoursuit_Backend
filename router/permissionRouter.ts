import express from "express";
import PermissionController from "../controller/permissionCtr/permissionCtr";
import verifyToken from "../middleware/auth/verifyToken";

const permissionRouter = express.Router();

// permissionRouter.post("/", PermissionController.createPermission);
permissionRouter.get("/get", verifyToken, PermissionController.getAllPermissions);
// permissionRouter.get("/:id", PermissionController.getPermissionById);
// permissionRouter.put("/:id", PermissionController.updatePermission);
// permissionRouter.delete("/:id", PermissionController.deletePermission);

export default permissionRouter;