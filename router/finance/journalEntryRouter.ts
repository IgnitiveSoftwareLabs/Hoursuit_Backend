import express from "express";
import createSystemLoggerMiddleware from "../../middleware/systemLoggerMiddleware";
import JournalEntryController from "../../controller/finance/journalEntryCtr/journalEntry";
import verifyToken from "../../middleware/auth/verifyToken";
import { verifyPermission } from "../../middleware/permission";

const journalEntryRouter = express.Router();

journalEntryRouter.post(
    "/",
    verifyToken,
    verifyPermission("finance.journalEntry.create"),
    createSystemLoggerMiddleware("JournalEntryHeader"),
    JournalEntryController.createJournalEntry
);

journalEntryRouter.get(
    "/",
    verifyToken,
    verifyPermission("finance.journalEntry.read"),
    JournalEntryController.getJournalEntries
);

journalEntryRouter.get(
    "/:id",
    verifyToken,
    verifyPermission("finance.journalEntry.read"),
    JournalEntryController.getJournalEntryById
);

journalEntryRouter.put(
    "/:id",
    verifyToken,
    verifyPermission("finance.journalEntry.update"),
    createSystemLoggerMiddleware("JournalEntryHeader"),
    JournalEntryController.updateJournalEntry
);

journalEntryRouter.post(
    "/:id/post",
    verifyToken,
    verifyPermission("finance.journalEntry.update"),
    createSystemLoggerMiddleware("JournalEntryHeader"),
    JournalEntryController.postJournalEntry
);

journalEntryRouter.delete(
    "/:id",
    verifyToken,
    verifyPermission("finance.journalEntry.delete"),
    createSystemLoggerMiddleware("JournalEntryHeader"),
    JournalEntryController.deleteJournalEntry
);

export default journalEntryRouter;
