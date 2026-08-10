import DebitNoteHeader from "../../modals/finance/debitNoteHeader";
import DebitNoteLine from "../../modals/finance/debitNoteLine";

export const postDebitNoteToGL = async (header: DebitNoteHeader, lines: DebitNoteLine[]) => {
    // TODO: integrate with the future GL posting engine.
    // This placeholder will be used once the accounting engine is ready.
    header.posting_status = "Posted";
    header.document_status = "Posted";
    header.posting_date = new Date();
    await header.save();
    return { header, lines };
};
