import express from "express";

import { createSystemLoggerMiddleware } from "../middleware/systemLoggerMiddleware";
import CityMasterController from "../controller/cityCtr/cityCtr";
import verifyToken from "../middleware/auth/verifyToken";

const cityRouter = express.Router();

cityRouter.post("/", verifyToken, createSystemLoggerMiddleware("CityMaster"), CityMasterController.createCity);
cityRouter.get("/get", CityMasterController.getAllCities);
cityRouter.get("/:id", createSystemLoggerMiddleware("CityMaster"), CityMasterController.getCityById);
cityRouter.put("/:id", createSystemLoggerMiddleware("CityMaster"), CityMasterController.updateCity);
cityRouter.delete("/:id", createSystemLoggerMiddleware("CityMaster"), CityMasterController.deleteCity);
export default cityRouter;
