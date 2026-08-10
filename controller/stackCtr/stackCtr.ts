import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";

import { findCompanyForUser } from "../../utils/findCompanyForUser";
import Warehouse from "../../modals/masters/warehouse/warehouse";
import { CustomRequest } from "../../typeRequest/customReq";
import Godown from "../../modals/masters/godown/godown";
import Stack from "../../modals/masters/stack/stack";
import Company from "../../modals/company/company";

interface StackAttributes {
  id: number;
  name: string;
  capacity: number;
  position?: string;
  GodownId: number;
  capacityUnit: string;
  length: number;
  breadth: number;
  height: number;
  sizeUnit: string;
  createdAt?: Date;
  updatedAt?: Date;
  availableCapacity?: number;  // Remaining load capacity
  availableVolume?: number;    // Remaining space in volume (calculated as total - used)
}

const StackController = {
  // Create stack
  createStack: asyncHandler(async (req: CustomRequest, res: Response) => {
    const { name, capacity, position, GodownId, capacityUnit, length, breadth, height, sizeUnit } = req.body;
    const userId = req.user?.id;

    if (!name || typeof name !== "string" || !capacity || isNaN(capacity) || !GodownId || isNaN(GodownId)) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Name, capacity, and valid GodownId are required");
    }

    if (position && typeof position !== "string") {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Position must be a string if provided");
    }

    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not authenticated");
    }

   
const company = await findCompanyForUser(req.user);
if (!company) {
  throw new Error("Unauthorized or invalid company");
}

const godown = await Godown.findOne({
  where: { id: Number(GodownId) },
  include: [{ model: Warehouse, as: "warehouse", where: { CompanyId: company.id },include: [{ model: Company, as: "company" }] }],
});

    if (!godown) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized or invalid godown");
    }

    if (godown.capacityUnit !== capacityUnit) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error(`Capacity unit mismatch. Godown uses '${godown.capacityUnit}'`);
    }

    if (godown.sizeUnit !== sizeUnit) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error(`Size unit mismatch. Godown uses '${godown.sizeUnit}'`);
    }

   
    const existingStacks = await Stack.findAll({ where: { GodownId: godown.id } });

    const usedCapacity = existingStacks.reduce((sum, s) => sum + s.capacity, 0);
    const usedVolume = existingStacks.reduce((sum, s) => sum + (s.length * s.breadth * s.height), 0);

    const newCapacity = Number(capacity);
    const newVolume = Number(length) * Number(breadth) * Number(height);
    const godownVolume = godown.length * godown.breadth * godown.height;

    if (newCapacity + usedCapacity > godown.capacity) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Total stack capacity exceeds godown capacity");
    }

    if (newVolume + usedVolume > godownVolume) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Total stack volume exceeds godown size");
    }

    const stack = await Stack.create({
      name,
      capacity: newCapacity,
      position,
      GodownId: Number(GodownId),
      capacityUnit,
      length,
      breadth,
      height,
      sizeUnit,
      availableCapacity: newCapacity, // Initialize available capacity
      availableVolume: newVolume, // Initialize available volume
    });
    // Update godown's available capacity and volume
    await godown.update({
      availableCapacity: (godown.availableCapacity ?? 0) - newCapacity,
      availableVolume: (godown.availableVolume ?? 0) - newVolume,
    });

    res.status(StatusCodes.CREATED).json({
      message: "Stack created successfully",
      success: true,
      result: stack,
    });
  }),

  // Get all stacks for a godown
  getStacks: asyncHandler(async (req: CustomRequest, res: Response) => {
    const { godownId } = req.params;
    const userId = req.user?.id;

    if (!godownId || isNaN(Number(godownId))) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Valid GodownId is required");
    }

    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not authenticated");
    }

    const company = await findCompanyForUser(req.user);
    if (!company) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized or invalid company");
    }

    const godown = await Godown.findOne({
      where: { id: Number(godownId) },
      include: [{ model: Warehouse, as: "warehouse", where: { CompanyId: company.id },include: [{ model: Company, as: "company" }] }],
    });
   
    if (!godown) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized or invalid godown");
    }

    const stacks = await Stack.findAll({
      where: { GodownId: Number(godownId) },
    });

    res.status(StatusCodes.OK).json({
      message: "Stacks fetched successfully",
      success: true,
      result: stacks,
    });
  }),

  // Update stack
  updateStack: asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!id || isNaN(Number(id))) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Valid stack ID is required");
    }

    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not authenticated");
    }

    const stack = await Stack.findByPk(Number(id));
    if (!stack) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Stack not found");
    }

   
    const company = await findCompanyForUser(req.user);
    if (!company) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized or invalid company");
    }
    
const godown = await Godown.findOne({
      where: { id: Number(stack.GodownId) },
      include: [{ model: Warehouse, as: "warehouse", where: { CompanyId: company.id },include: [{ model: Company, as: "company" }] }],
    });
    if (!godown) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized access to this stack");
    }

    // Extract update values or fallback
    const { name, capacity, position, capacityUnit, length, breadth, height, sizeUnit } = req.body;

    const newCapacity = capacity !== undefined ? Number(capacity) : stack.capacity;
    const newLength = length !== undefined ? Number(length) : stack.length;
    const newBreadth = breadth !== undefined ? Number(breadth) : stack.breadth;
    const newHeight = height !== undefined ? Number(height) : stack.height;
    const newVolume = newLength * newBreadth * newHeight;


    if (capacityUnit && godown.capacityUnit !== capacityUnit) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error(`Capacity unit mismatch. Godown uses '${godown.capacityUnit}'`);
    }

    if (sizeUnit && godown.sizeUnit !== sizeUnit) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error(`Size unit mismatch. Godown uses '${godown.sizeUnit}'`);
    }


    const otherStacks = await Stack.findAll({
      where: {
        GodownId: godown.id,
        id: { [Op.ne]: stack.id },
      },
    });

    const usedCapacity = otherStacks.reduce((sum, s) => sum + s.capacity, 0);
    const usedVolume = otherStacks.reduce((sum, s) => sum + (s.length * s.breadth * s.height), 0);

    const godownVolume = godown.length * godown.breadth * godown.height;

    if (newCapacity + usedCapacity > godown.capacity) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Updated stack capacity exceeds godown capacity");
    }

    if (newVolume + usedVolume > godownVolume) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Updated stack size exceeds godown size");
    }


    const updateData: Partial<StackAttributes> = {};
    if (name && typeof name === "string") updateData.name = name;
    if (!isNaN(newCapacity)) updateData.capacity = newCapacity;
    if (position && typeof position === "string") updateData.position = position;
    if (capacityUnit && typeof capacityUnit === "string") updateData.capacityUnit = capacityUnit;
    if (!isNaN(newLength)) updateData.length = newLength;
    if (!isNaN(newBreadth)) updateData.breadth = newBreadth;
    if (!isNaN(newHeight)) updateData.height = newHeight;
    if (sizeUnit && typeof sizeUnit === "string") updateData.sizeUnit = sizeUnit;
    //also we need to update availableCapacity and availableVolume
    updateData.availableCapacity = newCapacity;
    updateData.availableVolume = newVolume;
    await godown.update({
      availableCapacity: (godown.availableCapacity ?? 0) - newCapacity + (stack.availableCapacity ?? 0),
      availableVolume: (godown.availableVolume ?? 0) - newVolume + (stack.availableVolume ?? 0),
    });
    await stack.update(updateData);
   
    

    res.status(StatusCodes.OK).json({
      message: "Stack updated successfully",
      success: true,
      result: stack,
    });
  }),

  // Delete stack
  deleteStack: asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!id || isNaN(Number(id))) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Valid stack ID is required");
    }

    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not authenticated");
    }

    const stack = await Stack.findByPk(Number(id));
    if (!stack) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Stack not found");
    }


    const company = await findCompanyForUser(req.user);
    if (!company) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized access to this stack");
    }
    const godown = await Godown.findOne({
      where: { id: Number(stack.GodownId) },
      include: [{ model: Warehouse, as: "warehouse", where: { CompanyId: company.id },include: [{ model: Company, as: "company" }] }],
    });

    if (!godown) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized access to this stack");
    }

    
    // Update godown's available capacity and volume
    await godown.update({
      availableCapacity: (godown.availableCapacity ?? 0) + (stack.availableCapacity ?? 0),
      availableVolume: (godown.availableVolume ?? 0) + (stack.availableVolume ?? 0),
    });
    await stack.destroy();

    res.status(StatusCodes.OK).json({
      message: "Stack deleted successfully",
      success: true,
      result: null,
    });
  }),
};

export default StackController;