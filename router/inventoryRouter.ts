import express from "express";
import InventoryController from "../controller/inventoryCtr/inventoryCtr";
import verifyToken from "../middleware/auth/verifyToken";

const inventoryRouter = express.Router();

inventoryRouter.get("/", InventoryController.getInventoryItems);
inventoryRouter.get("/get",verifyToken, InventoryController.getAllInventoryBalances);
inventoryRouter.get("/getSingle/:id",verifyToken, InventoryController.getInventoryBalanceById);
export default inventoryRouter;
