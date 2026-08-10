import express from "express";
import createSystemLoggerMiddleware from "../../middleware/systemLoggerMiddleware";
import DebitNoteController from "../../controller/finance/debitNoteCtr/debitNote";
import verifyToken from "../../middleware/auth/verifyToken";
import { verifyPermission } from "../../middleware/permission";

const debitNoteRouter = express.Router();

debitNoteRouter.post(
    "/",
    verifyToken,
    verifyPermission("finance.debitNote.create"),
    createSystemLoggerMiddleware("DebitNoteHeader"),
    DebitNoteController.createDebitNote
);

debitNoteRouter.get(
    "/",
    verifyToken,
    verifyPermission("finance.debitNote.read"),
    DebitNoteController.getDebitNotes
);

debitNoteRouter.get(
    "/:id",
    verifyToken,
    verifyPermission("finance.debitNote.read"),
    DebitNoteController.getDebitNoteById
);

debitNoteRouter.put(
    "/:id",
    verifyToken,
    verifyPermission("finance.debitNote.update"),
    createSystemLoggerMiddleware("DebitNoteHeader"),
    DebitNoteController.updateDebitNote
);

debitNoteRouter.delete(
    "/:id",
    verifyToken,
    verifyPermission("finance.debitNote.delete"),
    createSystemLoggerMiddleware("DebitNoteHeader"),
    DebitNoteController.deleteDebitNote
);

export default debitNoteRouter;
