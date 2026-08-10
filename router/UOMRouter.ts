import express from "express";

import createSystemLoggerMiddleware from "../middleware/systemLoggerMiddleware";
import UOMMasterController from "../controller/UOMCtr/UOMCtr";
import verifyToken from "../middleware/auth/verifyToken";

const uomRouter = express.Router();

uomRouter.post(
  "/",
  verifyToken,
  createSystemLoggerMiddleware("UOMMaster"),
  UOMMasterController.createUOM
);
uomRouter.get("/get", verifyToken, UOMMasterController.getUOMs);

// ==================== UOM CSV UPLOAD ROUTES ====================
// uomRouter.get(
//   "/uom/csv-template",
//   verifyToken,
//   UOMMasterController.downloadUomTemplate
// );
// uomRouter.post(
//   "/uom/csv-upload",
//   verifyToken,
//   createSystemLoggerMiddleware("UOMMaster"),
//   upload.single("file"),
//   UOMMasterController.uploadUomCsv
// );
// uomRouter.get("/uom/uploads", verifyToken, UOMMasterController.listCsvUploads);

uomRouter.get("/:id", verifyToken, UOMMasterController.getUOMById);
uomRouter.put(
  "/:id",
  verifyToken,
  createSystemLoggerMiddleware("UOMMaster"),
  UOMMasterController.updateUOM
);
uomRouter.delete(
  "/:id",
  verifyToken,
  createSystemLoggerMiddleware("UOMMaster"),
  UOMMasterController.deleteUOM
);

export default uomRouter;