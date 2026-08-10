import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";

import { findCompanyForUser } from "../../utils/findCompanyForUser";
import Warehouse from "../../modals/masters/warehouse/warehouse";
import Attachment from "../../modals/attachments/attachment";
import { CustomRequest } from "../../typeRequest/customReq";
import { Op, Sequelize } from "sequelize";

interface WarehouseAttributes {
  id: number;
  name: string;
  location?: string;
  createdAt?: Date;
  updatedAt?: Date;
  licenseNumber: string;
}

const WarehouseController = {
  // Create a warehouse
  createWarehouse: asyncHandler(async (req: CustomRequest, res: Response) => {
    const { name, location, licenseNumber } = req.body;

    if (!name || typeof name !== "string") {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Name is required");
    }

    const company = await findCompanyForUser(req.user);
    if (!company) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized or invalid company");
    }

    const warehouse = await Warehouse.create({
      name,
      location,
      CompanyId: company.id,
      licenseNumber,
    });

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    if (files && Object.keys(files).length > 0) {
      const attachmentsData = [];

      for (const fieldName in files) {
        if (files[fieldName] && files[fieldName][0]) {
          const file = files[fieldName][0];
          const validTillField = `${fieldName}_validTill`;
          const validTill = req.body[validTillField];

          attachmentsData.push({
            fileName: file.originalname,
            filePath: file.path,
            mimeType: file.mimetype,
            type: fieldName,
            relatedId: warehouse.id,
            relatedType: "Warehouse",
            validTill: validTill ? new Date(validTill) : undefined,
          });
        }
      }

      if (attachmentsData.length > 0) {
        await Attachment.bulkCreate(attachmentsData);
      }
    }

    res.status(StatusCodes.CREATED).json({
      message: "Warehouse created successfully",
      success: true,
      result: warehouse,
    });
  }),

  // Get all warehouses for a company
  getWarehouses: asyncHandler(async (req: CustomRequest, res: Response) => {
    const company = await findCompanyForUser(req.user);
    if (!company) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized or invalid company");
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const search = (req.query.search as string) || "";
    const searchCondition = search
      ? {
          [Op.or]: [
            Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("name")), {
              [Op.like]: `%${search.toLowerCase()}%`,
            }),
            Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("location")), {
              [Op.like]: `%${search.toLowerCase()}%`,
            }),
          ],
        }
      : {};

    const { rows: warehouses, count: total } = await Warehouse.findAndCountAll({
      where: {
        CompanyId: company.id,
        ...searchCondition,
      },
      include:[
       { model: Attachment,
          as: "attachments",
          attributes: ["id", "fileName", "filePath", "mimeType", "type", "validTill"],
          where: { relatedType: "Warehouse" },
          required: false
        }
      ],
      offset,
      limit,
      order: [["createdAt", "DESC"]],
    });

    res.status(StatusCodes.OK).json({
      message: "Warehouses fetched successfully",
      success: true,
      result: warehouses,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  }),

  // Update warehouse by ID
  updateWarehouse: asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;
    const warehouse = await Warehouse.findByPk(Number(id));

    if (!warehouse) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Warehouse not found");
    }

    const company = await findCompanyForUser(req.user);
    if (!company || warehouse.CompanyId !== company.id) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized access to this warehouse");
    }

    const { name, location, licenseNumber } = req.body;
    const updateData: Partial<WarehouseAttributes> = {};

    if (name && typeof name === "string") updateData.name = name;
    if (location && typeof location === "string") updateData.location = location;
    if (licenseNumber && typeof licenseNumber === "string") updateData.licenseNumber = licenseNumber;

    await warehouse.update(updateData);

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    if (files && Object.keys(files).length > 0) {
      for (const fieldName in files) {
        if (files[fieldName] && files[fieldName][0]) {
          // Delete previous file of the same type
          await Attachment.destroy({
            where: {
              relatedId: warehouse.id,
              relatedType: "Warehouse",
              type: fieldName,
            },
          });

          const file = files[fieldName][0];
          const validTillField = `${fieldName}_validTill`;
          const validTill = req.body[validTillField];

          await Attachment.create({
            fileName: file.originalname,
            filePath: file.path,
            mimeType: file.mimetype,
            type: fieldName,
            relatedId: warehouse.id,
            relatedType: "Warehouse",
            validTill: validTill ? new Date(validTill) : undefined,
          });
        }
      }
    }

    res.status(StatusCodes.OK).json({
      message: "Warehouse updated successfully",
      success: true,
      result: warehouse,
    });
  }),

  // Delete warehouse by ID
  deleteWarehouse: asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;
    const warehouse = await Warehouse.findByPk(Number(id));

    if (!warehouse) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Warehouse not found");
    }

    const company = await findCompanyForUser(req.user);
    if (!company || warehouse.CompanyId !== company.id) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized access to this warehouse");
    }

    await warehouse.destroy();

    res.status(StatusCodes.OK).json({
      message: "Warehouse deleted successfully",
      success: true,
      result: null,
    });
  }),
};

export default WarehouseController;