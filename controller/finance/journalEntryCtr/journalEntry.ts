import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";

import JournalEntryHeader from "../../../modals/finance/journalEntryHeader";
import { postJournalEntryToGL } from "../../../utils/postJournalEntryToGL";
import JournalEntryLine from "../../../modals/finance/journalEntryLine";
import { findCompanyForUser } from "../../../utils/findCompanyForUser";
import { CustomRequest } from "../../../typeRequest/customReq";
import sequelize from "../../../dbconfig/dbconfig"; // Ensure your Sequelize instance is imported
import { PurchaseInvoiceHeader } from "../../../modals/Transactions/purchase/purchaseInvoice";

// Helper function to safely compare floating-point currency numbers
const isBalanced = (debit: number, credit: number): boolean => {
  return Math.abs(debit - credit) < 0.001;
};

const JournalEntryController = {
  createJournalEntry: asyncHandler(async (req: CustomRequest, res: Response) => {
    const { entry_no, entry_date, source_id, source_name, voucher_type_id, reference_no, narration, status, lines } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not authenticated");
    }

    const company = await findCompanyForUser(req.user);
    if (!company) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized: Company not found for user");
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("At least one journal entry line is required");
    }

    const totalDebit = lines.reduce((sum: number, line: any) => sum + Number(line.debit_amount || 0), 0);
    const totalCredit = lines.reduce((sum: number, line: any) => sum + Number(line.credit_amount || 0), 0);

    if (!isBalanced(totalDebit, totalCredit)) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Debit and credit totals must match");
    }

    // Managed Sequelize Transaction
    const result = await sequelize.transaction(async (t) => {
      const entry = await JournalEntryHeader.create(
        {
          entry_no,
          entry_date,
          voucher_type_id,
          source_id,
          source_name,
          reference_no: reference_no ?? null,
          narration: narration ?? null,
          status: status || "DRAFT",
          total_debit: totalDebit,
          total_credit: totalCredit,
          CompanyId: company.id,
          user_id: userId,
          isActive: true,
        },
        { transaction: t }
      );

      const createdLines = await Promise.all(
        lines.map((line: any) =>
          JournalEntryLine.create(
            {
              journal_entry_id: entry.id,
              account_id: line.account_id,
              narration: line.narration ?? null,
              debit_amount: Number(line.debit_amount || 0),
              credit_amount: Number(line.credit_amount || 0),
              CompanyId: company.id,
              user_id: userId,
              isActive: true,
            },
            { transaction: t }
          )
        )
      );

      if (entry.status === "POSTED") {
        await postJournalEntryToGL(entry, createdLines, t);
      }

      return entry;
    });

    const populatedEntry = await JournalEntryHeader.findByPk(result.id, {
      include: [
        { association: "voucherType", attributes: ["id", "code", "name"] },
        {
          association: "lines",
          include: [{ association: "account", attributes: ["id", "account_number", "account_name"] }],
        },
      ],
    });

    res.status(StatusCodes.CREATED).json({
      message: "Journal entry created successfully",
      success: true,
      result: populatedEntry,
    });
  }),

  getJournalEntries: asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not authenticated");
    }

    const company = await findCompanyForUser(req.user);
    if (!company) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized: Company not found for user");
    }

    const entries = await JournalEntryHeader.findAll({
      where: { CompanyId: company.id },
      include: [
        { association: "voucherType", attributes: ["id", "code", "name"] },
        {
          association: "lines",
          include: [{ association: "account", attributes: ["id", "account_number", "account_name"] }],
        },
      ],
      order: [["entry_date", "DESC"], ["id", "DESC"]],
    });

    res.status(StatusCodes.OK).json({
      message: "Journal entries fetched successfully",
      success: true,
      result: entries,
    });
  }),

  getJournalEntryById: asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;
    const source = req.query.source as string;
    const userId = req.user?.id;

    if (!id || isNaN(Number(id))) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Valid source ID is required");
    }

    if (!source) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Source name is required");
    }

    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not authenticated");
    }

    const company = await findCompanyForUser(req.user);

    if (!company) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized: Company not found for user");
    }

    const entry = await JournalEntryHeader.findOne({
      where: {
        CompanyId: company.id,
        source_id: Number(id),
        source_name: source,
      },
      include: [
        {
          association: "voucherType",
          attributes: ["id", "code", "name"],
        },
        {
          association: "lines",
          include: [
            {
              association: "account",
              attributes: ["id", "account_number", "account_name"],
            },
          ],
        },
      ],
    });

    if (!entry) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Journal entry not found");
    }

    res.status(StatusCodes.OK).json({
      message: "Journal entry fetched successfully",
      success: true,
      result: entry,
    });
  }),

  updateJournalEntry: asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;
    const { entry_no, entry_date, source_id, voucher_type_id, reference_no, narration, status, lines } = req.body;
    const userId = req.user?.id;

    if (!id || isNaN(Number(id))) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Valid journal entry ID is required");
    }
    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not authenticated");
    }

    const company = await findCompanyForUser(req.user);
    if (!company) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized: Company not found for user");
    }

    const entry = await JournalEntryHeader.findOne({
      where: { id: Number(id), CompanyId: company.id },
    });

    if (!entry) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Journal entry not found");
    }

    if (entry.status === "POSTED") {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Posted entries cannot be updated");
    }

    await sequelize.transaction(async (t) => {
      if (Array.isArray(lines)) {
        const totalDebit = lines.reduce((sum: number, line: any) => sum + Number(line.debit_amount || 0), 0);
        const totalCredit = lines.reduce((sum: number, line: any) => sum + Number(line.credit_amount || 0), 0);

        if (!isBalanced(totalDebit, totalCredit)) {
          res.status(StatusCodes.BAD_REQUEST);
          throw new Error("Debit and credit totals must match");
        }

        await JournalEntryLine.destroy({ where: { journal_entry_id: entry.id }, transaction: t });

        await Promise.all(
          lines.map((line: any) =>
            JournalEntryLine.create(
              {
                journal_entry_id: entry.id,
                account_id: line.account_id,
                narration: line.narration ?? null,
                debit_amount: Number(line.debit_amount || 0),
                credit_amount: Number(line.credit_amount || 0),
                CompanyId: company.id,
                user_id: userId,
                isActive: true,
              },
              { transaction: t }
            )
          )
        );

        entry.total_debit = totalDebit;
        entry.total_credit = totalCredit;
      }

      entry.entry_no = entry_no ?? entry.entry_no;
      entry.entry_date = entry_date ?? entry.entry_date;
      entry.source_id = source_id ?? entry.source_id;
      entry.voucher_type_id = voucher_type_id ?? entry.voucher_type_id;
      entry.reference_no = reference_no ?? entry.reference_no;
      entry.narration = narration ?? entry.narration;
      entry.status = status ?? entry.status;
      entry.user_id = userId;

      await entry.save({ transaction: t });
    });

    const result = await JournalEntryHeader.findByPk(entry.id, {
      include: [
        { association: "voucherType", attributes: ["id", "code", "name"] },
        {
          association: "lines",
          include: [{ association: "account", attributes: ["id", "account_number", "account_name"] }],
        },
      ],
    });

    res.status(StatusCodes.OK).json({
      message: "Journal entry updated successfully",
      success: true,
      result,
    });
  }),

  postJournalEntry: asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!id || isNaN(Number(id))) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Valid journal entry ID is required");
    }
    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not authenticated");
    }

    const company = await findCompanyForUser(req.user);
    if (!company) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized: Company not found for user");
    }

    const entry = await JournalEntryHeader.findOne({
      where: { id: Number(id), CompanyId: company.id },
    });

    if (!entry) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Journal entry not found");
    }

    // Prevents double posting
    if (entry.status === "POSTED") {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("This journal entry has already been posted");
    }

    const lines = await JournalEntryLine.findAll({ where: { journal_entry_id: entry.id } });

    const postedEntry = await sequelize.transaction(async (t) => {
      entry.status = "POSTED";
      await entry.save({ transaction: t });
      const result = await postJournalEntryToGL(entry, lines, t);

      // Invoice Payment Reconciliation: Check if reference_no matches a Purchase Invoice Number
      if (entry.reference_no) {
        const matchingInvoice = await PurchaseInvoiceHeader.findOne({
          where: { invoiceNumber: entry.reference_no.trim(), companyId: company.id },
          transaction: t,
        });

        if (matchingInvoice) {
          const paymentAmount = Number(entry.total_debit || 0);
          const newPaidAmount = Number(matchingInvoice.paidAmount || 0) + paymentAmount;
          const newBalance = Number((matchingInvoice.totalAmount - newPaidAmount).toFixed(2));
          const newStatus = newBalance <= 0.01 ? "PAID" : "PARTIAL_PAID";

          await matchingInvoice.update(
            {
              paidAmount: newPaidAmount,
              balanceAmount: Math.max(0, newBalance),
              status: newStatus,
            },
            { transaction: t }
          );
        }
      }

      return result;
    });

    res.status(StatusCodes.OK).json({
      message: "Journal entry posted successfully",
      success: true,
      result: postedEntry,
    });
  }),

  deleteJournalEntry: asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!id || isNaN(Number(id))) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Valid journal entry ID is required");
    }
    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not authenticated");
    }

    const company = await findCompanyForUser(req.user);
    if (!company) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized: Company not found for user");
    }

    const entry = await JournalEntryHeader.findOne({
      where: { id: Number(id), CompanyId: company.id },
    });

    if (!entry) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Journal entry not found");
    }

    if (entry.status === "POSTED") {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Posted entries cannot be deleted");
    }

    await sequelize.transaction(async (t) => {
      await JournalEntryLine.destroy({ where: { journal_entry_id: entry.id }, transaction: t });
      await entry.destroy({ transaction: t });
    });

    res.status(StatusCodes.OK).json({
      message: "Journal entry deleted successfully",
      success: true,
      result: null,
    });
  }),
};

export default JournalEntryController;