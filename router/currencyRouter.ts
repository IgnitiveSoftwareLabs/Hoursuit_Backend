import express from "express";
import CurrencyController from "../controller/currencyCtr/currencyCtr";
import { createSystemLoggerMiddleware } from "../middleware/systemLoggerMiddleware";
import verifyToken from "../middleware/auth/verifyToken";

const currencyRouter = express.Router();

currencyRouter.post("/", verifyToken, createSystemLoggerMiddleware("CurrencyMaster"), CurrencyController.createCurrency);
currencyRouter.get("/get", verifyToken, CurrencyController.getCurrencies);
currencyRouter.get("/:id", verifyToken, CurrencyController.getCurrencyById);
currencyRouter.put("/:id", verifyToken, createSystemLoggerMiddleware("CurrencyMaster"), CurrencyController.updateCurrency);
currencyRouter.delete("/:id", verifyToken, createSystemLoggerMiddleware("CurrencyMaster"), CurrencyController.deleteCurrency);

export default currencyRouter;