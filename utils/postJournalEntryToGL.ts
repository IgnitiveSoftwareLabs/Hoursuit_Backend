import { Transaction } from "sequelize";
import JournalEntryHeader from "../modals/finance/journalEntryHeader";
import JournalEntryLine from "../modals/finance/journalEntryLine";
import GLBalance from "../modals/finance/glBalance";

export const postJournalEntryToGL = async (
    entry: JournalEntryHeader,
    lines: JournalEntryLine[],
    transaction?: Transaction
) => {
    if (entry.status === "POSTED") {
        return entry;
    }

    const companyId = entry.CompanyId;

    // Use entry_date from the header schema
    const entryDate = entry.entry_date ? new Date(entry.entry_date) : new Date();
    const periodMonth = entryDate.getMonth() + 1;
    const periodYear = entryDate.getFullYear();

    for (const line of lines) {
        const lineDebit = Number(line.debit_amount || 0);
        const lineCredit = Number(line.credit_amount || 0);

        if (lineDebit === 0 && lineCredit === 0) continue;

        const [balance, created] = await GLBalance.findOrCreate({
            where: {
                CompanyId: companyId,
                account_id: line.account_id,
                period_year: periodYear,
                period_month: periodMonth,
            },
            defaults: {
                CompanyId: companyId,
                account_id: line.account_id,
                opening_balance: 0,
                debit_amount: lineDebit,
                credit_amount: lineCredit,
                closing_balance: lineDebit - lineCredit,
                period_month: periodMonth,
                period_year: periodYear,
                user_id: entry.user_id,
                isActive: true,
            },
            transaction,
        });

        if (!created) {
            const newDebit = Number(balance.debit_amount || 0) + lineDebit;
            const newCredit = Number(balance.credit_amount || 0) + lineCredit;
            const newClosing = Number(balance.opening_balance || 0) + newDebit - newCredit;

            await balance.update(
                {
                    debit_amount: newDebit,
                    credit_amount: newCredit,
                    closing_balance: newClosing,
                    user_id: entry.user_id,
                },
                { transaction }
            );
        }
    }

    entry.status = "POSTED";
    entry.postedAt = new Date();
    await entry.save({ transaction });

    return entry;
};