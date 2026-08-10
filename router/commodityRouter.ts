import express from "express";
import CommodityController from "../controller/commodityCtr/commodityCtr";

const commodityRouter = express.Router();

commodityRouter.post("/", CommodityController.createCommodity);
commodityRouter.get("/", CommodityController.getCommodities);
commodityRouter.get("/:id", CommodityController.getCommodityById);
commodityRouter.put("/:id", CommodityController.updateCommodity);
commodityRouter.delete("/:id", CommodityController.deleteCommodity);

export default commodityRouter;
