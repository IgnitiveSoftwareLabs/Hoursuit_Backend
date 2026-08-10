import Company from "../modals/company/company";


export const findCompanyForUser = async (user: any) => {
    const userId = user?.id;
    const createdById = user?.created_by;

    if (!userId) return null;

    const company =
        (await Company.findOne({ where: { UserId: userId } })) ||
        (await Company.findOne({ where: { UserId: createdById } }));

    return company;
};