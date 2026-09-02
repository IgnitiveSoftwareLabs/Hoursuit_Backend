import { Transaction } from "sequelize";
import JournalEntryHeader from "../modals/finance/journalEntryHeader";
import JournalEntryLine from "../modals/finance/journalEntryLine";
import VoucherTypeMaster from "../modals/finance/voucherType";
import { postJournalEntryToGL } from "../utils/postJournalEntryToGL"; // Adjust path as needed

export interface GLLineInput {
    account_id: number;
    debit_amount: number;
    credit_amount: number;
    narration?: string;
}

export interface PostDocumentDTO {
    companyId: number;
    userId: number;
    entryNo: string;              // Maps to entry_no
    voucherTypeId?: number;       // Maps to voucher_type_id
    voucherTypeCode?: string;     // Optional fallback when no voucher type ID exists
    sourceId?: number;            // Maps to source_id for the originating document
    sourceName?: string;          // Maps to source_name for the originating document
    referenceNo?: string;         // Maps to reference_no (e.g. GRN No, Inv No)
    narration?: string;           // Maps to header narration
    entryDate: Date;              // Maps to entry_date
    lines: GLLineInput[];
}

const inferVoucherTypeCode = (entryNo?: string, narration?: string): string | null => {
    const haystack = `${entryNo || ""} ${narration || ""}`.toUpperCase();

    if (haystack.includes("GRN")) return "GRN";
    if (haystack.includes("PURCHASE INVOICE") || haystack.includes("PURCHASE_INVOICE") || haystack.includes("INV")) return "PURCHASE_INVOICE";
    if (haystack.includes("VENDOR CREDIT") || haystack.includes("VENDOR_CREDIT") || haystack.includes("VC")) return "VENDOR_CREDIT";
    if (haystack.includes("RETURN") || haystack.includes("PRF")) return "PURCHASE_RETURN";
    if (haystack.includes("PAYMENT")) return "PAYMENT";

    return null;
};

const resolveVoucherTypeId = async (
    companyId: number,
    userId: number,
    voucherTypeId: number | undefined,
    voucherTypeCode: string | undefined,
    entryNo: string,
    narration: string | undefined,
    transaction?: Transaction
) => {
    if (voucherTypeId) {
        const existing = await VoucherTypeMaster.findByPk(voucherTypeId, { transaction });
        if (existing) return existing.id;
    }

    const candidates = new Set<string>();

    if (voucherTypeCode) {
        candidates.add(voucherTypeCode.toUpperCase().replace(/\s+/g, "_"));
    }

    const inferredCode = inferVoucherTypeCode(entryNo, narration);
    if (inferredCode) {
        candidates.add(inferredCode.toUpperCase().replace(/\s+/g, "_"));
    }

    candidates.add("GRN");
    candidates.add("PURCHASE_INVOICE");
    candidates.add("PURCHASE_RETURN");
    candidates.add("VENDOR_CREDIT");
    candidates.add("GENERAL_JOURNAL");

    for (const candidate of Array.from(candidates)) {
        const existing = await VoucherTypeMaster.findOne({
            where: { code: candidate },
            transaction,
        });

        if (existing) {
            return existing.id;
        }
    }

    const fallbackCode = Array.from(candidates)[0] || "GENERAL_JOURNAL";
    const fallbackName = fallbackCode.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

    const [voucherType] = await VoucherTypeMaster.findOrCreate({
        where: { code: fallbackCode, CompanyId: companyId },
        defaults: {
            code: fallbackCode,
            name: fallbackName,
            description: `Auto-created voucher type for ${fallbackName}`,
            CompanyId: companyId,
            user_id: userId,
            isActive: true,
        },
        transaction,
    });

    return voucherType.id;
};

export const AccountingService = {
    /**
     * Creates a Journal Entry Header and Lines, then posts them to GL Balances.
     */
    createAndPostJournalEntry: async (
        dto: PostDocumentDTO,
        transaction?: Transaction
    ) => {
        const {
            companyId,
            userId,
            entryNo,
            voucherTypeId,
            voucherTypeCode,
            sourceId,
            sourceName,
            referenceNo,
            narration,
            entryDate,
            lines,
        } = dto;

        // 1. Calculate Debit & Credit Totals
        const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit_amount || 0), 0);
        const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit_amount || 0), 0);

        const resolvedVoucherTypeId = await resolveVoucherTypeId(
            companyId,
            userId,
            voucherTypeId,
            voucherTypeCode,
            entryNo,
            narration,
            transaction
        );

        const createOptions = transaction ? { transaction } : undefined;

        // 2. Check if a JournalEntryHeader already exists for this source document
        let header = await JournalEntryHeader.findOne({
            where: {
                CompanyId: companyId,
                source_id: sourceId ?? 1,
                source_name: sourceName ?? "GRN",
            },
            transaction,
        });

        if (header) {
            // Update existing header totals and date
            await header.update(
                {
                    entry_date: entryDate,
                    voucher_type_id: resolvedVoucherTypeId,
                    reference_no: referenceNo,
                    narration: narration,
                    total_debit: totalDebit,
                    total_credit: totalCredit,
                    status: "DRAFT",
                },
                createOptions
            );

            // Remove existing lines so new lines replace them cleanly
            await JournalEntryLine.destroy({
                where: { journal_entry_id: header.id, CompanyId: companyId },
                transaction,
            });
        } else {
            // Ensure entry_no is unique per company
            let uniqueEntryNo = entryNo;
            const existingEntryNo = await JournalEntryHeader.findOne({
                where: { CompanyId: companyId, entry_no: uniqueEntryNo },
                transaction,
            });

            if (existingEntryNo) {
                uniqueEntryNo = `${entryNo}-${Date.now()}`;
            }

            header = await JournalEntryHeader.create(
                {
                    entry_no: uniqueEntryNo,
                    entry_date: entryDate,
                    voucher_type_id: resolvedVoucherTypeId,
                    reference_no: referenceNo,
                    narration: narration,
                    source_id: sourceId ?? 1,
                    source_name: sourceName ?? "GRN",
                    status: "DRAFT",
                    total_debit: totalDebit,
                    total_credit: totalCredit,
                    CompanyId: companyId,
                    user_id: userId,
                    isActive: true,
                },
                createOptions
            );
        }

        // 3. Create Lines matching the schema
        const journalLines: JournalEntryLine[] = [];
        for (const line of lines) {
            const createdLine = await JournalEntryLine.create(
                {
                    journal_entry_id: header.id,
                    account_id: line.account_id,
                    narration: line.narration || narration,
                    debit_amount: line.debit_amount,
                    credit_amount: line.credit_amount,
                    CompanyId: companyId,
                    user_id: userId,
                    isActive: true,
                },
                createOptions
            );
            journalLines.push(createdLine);
        }

        // 4. Execute GL posting
        return await postJournalEntryToGL(header, journalLines, transaction);
    },
};