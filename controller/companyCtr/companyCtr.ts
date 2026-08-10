import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";

import { CustomRequest } from "../../typeRequest/customReq";
import Company from "../../modals/company/company";
import User from "../../modals/user/user";
// import { findCompanyForUser } from "../../utils/findCompanyForUser";
// import Attachment from "../../modals/Attachments";

const CompanyController = {
  // Create company
  createCompany: asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
      const { name, gstNumber, contactPerson, phone, address, gstEnabled } =
        req.body;

        console.log("Received company creation request with data:", req.body);
      const UserId = req.user?.id;

      if (!UserId) {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("User ID is required");
      }

      const parsedGstEnabled =
        gstEnabled === true || gstEnabled === "true";

      const company = await Company.create({
        name,
        gstNumber,
        contactPerson,
        phone,
        address,
        gstEnabled: parsedGstEnabled,
        UserId,
      });

      // const files = req.files as
      //   | { [fieldname: string]: Express.Multer.File[] }
      //   | undefined;

      // if (files && Object.keys(files).length > 0) {
      //   const attachmentsData = [];

      //   for (const fieldName in files) {
      //     if (files[fieldName] && files[fieldName][0]) {
      //       const file = files[fieldName][0];
      //       const validTillField = `${fieldName}_validTill`;
      //       const validTill = req.body[validTillField];

      //       attachmentsData.push({
      //         fileName: file.originalname,
      //         filePath: file.path,
      //         mimeType: file.mimetype,
      //         type: fieldName,
      //         relatedId: company.id,
      //         relatedType: "Company",
      //         validTill: validTill ? new Date(validTill) : undefined,
      //       });
      //     }
      //   }

      //   if (attachmentsData.length > 0) {
      //     await Attachment.bulkCreate(attachmentsData);
      //   }
      // }

      res.status(StatusCodes.CREATED).json({
        message: "Company created successfully",
        success: true,
        result: company,
      });
    } catch (error: any) {
      throw new Error(error.message);
    }
  }),

  // Get all companies of logged-in user
  getCompanies: asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const createdById = req.user?.created_by;

      // Calculate date 30 days from now for expiry checks
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const baseQuery = {
        include: [
          {
            model: User,
            as: "user",
            attributes: { exclude: ["Password", "createdAt", "updatedAt"] },
          },
          // {
          //   model: Attachment,
          //   as: "attachments",
          //   attributes: [
          //     "id",
          //     "fileName",
          //     "filePath",
          //     "mimeType",
          //     "type",
          //     "validTill",
          //   ],
          //   where: { relatedType: "Company" },
          //   required: false,
          // },
          // {
          //   model: InsuranceMaster,
          //   as: "insurances",
          //   attributes: [
          //     "id",
          //     "insurance_company_name",
          //     "amount_for_insurance",
          //     "start_date",
          //     "end_date",
          //   ],
          //   required: false,
          // },
          // {
          //   model: Warehouse,
          //   as: "warehouses",
          //   attributes: ["id", "name", "location", "licenseNumber"],
          //   include: [
          //     {
          //       model: Attachment,
          //       as: "attachments",
          //       attributes: [
          //         "id",
          //         "fileName",
          //         "filePath",
          //         "mimeType",
          //         "type",
          //         "validTill",
          //       ],
          //       where: {
          //         relatedType: "Warehouse",
          //         validTill: {
          //           [Op.ne]: null, // Only get attachments with validTill date
          //         },
          //       },
          //       required: false,
          //     },
          //   ],
          //   required: false,
          // },
        ],
      };

      // Try fetching with userId first, then fallback to createdById
      const companies =
        (await Company.findOne({
          ...baseQuery,
          where: { UserId: userId },
        })) ||
        (await Company.findOne({
          ...baseQuery,
          where: { UserId: createdById },
        }));

      if (companies) {
        // Cast companies to include associated data
        const companiesData = companies as any;

        // Filter expiring insurances (next 30 days)
        const expiringInsurances =
          companiesData.insurances?.filter((insurance: any) => {
            if (!insurance.end_date) return false;
            const endDate = new Date(insurance.end_date);
            const today = new Date();
            return endDate >= today && endDate <= thirtyDaysFromNow;
          }) || [];

        // Filter expiring warehouse attachments (next 30 days)
        const expiringWarehouseAttachments: any[] = [];
        companiesData.warehouses?.forEach((warehouse: any) => {
          const expiringAttachments =
            warehouse.attachments?.filter((attachment: any) => {
              if (!attachment.validTill) return false;
              const validTillDate = new Date(attachment.validTill);
              const today = new Date();
              return (
                validTillDate >= today && validTillDate <= thirtyDaysFromNow
              );
            }) || [];

          expiringAttachments.forEach((attachment: any) => {
            expiringWarehouseAttachments.push({
              ...attachment.toJSON(),
              warehouseName: warehouse.name,
              warehouseId: warehouse.id,
            });
          });
        });

        // Create clean result without full arrays
        const companiesJson = companiesData.toJSON();
        const { insurances, warehouses, ...cleanCompanyData } = companiesJson;

        const result = {
          ...cleanCompanyData,
          expiringInsurances,
          expiringWarehouseAttachments,
          reminderCounts: {
            insurances: expiringInsurances.length,
            warehouseAttachments: expiringWarehouseAttachments.length,
            total:
              expiringInsurances.length + expiringWarehouseAttachments.length,
          },
        };

        res.status(StatusCodes.OK).json({
          message: "Companies fetched successfully",
          success: true,
          result,
        });
      } else {
        res.status(StatusCodes.OK).json({
          message: "No companies found",
          success: true,
          result: null,
        });
      }
    } catch (error: any) {
      throw new Error(error.message);
    }
  }),

  // Update company and attachments
  updateCompany: asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const company = await Company.findByPk(id);

      if (!company || company.UserId !== req.user?.id) {
        res.status(StatusCodes.NOT_FOUND);
        throw new Error("Company not found or unauthorized");
      }

      await company.update(req.body);

      // const files = req.files as
      //   | { [fieldname: string]: Express.Multer.File[] }
      //   | undefined;

      // if (files && Object.keys(files).length > 0) {
      //   for (const fieldName in files) {
      //     if (files[fieldName] && files[fieldName][0]) {
      //       // Delete previous file of the same type
      //       await Attachment.destroy({
      //         where: {
      //           relatedId: company.id,
      //           relatedType: "Company",
      //           type: fieldName,
      //         },
      //       });

      //       const file = files[fieldName][0];
      //       const validTillField = `${fieldName}_validTill`;
      //       const validTill = req.body[validTillField];

      //       await Attachment.create({
      //         fileName: file.originalname,
      //         filePath: file.path,
      //         mimeType: file.mimetype,
      //         type: fieldName,
      //         relatedId: company.id,
      //         relatedType: "Company",
      //         validTill: validTill ? new Date(validTill) : undefined,
      //       });
      //     }
      //   }
      // }

      res.status(StatusCodes.OK).json({
        message: "Company updated successfully",
        success: true,
        result: company,
      });
    } catch (error: any) {
      throw new Error(error.message);
    }
  }),

  // Delete company
  deleteCompany: asyncHandler(async (req: CustomRequest, res: Response) => {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const company = await Company.findByPk(id);

      if (!company || company.UserId !== req.user?.id) {
        res.status(StatusCodes.NOT_FOUND);
        throw new Error("Company not found or unauthorized");
      }

      await company.destroy();

      // Optionally delete related attachments
      // await Attachment.destroy({
      //   where: {
      //     relatedId: company.id,
      //     relatedType: "Company",
      //   },
      // });

      res.status(StatusCodes.OK).json({
        message: "Company deleted successfully",
        success: true,
      });
    } catch (error: any) {
      throw new Error(error.message);
    }
  }),
};

export default CompanyController;