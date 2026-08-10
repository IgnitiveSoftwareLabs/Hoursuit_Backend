import express from "express";

import TransportationModeController from "../controller/transportationCtr/transportationCtr";
import createSystemLoggerMiddleware from "../middleware/systemLoggerMiddleware";
import verifyToken from "../middleware/auth/verifyToken";

const transportationRouter = express.Router();

transportationRouter.post(
  "/",
  verifyToken,
  createSystemLoggerMiddleware("TransportationMode"),
  TransportationModeController.createTransportationMode
);
transportationRouter.get(
  "/get",
  verifyToken,
  TransportationModeController.getTransportationModes
);
transportationRouter.get(
  "/:id",
  verifyToken,
  TransportationModeController.getTransportationModeById
);
transportationRouter.put(
  "/:id",
  verifyToken,
  createSystemLoggerMiddleware("TransportationMode"),
  TransportationModeController.updateTransportationMode
);
transportationRouter.delete(
  "/:id",
  verifyToken,
  createSystemLoggerMiddleware("TransportationMode"),
  TransportationModeController.deleteTransportationMode
);

export default transportationRouter;