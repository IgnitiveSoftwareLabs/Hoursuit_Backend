import express from "express";
import GRNController from "../controller/Transactions/purchase/GRNCtr/GRNCtr";
import validateGodownStack from "../middleware/validateGodownStack";
import verifyToken from "../middleware/auth/verifyToken";

const grnRouter = express.Router();

grnRouter.post("/create", verifyToken, GRNController.createGRN);
grnRouter.get("/get", verifyToken, GRNController.getAllGRN);
grnRouter.get("/:id", verifyToken, GRNController.getGRNById);
grnRouter.put("/:id", verifyToken, GRNController.updateGRN);
grnRouter.patch("/:id/status", verifyToken, GRNController.updateStatusOfGRN);
grnRouter.delete("/:id", verifyToken, GRNController.deleteGRN);

export default grnRouter;