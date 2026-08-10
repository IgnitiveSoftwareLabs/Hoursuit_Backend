import express from "express";

import createSystemLoggerMiddleware from "../middleware/systemLoggerMiddleware";
import CompanyController from "../controller/companyCtr/companyCtr";
import verifyToken from "../middleware/auth/verifyToken";
import upload from "../middleware/upload";

const companyRouter = express.Router();

companyRouter.post(
  "/create",
  verifyToken,
  createSystemLoggerMiddleware("Company"),
    upload.fields([
      { name: "License_Number", maxCount: 1 },
      { name: "Utility_Certificate", maxCount: 1 },
      { name: "Fssai_Certificate", maxCount: 1 },
    ]),
  CompanyController.createCompany
);
companyRouter.get("/get",
  verifyToken,
  createSystemLoggerMiddleware("Company"),
  CompanyController.getCompanies);

companyRouter.put(
  "/update/:id",
  verifyToken,
  createSystemLoggerMiddleware("Company"),
  CompanyController.updateCompany
);
companyRouter.delete(
  "/delete/:id",
  verifyToken,
  createSystemLoggerMiddleware("Company"),
  CompanyController.deleteCompany
);

export default companyRouter;