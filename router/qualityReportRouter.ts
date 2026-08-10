import express from "express";
import QualityReportController from "../controller/Transactions/purchase/qualityReportCtr/qualityReportCtr";
import verifyToken from "../middleware/auth/verifyToken";

const qualityReportRouter = express.Router();

qualityReportRouter.post("/create", verifyToken, QualityReportController.createQualityReport);
qualityReportRouter.get("/get", verifyToken, QualityReportController.getAllQualityReports);
qualityReportRouter.get("/:id", verifyToken, QualityReportController.getQualityReportById);
qualityReportRouter.put("/:id", verifyToken, QualityReportController.updateQualityReport);
qualityReportRouter.patch("/:id/status", verifyToken, QualityReportController.updateQualityReportStatus);
qualityReportRouter.delete("/:id", verifyToken, QualityReportController.deleteQualityReport);

export default qualityReportRouter;