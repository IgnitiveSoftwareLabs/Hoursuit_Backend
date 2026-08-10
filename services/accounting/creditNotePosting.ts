import CreditNoteHeader from "../../modals/finance/creditNoteHeader";
import CreditNoteLine from "../../modals/finance/creditNoteLine";

export const postCreditNoteToGL = async (header: CreditNoteHeader, lines: CreditNoteLine[]) => {
    // TODO: integrate with the future GL posting engine.
    // This placeholder will be used once the accounting engine is ready.
    header.posting_status = "Posted";
    header.document_status = "Posted";
    header.posting_date = new Date();
    await header.save();
    return { header, lines };
};
