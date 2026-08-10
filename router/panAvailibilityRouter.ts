import express from "express";

import panAvailibility from "../controller/panAvailibityCtr/panAvailibityCtr";
import verifyToken from "../middleware/auth/verifyToken";

const panAvailibilityRouter = express.Router();

panAvailibilityRouter.post("/create", verifyToken, panAvailibility.createPanAvailibility);
panAvailibilityRouter.get("/get", verifyToken, panAvailibility.getAllPanAvailibilities);
panAvailibilityRouter.get("/:id", verifyToken, panAvailibility.getPanAvailibilityById);
panAvailibilityRouter.put("/:id", verifyToken, panAvailibility.updatePanAvailibility);
panAvailibilityRouter.delete("/:id", verifyToken, panAvailibility.deletePanAvailibility);

export default panAvailibilityRouter;