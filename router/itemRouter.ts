import express from "express";

import createSystemLoggerMiddleware from "../middleware/systemLoggerMiddleware";
import ItemController from "../controller/itemsCtr/itemCtr";
import verifyToken from "../middleware/auth/verifyToken";

const itemRouter = express.Router();

itemRouter.post(
  "/",
  verifyToken,
  createSystemLoggerMiddleware("ItemMaster"),
  ItemController.createItem
);
itemRouter.get("/get", verifyToken, ItemController.getItems);
itemRouter.get("/:id", verifyToken, ItemController.getItemById);
itemRouter.put("/:id", verifyToken, createSystemLoggerMiddleware("ItemMaster"), ItemController.updateItem);
itemRouter.delete("/:id", verifyToken, createSystemLoggerMiddleware("ItemMaster"), ItemController.deleteItem);

// ==================== ITEM CSV UPLOAD ROUTES ====================
// itemRouter.get(
//   "/items/csv-template",
//   verifyToken,
//   CsvUploadController.downloadItemTemplate
// );
// itemRouter.post(
//   "/items/csv-upload",
//   verifyToken,
//   createSystemLoggerMiddleware("ItemMaster"),
//   upload.single("file"),
//   CsvUploadController.uploadItemCsv
// );
// itemRouter.get(
//   "/items/uploads",
//   verifyToken,
//   CsvUploadController.listCsvUploads
// );

export default itemRouter;