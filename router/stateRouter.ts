import express from "express";
import StateCodeController from "../controller/stateCtr/stateCtr";

const stateRouter = express.Router();

stateRouter.post("/", StateCodeController.createStateCode);
stateRouter.get("/", StateCodeController.getAllStateCodes);
stateRouter.get("/:id", StateCodeController.getStateCodeById);
stateRouter.put("/:id", StateCodeController.updateStateCode);
stateRouter.delete("/:id", StateCodeController.deleteStateCode);

export default stateRouter;
