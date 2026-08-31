import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { CustomRequest } from "../../typeRequest/customReq";
import DepartmentMaster from "../../modals/masters/department/departmentMaster";
import SubsidiaryMaster from "../../modals/masters/subsidiaries/subsdiaryMaster";
import { findCompanyForUser } from "../../utils/findCompanyForUser";

const DepartmentController = {
    createDepartment: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { department_name, subsidiary_id, isActive } = req.body;
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

        const deptRecord = await DepartmentMaster.create({
            department_name,
            subsidiary_id: subsidiary_id ? Number(subsidiary_id) : null,
            CompanyId: company.id,
            user_id: userId,
            isActive: isActive !== undefined ? isActive : true,
        });

        res.status(StatusCodes.CREATED).json({
            message: "Department created successfully",
            success: true,
            result: deptRecord,
        });
    }),

    getDepartments: asyncHandler(async (req: CustomRequest, res: Response) => {
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

        const departments = await DepartmentMaster.findAll({
            where: { CompanyId: company.id },
            include: [
                { association: "company", attributes: ["id", "name"] },
                {
                    association: "subsidiary",
                    attributes: ["id", "subsidiary_name"],
                },
            ],
        });

        res.status(StatusCodes.OK).json({
            message: "Departments fetched successfully",
            success: true,
            result: departments,
        });
    }),

    getDepartmentById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid department ID is required");
        }

        const deptRecord = await DepartmentMaster.findByPk(Number(id), {
            include: [
                { association: "company", attributes: ["id", "name"] },
                {
                    association: "subsidiary",
                    attributes: ["id", "subsidiary_name"],
                },
            ],
        });

        if (!deptRecord) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Department not found");
        }

        res.status(StatusCodes.OK).json({
            message: "Department fetched successfully",
            success: true,
            result: deptRecord,
        });
    }),

    updateDepartment: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { department_name, subsidiary_id, isActive } = req.body;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid department ID is required");
        }

        const deptRecord = await DepartmentMaster.findByPk(Number(id));
        if (!deptRecord) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Department not found");
        }

        const company = await findCompanyForUser(req.user);
        if (!company || deptRecord.CompanyId !== company.id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Unauthorized: Cannot modify department for this company");
        }

        if (department_name !== undefined) deptRecord.department_name = department_name;
        if (subsidiary_id !== undefined) deptRecord.subsidiary_id = subsidiary_id ? Number(subsidiary_id) : null;
        if (isActive !== undefined) deptRecord.isActive = isActive;

        await deptRecord.save();

        res.status(StatusCodes.OK).json({
            message: "Department updated successfully",
            success: true,
            result: deptRecord,
        });
    }),

    deleteDepartment: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;

        if (!id || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Valid department ID is required");
        }

        const deptRecord = await DepartmentMaster.findByPk(Number(id));
        if (!deptRecord) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Department not found");
        }

        const company = await findCompanyForUser(req.user);
        if (!company || deptRecord.CompanyId !== company.id) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("Unauthorized: Cannot delete department for this company");
        }

        await deptRecord.destroy();

        res.status(StatusCodes.OK).json({
            message: "Department deleted successfully",
            success: true,
            result: null,
        });
    }),
};

export default DepartmentController;
