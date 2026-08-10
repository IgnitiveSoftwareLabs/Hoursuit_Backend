export interface NoteLineInput {
    quantity: number;
    rate: number;
    discount_percentage?: number;
    discount_amount?: number;
    tax_percentage?: number;
    tax_amount?: number;
}

export const calculateSubtotal = (lines: NoteLineInput[]) =>
    lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.rate || 0), 0);

export const calculateDiscount = (lines: NoteLineInput[]) =>
    lines.reduce((sum, line) => sum + Number(line.discount_amount || 0), 0);

export const calculateTax = (lines: NoteLineInput[]) =>
    lines.reduce((sum, line) => sum + Number(line.tax_amount || 0), 0);

export const calculateGrandTotal = (input: { subtotal: number; discountAmount: number; taxAmount: number; roundOff: number }) =>
    Number(input.subtotal || 0) - Number(input.discountAmount || 0) + Number(input.taxAmount || 0) + Number(input.roundOff || 0);

export const generateDocumentNumber = (prefix: string, companyId: number, date: Date = new Date()) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${companyId}-${year}${month}${day}-${random}`;
};
