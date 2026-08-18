import { Transaction } from "sequelize";
import ChartOfAccountMaster from "../modals/masters/chartOfAccount/chartOfAccount";

/**
 * Dynamically resolves the account name for a given account_id by looking it up in Chart of Accounts.
 * No hardcoded strings, names, or assumptions.
 */
export const resolveAccountName = async (
    accountId: number,
    transaction?: Transaction
): Promise<string> => {
    const account = await ChartOfAccountMaster.findByPk(accountId, {
        attributes: ["id", "account_name"],
        transaction,
    });
    return account?.account_name || `Account #${accountId}`;
};
