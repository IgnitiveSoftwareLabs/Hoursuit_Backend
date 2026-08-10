import express from "express";

import { createSystemLoggerMiddleware } from "../middleware/systemLoggerMiddleware";
import ItemGroupController from "../controller/itemGroupCtr/itemGroupCtr";
import verifyToken from "../middleware/auth/verifyToken";

const itemGroupRouter = express.Router();

itemGroupRouter.post("/create", verifyToken,   createSystemLoggerMiddleware("ItemGroupMaster"), ItemGroupController.createItemGroup);
itemGroupRouter.get("/get", verifyToken, ItemGroupController.getItemGroups);
itemGroupRouter.get("/getsingle/:id", verifyToken, createSystemLoggerMiddleware("ItemGroupMaster"), ItemGroupController.getItemGroupById);
itemGroupRouter.put("/update/:id", verifyToken, createSystemLoggerMiddleware("ItemGroupMaster"), ItemGroupController.updateItemGroup);
itemGroupRouter.delete("/delete/:id", verifyToken, createSystemLoggerMiddleware("ItemGroupMaster"), ItemGroupController.deleteItemGroup);

export default itemGroupRouter;