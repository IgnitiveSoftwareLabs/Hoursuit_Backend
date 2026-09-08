import { Model, ModelStatic } from "sequelize";

/**
 * Generates a clean, sequential, and unique document number for any model scoped by company.
 * Format: `${prefix}-${seq.padStart(4, '0')}` (e.g. PR-0001, PRF-0001, VC-0001, VR-0001, DN-0001)
 *
 * @param model Sequelize model static
 * @param numberField Name of the document number attribute on the model
 * @param prefix Document number prefix (e.g. "PR", "PRF", "VC", "VR", "DN")
 * @param companyIdField Name of the company foreign key attribute (e.g. "companyId", "CompanyId", "company_id")
 * @param companyId Company ID
 * @param transaction Optional Sequelize transaction
 * @returns Unique sequential document number string
 */
export async function generateSequentialDocNumber(
    model: ModelStatic<Model<any, any>> | any,
    numberField: string,
    prefix: string,
    companyIdField: string,
    companyId: number,
    transaction?: any
): Promise<string> {
    const whereCount: any = {};
    if (companyId) {
        whereCount[companyIdField] = companyId;
    }

    const count = await model.count({
        where: whereCount,
        transaction,
    });

    let seq = Math.max(1, Number(count || 0) + 1);
    let docNo = `${prefix}-${String(seq).padStart(4, "0")}`;

    const whereExists: any = {
        [numberField]: docNo,
    };
    if (companyId) {
        whereExists[companyIdField] = companyId;
    }

    // Loop until we find an unused sequential number
    while (await model.findOne({ where: whereExists, transaction })) {
        seq++;
        docNo = `${prefix}-${String(seq).padStart(4, "0")}`;
        whereExists[numberField] = docNo;
    }

    return docNo;
}
