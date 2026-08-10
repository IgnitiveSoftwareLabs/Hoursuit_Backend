import express from "express";

import registrationTypeController from "../controller/registrationTypeCtr/registrationType";
import verifyToken from "../middleware/auth/verifyToken";

const registrationTypeRouter = express.Router();

registrationTypeRouter.post("/create", verifyToken, registrationTypeController.createRegistrationType);
registrationTypeRouter.get("/get", verifyToken, registrationTypeController.getAllRegistrationTypes);
registrationTypeRouter.get("/:id", verifyToken, registrationTypeController.getRegistrationTypeById);
registrationTypeRouter.put("/:id", verifyToken, registrationTypeController.updateRegistrationType);
registrationTypeRouter.delete("/:id", verifyToken, registrationTypeController.deleteRegistrationType);

export default registrationTypeRouter;