export const normalizeOptionalNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") {
        return null;
    }
    return Number(value);
};
