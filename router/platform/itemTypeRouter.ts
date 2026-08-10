import express from "express";

import createSystemLoggerMiddleware from "../../middleware/systemLoggerMiddleware";
import ItemTypeController from "../../controller/platform/itemTypeCtr/itemType";
import verifyToken from "../../middleware/auth/verifyToken";
import { verifyPermission } from "../../middleware/permission";

const itemTypeRouter = express.Router();

itemTypeRouter.post(
    "/",
    verifyToken,
    verifyPermission("platform.itemType.create"),
    createSystemLoggerMiddleware("ItemTypeMaster"),
    ItemTypeController.createItemType
);

itemTypeRouter.get(
    "/",
    verifyToken,
    verifyPermission("platform.itemType.read"),
    ItemTypeController.getItemTypes
);

itemTypeRouter.get(
    "/:id",
    verifyToken,
    verifyPermission("platform.itemType.read"),
    ItemTypeController.getItemTypeById
);

itemTypeRouter.put(
    "/:id",
    verifyToken,
    verifyPermission("platform.itemType.update"),
    createSystemLoggerMiddleware("ItemTypeMaster"),
    ItemTypeController.updateItemType
);

itemTypeRouter.delete(
    "/:id",
    verifyToken,
    verifyPermission("platform.itemType.delete"),
    createSystemLoggerMiddleware("ItemTypeMaster"),
    ItemTypeController.deleteItemType
);

export default itemTypeRouter;