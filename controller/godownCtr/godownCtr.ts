import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { CustomRequest } from "../../typeRequest/customReq";
import Godown from "../../modals/masters/godown/godown";
import Warehouse from "../../modals/masters/warehouse/warehouse";
import Company from "../../modals/company/company";
import Stack from "../../modals/masters/stack/stack";
import { weightConversionToKg, sizeConversionToMeters } from "../../utils/newConverison";
import { findCompanyForUser } from "../../utils/findCompanyForUser";

interface GodownAttributes {
  id: number;
  name: string;
  capacity: number;
  WarehouseId: number;
  location: string;
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

const allowedCapacityUnits = ['kg', 'tons', 'quintals', 'liters'];
const allowedSizeUnits = ['meters', 'feet', 'inches', 'centimeters'];

const GodownController = {
  createGodown: asyncHandler(async (req: CustomRequest, res: Response) => {
    const {
      name,
      capacity,
      WarehouseId,
      location,
      capacityUnit,
      length,
      breadth,
      height,
      sizeUnit,
      autoCreateStacks = false,
      stackTemplate,
    } = req.body;

    const userId = req.user?.id;

    // Auth check
    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not authenticated");
    }

    // Required validations
    if (
      !name || typeof name !== "string" ||
      !location || typeof location !== "string" ||
      isNaN(Number(capacity)) || Number(capacity) <= 0 ||
      isNaN(Number(length)) || Number(length) <= 0 ||
      isNaN(Number(breadth)) || Number(breadth) <= 0 ||
      isNaN(Number(height)) || Number(height) <= 0 ||
      !capacityUnit || !allowedCapacityUnits.includes(capacityUnit) ||
      !sizeUnit || !allowedSizeUnits.includes(sizeUnit)
    ) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("All fields are required and must be valid. Ensure units are among allowed values.");
    }

    // Check warehouse belongs to user
   const company = await findCompanyForUser(req.user);

if (!company) {
  res.status(StatusCodes.UNAUTHORIZED);
  throw new Error("Unauthorized or invalid company");
}

const warehouse = await Warehouse.findOne({
  where: {
    id: Number(WarehouseId),
    CompanyId: company.id,
  },
});


    if (!warehouse) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized or invalid warehouse");
    }

    const godown = await Godown.create({
      name,
      capacity: Number(capacity),
      WarehouseId: Number(WarehouseId),
      location,
      capacityUnit,
      length: Number(length),
      breadth: Number(breadth),
      height: Number(height),
      availableCapacity: Number(capacity), // Initialize available capacity
      availableVolume: Number(length) * Number(breadth) * Number(height), // Initialize available volume
      sizeUnit,
    });

    if (autoCreateStacks && stackTemplate) {
      const {
        capacity: stackCapacity,
        capacityUnit: stackCapacityUnit,
        length: stackLength,
        breadth: stackBreadth,
        height: stackHeight,
        sizeUnit: stackSizeUnit
      } = stackTemplate;
  
      // Validate template fields
      if (
        isNaN(Number(stackCapacity)) || Number(stackCapacity) <= 0 ||
        isNaN(Number(stackLength)) || Number(stackLength) <= 0 ||
        isNaN(Number(stackBreadth)) || Number(stackBreadth) <= 0 ||
        isNaN(Number(stackHeight)) || Number(stackHeight) <= 0 ||
        !stackCapacityUnit || !allowedCapacityUnits.includes(stackCapacityUnit) ||
        !stackSizeUnit || !allowedSizeUnits.includes(stackSizeUnit)
      ) {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("Invalid stack template data. Check capacity, size, and units.");
      }
  
      if (Number(stackCapacity) > Number(capacity)) {
        res.status(StatusCodes.BAD_REQUEST);
        throw new Error("Stack capacity cannot exceed godown capacity.");
      }
  
      const numberOfStacks = Math.floor(Number(capacity) / Number(stackCapacity));
  
      const stackPromises = [];
      for (let i = 1; i <= numberOfStacks; i++) {
        stackPromises.push(Stack.create({
          name: `Stack ${i}`,
          capacity: Number(stackCapacity),
          capacityUnit: stackCapacityUnit,
          length: Number(stackLength),
          breadth: Number(stackBreadth),
          height: Number(stackHeight),
          sizeUnit: stackSizeUnit,
          position: `Auto-${i}`,
          GodownId: godown.id,
          availableCapacity: Number(stackCapacity), // Initialize available capacity
          availableVolume: Number(stackLength) * Number(stackBreadth) * Number(stackHeight), // Initialize available volume
        }));
      }
      
      await Promise.all(stackPromises);
      // Update the godown's available capacity and volume after stack creation
      godown.availableCapacity = (godown.availableCapacity ?? 0) - numberOfStacks * Number(stackCapacity);
      godown.availableVolume = (godown.availableVolume ?? 0) - numberOfStacks * (Number(stackLength) * Number(stackBreadth) * Number(stackHeight));
      await godown.save();
    }
  
    res.status(StatusCodes.CREATED).json({
      message: "Godown created successfully",
      success: true,
      result: godown,
    });
  }),
  getGodowns: asyncHandler(async (req: CustomRequest, res: Response) => {
    const { warehouseId } = req.params;
    const userId = req.user?.id;

    if (!warehouseId || isNaN(Number(warehouseId))) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Valid WarehouseId is required");
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

const warehouse = await Warehouse.findOne({
  where: {
    id: Number(warehouseId),
    CompanyId: company.id,
  },
});


    if (!warehouse) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized or invalid warehouse");
    }

    const godowns = await Godown.findAll({
      where: { WarehouseId: Number(warehouseId) },
    });

    res.status(StatusCodes.OK).json({
      message: "Godowns fetched successfully",
      success: true,
      result: godowns,
    });
  }),

  updateGodown: asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!id || isNaN(Number(id))) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Valid godown ID is required");
    }

    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not authenticated");
    }

    const godown = await Godown.findByPk(Number(id));
    if (!godown) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Godown not found");
    }

   const company = await findCompanyForUser(req.user);

if (!company) {
  res.status(StatusCodes.UNAUTHORIZED);
  throw new Error("Unauthorized or invalid company");
}

const warehouse = await Warehouse.findOne({
  where: {
    id: Number(godown.WarehouseId),
    CompanyId: company.id,
  },
});


    if (!warehouse) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized access to this godown");
    }

    const {
      name,
      capacity,
      location,
      capacityUnit,
      length,
      breadth,
      height,
      sizeUnit,
    } = req.body;

    const updateData: Partial<GodownAttributes> = {};

    if (name && typeof name === "string") updateData.name = name;
    if (location && typeof location === "string") updateData.location = location;
    if (capacity && !isNaN(Number(capacity)) && Number(capacity) > 0) updateData.capacity = Number(capacity);
    if (length && !isNaN(Number(length)) && Number(length) > 0) updateData.length = Number(length);
    if (breadth && !isNaN(Number(breadth)) && Number(breadth) > 0) updateData.breadth = Number(breadth);
    if (height && !isNaN(Number(height)) && Number(height) > 0) updateData.height = Number(height);
    if (capacityUnit && allowedCapacityUnits.includes(capacityUnit)) updateData.capacityUnit = capacityUnit;
    if (sizeUnit && allowedSizeUnits.includes(sizeUnit)) updateData.sizeUnit = sizeUnit;
    //also need to update availableCapacity and availableVolume
     // Handle capacity and volume recalculation
  if (
    updateData.capacity !== undefined ||
    updateData.length !== undefined ||
    updateData.breadth !== undefined ||
    updateData.height !== undefined ||
    updateData.capacityUnit !== undefined ||
    updateData.sizeUnit !== undefined
  ) {
    // --- Capacity logic ---
    const oldCapacity = godown.capacity;
    const oldCapacityUnit = godown.capacityUnit;
    const newCapacity = updateData.capacity ?? oldCapacity;
    const newCapacityUnit = updateData.capacityUnit ?? oldCapacityUnit;

    const occupiedCapacityInKg =
      (oldCapacity - (godown.availableCapacity ?? 0)) * weightConversionToKg[oldCapacityUnit];
    const newCapacityInKg = newCapacity * weightConversionToKg[newCapacityUnit];

    if (newCapacityInKg < occupiedCapacityInKg) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error(
        `New capacity (${newCapacity} ${newCapacityUnit}) cannot be less than currently occupied capacity (${(occupiedCapacityInKg / weightConversionToKg[newCapacityUnit]).toFixed(2)} ${newCapacityUnit}).`
      );
    }

    updateData.availableCapacity =
      (newCapacityInKg - occupiedCapacityInKg) / weightConversionToKg[newCapacityUnit];

    // --- Volume logic ---
    const oldLength = godown.length;
    const oldBreadth = godown.breadth;
    const oldHeight = godown.height;
    const oldSizeUnit = godown.sizeUnit;

    const newLength = updateData.length ?? oldLength;
    const newBreadth = updateData.breadth ?? oldBreadth;
    const newHeight = updateData.height ?? oldHeight;
    const newSizeUnit = updateData.sizeUnit ?? oldSizeUnit;

    const oldVolumeM3 =
      (oldLength * sizeConversionToMeters[oldSizeUnit]) *
      (oldBreadth * sizeConversionToMeters[oldSizeUnit]) *
      (oldHeight * sizeConversionToMeters[oldSizeUnit]);

    const newVolumeM3 =
      (newLength * sizeConversionToMeters[newSizeUnit]) *
      (newBreadth * sizeConversionToMeters[newSizeUnit]) *
      (newHeight * sizeConversionToMeters[newSizeUnit]);

    const occupiedVolumeM3 = oldVolumeM3 -
      (godown.availableVolume ?? 0) * Math.pow(sizeConversionToMeters[oldSizeUnit], 3);

    if (newVolumeM3 < occupiedVolumeM3) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error(
        `New volume (${newVolumeM3.toFixed(2)} m³) cannot be less than currently occupied volume (${occupiedVolumeM3.toFixed(2)} m³).`
      );
    }

    const scalingFactor = Math.pow(sizeConversionToMeters[newSizeUnit], 3);
    const availableVolumeM3 = newVolumeM3 - occupiedVolumeM3;

    updateData.availableVolume = availableVolumeM3 / scalingFactor;
  }
    
    
    if (Object.keys(updateData).length === 0) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("No valid fields provided for update");
    }

    await godown.update(updateData);

    res.status(StatusCodes.OK).json({
      message: "Godown updated successfully",
      success: true,
      result: godown,
    });
  }),

  deleteGodown: asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!id || isNaN(Number(id))) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Valid godown ID is required");
    }

    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not authenticated");
    }

    const godown = await Godown.findByPk(Number(id));
    if (!godown) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Godown not found");
    }

    const company = await findCompanyForUser(req.user);

if (!company) {
  res.status(StatusCodes.UNAUTHORIZED);
  throw new Error("Unauthorized or invalid company");
}

const warehouse = await Warehouse.findOne({
  where: {
    id: Number(godown.WarehouseId),
    CompanyId: company.id,
  },
});


    if (!warehouse) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized access to this godown");
    }

    await godown.destroy();

    res.status(StatusCodes.OK).json({
      message: "Godown deleted successfully",
      success: true,
      result: null,
    });
  }),
};

export default GodownController;