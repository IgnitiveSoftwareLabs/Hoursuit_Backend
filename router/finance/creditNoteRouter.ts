import express from "express";
import createSystemLoggerMiddleware from "../../middleware/systemLoggerMiddleware";
import CreditNoteController from "../../controller/finance/creditNoteCtr/creditNote";
import verifyToken from "../../middleware/auth/verifyToken";
import { verifyPermission } from "../../middleware/permission";

const creditNoteRouter = express.Router();

creditNoteRouter.post(
    "/",
    verifyToken,
    verifyPermission("finance.creditNote.create"),
    createSystemLoggerMiddleware("CreditNoteHeader"),
    CreditNoteController.createCreditNote
);

creditNoteRouter.get(
    "/",
    verifyToken,
    verifyPermission("finance.creditNote.read"),
    CreditNoteController.getCreditNotes
);

creditNoteRouter.get(
    "/:id",
    verifyToken,
    verifyPermission("finance.creditNote.read"),
    CreditNoteController.getCreditNoteById
);

creditNoteRouter.put(
    "/:id",
    verifyToken,
    verifyPermission("finance.creditNote.update"),
    createSystemLoggerMiddleware("CreditNoteHeader"),
    CreditNoteController.updateCreditNote
);

creditNoteRouter.delete(
    "/:id",
    verifyToken,
    verifyPermission("finance.creditNote.delete"),
    createSystemLoggerMiddleware("CreditNoteHeader"),
    CreditNoteController.deleteCreditNote
);

export default creditNoteRouter;
