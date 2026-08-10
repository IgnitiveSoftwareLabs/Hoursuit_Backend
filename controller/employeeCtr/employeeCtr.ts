import { Response } from "express";

import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op, Transaction } from "sequelize";
import bcrypt from "bcryptjs";

import SubsidiaryMaster from "../../modals/masters/subsidiaries/subsdiaryMaster";
import { findCompanyForUser } from "../../utils/findCompanyForUser";
import EmployeeMaster from "../../modals/masters/Employee/employee";
import { CustomRequest } from "../../typeRequest/customReq";
import CityMaster from "../../modals/masters/city/city";
import sequelize from "../../dbconfig/dbconfig";
import User from "../../modals/user/user";

const EmployeeMasterController = {
  //  Create new employee (with transaction)
  createEmployee: asyncHandler(async (req: CustomRequest, res: Response) => {
    const transaction: Transaction = await sequelize.transaction();
    try {
      const {
        firstName,
        lastName,
        email,
        phone,
        password,
        designation,
        city_id,
        subsidiary_id,
      } = req.body;

      const userId = req.user?.id;
      if (!userId) {
        res.status(StatusCodes.UNAUTHORIZED);
        throw new Error("User not authenticated");
      }

      const company = await findCompanyForUser(req.user);
      if (!company) {
        res.status(StatusCodes.FORBIDDEN);
        throw new Error("Unauthorized: Company not found for user");
      }

      // Check if user with email or phone exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ Email: email }, { Phone: phone }],
          company_id: company.id,
        },
        transaction,
      });

      if (existingUser) {
        res.status(StatusCodes.CONFLICT);
        throw new Error("A user with this email or phone already exists");
      }

      // Validate city
      const city = await CityMaster.findByPk(city_id, { transaction });
      if (!city) {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("City not found");
      }

      // Validate subsidiary
      let validatedSubsidiaryId: number | null = null;
      if (subsidiary_id) {
        const sub = await SubsidiaryMaster.findByPk(Number(subsidiary_id), {
          transaction,
        });
        if (!sub) {
          res.status(StatusCodes.BAD_REQUEST);
          throw new Error("Subsidiary not found");
        }
        if (sub.CompanyId !== company.id) {
          res.status(StatusCodes.FORBIDDEN);
          throw new Error(
            "Unauthorized: Subsidiary does not belong to your company"
          );
        }
        validatedSubsidiaryId = Number(subsidiary_id);
      }

      // Create User
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await User.create(
        {
          FirstName: firstName,
          LastName: lastName,
          Email: email,
          Phone: phone,
          Password: hashedPassword,
          Type: "employee",
          isActive: true,
          created_by: userId,
          company_id: company.id,
        },
        { transaction }
      );

      // Create EmployeeMaster entry
      const newEmployee = await EmployeeMaster.create(
        {
          user_id: newUser.id,
          company_id: company.id,
          city_id,
          designation,
          subsidiary_id: validatedSubsidiaryId,
          isActive: true,
        },
        { transaction }
      );

      await transaction.commit();

      res.status(StatusCodes.CREATED).json({
        message: "Employee created successfully",
        success: true,
        result: { user: newUser, employee: newEmployee },
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }),

  //  Get all employees
  getEmployees: asyncHandler(async (req: CustomRequest, res: Response) => {
    const userId = await User.findByPk(req.user?.id);
    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not authenticated");
    }

    const company = await findCompanyForUser(req.user);
    if (!company) {
      res.status(StatusCodes.FORBIDDEN);
      throw new Error("Unauthorized: Company not found for user");
    }

    let employees;
    if (userId.Type === "employee" || userId.Type === "vendor") {
      employees = await EmployeeMaster.findAll({
        where: { company_id: company.id, user_id: userId.id },
        include: [
          { model: User, as: "user", attributes: { exclude: ["Password"] } },
          { model: CityMaster, as: "city" },
          { model: SubsidiaryMaster, as: "subsidiary" },
        ],
      });
    } else {
      employees = await EmployeeMaster.findAll({
        where: { company_id: company.id },
        include: [
          { model: User, as: "user", attributes: { exclude: ["Password"] } },
          { model: CityMaster, as: "city" },
          { model: SubsidiaryMaster, as: "subsidiary" },
        ],
      });
    }

    res.status(StatusCodes.OK).json({
      message: "Employees fetched successfully",
      success: true,
      result: employees,
    });
  }),

  //  Get employee by ID
  getEmployeeById: asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!id || isNaN(Number(id))) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Valid employee ID is required");
    }

    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not authenticated");
    }

    const company = await findCompanyForUser(req.user);
    if (!company) {
      res.status(StatusCodes.FORBIDDEN);
      throw new Error("Unauthorized: Company not found for user");
    }

    const employee = await EmployeeMaster.findOne({
      where: { id: Number(id), company_id: company.id },
      include: [
        { model: User, as: "user", attributes: { exclude: ["Password"] } },
        { model: CityMaster, as: "city" },
        { model: SubsidiaryMaster, as: "subsidiary" },
      ],
    });

    if (!employee) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Employee not found");
    }

    res.status(StatusCodes.OK).json({
      message: "Employee fetched successfully",
      success: true,
      result: employee,
    });
  }),

  //  Update employee (transaction safe)
  updateEmployee: asyncHandler(async (req: CustomRequest, res: Response) => {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const {
        firstName,
        lastName,
        phone,
        designation,
        city_id,
        subsidiary_id,
        isActive,
        email,
        password,
      } = req.body;

      const userId = req.user?.id;
      if (!id || isNaN(Number(id))) {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("Valid employee ID is required");
      }

      if (!userId) {
        res.status(StatusCodes.UNAUTHORIZED);
        throw new Error("User not authenticated");
      }

      const company = await findCompanyForUser(req.user);
      if (!company) {
        res.status(StatusCodes.FORBIDDEN);
        throw new Error("Unauthorized: Company not found for user");
      }

      const employee: any = await EmployeeMaster.findOne({
        where: { id: Number(id), company_id: company.id },
        include: [{ model: User, as: "user" }],
        transaction,
      });

      if (!employee) {
        res.status(StatusCodes.NOT_FOUND);
        throw new Error("Employee not found");
      }

      // Update user
      if (firstName) employee.user.FirstName = firstName;
      if (lastName) employee.user.LastName = lastName;
      if (phone) employee.user.Phone = phone;
      if (email) employee.user.Email = email;
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        employee.user.Password = hashedPassword;
      }

      await employee.user.save({ transaction });

      // Update employee
      if (designation) employee.designation = designation;
      if (typeof isActive === "boolean") employee.isActive = isActive;
      if (city_id) employee.city_id = city_id;

      if (subsidiary_id !== undefined) {
        if (!subsidiary_id) {
          employee.subsidiary_id = null;
        } else {
          const sub = await SubsidiaryMaster.findByPk(Number(subsidiary_id), {
            transaction,
          });
          if (!sub) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Subsidiary not found");
          }
          if (sub.CompanyId !== company.id) {
            res.status(StatusCodes.FORBIDDEN);
            throw new Error("Unauthorized subsidiary");
          }
          employee.subsidiary_id = Number(subsidiary_id);
        }
      }

      await employee.save({ transaction });
      await transaction.commit();

      res.status(StatusCodes.OK).json({
        message: "Employee updated successfully",
        success: true,
        result: employee,
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }),

  //  Delete employee (transaction safe)
  deleteEmployee: asyncHandler(async (req: CustomRequest, res: Response) => {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!id || isNaN(Number(id))) {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("Valid employee ID is required");
      }

      if (!userId) {
        res.status(StatusCodes.UNAUTHORIZED);
        throw new Error("User not authenticated");
      }

      const company = await findCompanyForUser(req.user);
      if (!company) {
        res.status(StatusCodes.FORBIDDEN);
        throw new Error("Unauthorized: Company not found for user");
      }

      const employee = await EmployeeMaster.findOne({
        where: { id: Number(id), company_id: company.id },
        transaction,
      });

      if (!employee) {
        res.status(StatusCodes.NOT_FOUND);
        throw new Error("Employee not found");
      }

      const user = await User.findByPk(employee.user_id, { transaction });
      if (user) await user.destroy({ transaction });
      await employee.destroy({ transaction });

      await transaction.commit();

      res.status(StatusCodes.OK).json({
        message: "Employee deleted successfully",
        success: true,
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }),
};

export default EmployeeMasterController;