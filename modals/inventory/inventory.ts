import { Model, DataTypes, Optional, Op } from "sequelize";
import Joi from "joi";
import sequelize from "../../dbconfig/dbconfig";
import Company from "../../modals/company/company";
import User from "../../modals/user/user";
import ItemMaster from "../masters/items/itemMaster";
import UOMMaster from "../masters/UOM/UOMMaster";
import Customer from "../../modals/masters/customer/customer";
import WorkCategory from "../masters/workCategory/workCatMaster";
import Warehouse from "../masters/warehouse/warehouse";
import Godown from "../masters/godown/godown";
import Stack from "../masters/stack/stack";

interface InventoryCountAttributes {
    id: number;
    work_order?: string;
    item_id: number;
    qty: number;
    uom_id: number;
    rate?: number;
    amount?: number;
    inventory_age?: number;
    location?: string;
    warehouseId: number;
    godownId?: number | null;
    stack?: number | null
    customer_id?: number | null;
    lot_number?: string;
    work_category_id?: number;
    CompanyId: number;
    user_id: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface InventoryCountCreationAttributes extends Optional<InventoryCountAttributes, "id"> { }

class InventoryCount extends Model<InventoryCountAttributes, InventoryCountCreationAttributes>
    implements InventoryCountAttributes {
    public id!: number;
    public work_order?: string;
    public item_id!: number;
    public qty!: number;
    public uom_id!: number;
    public rate?: number;
    public amount?: number;
    public inventory_age?: number;
    public location?: string;
    public warehouseId!: number;
    public godownId?: number | null;
    public stack?: number | null
    public customer_id?: number | null;
    public lot_number?: string;
    public work_category_id?: number;
    public CompanyId!: number;
    public user_id!: number;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    static validateInventoryCount(inventory: InventoryCountAttributes) {
        const schema = Joi.object({
            work_order: Joi.string().min(3).max(100).optional().allow(null),
            item_id: Joi.number().integer().positive().required(),
            qty: Joi.number().min(0).required(),
            uom_id: Joi.number().integer().positive().required(),
            rate: Joi.number().min(0).optional().allow(null),
            amount: Joi.number().min(0).optional().allow(null),
            inventory_age: Joi.number().optional().allow(null),
            location: Joi.string().min(1).max(200).optional().allow(null),
            customer_id: Joi.number().integer().positive().optional().allow(null),
            lot_number: Joi.string().min(1).max(100).optional().allow(null),
            warehouseId: Joi.number().integer().positive().required(),
            godownId: Joi.number().integer().positive().optional().allow(null),
            stack: Joi.number().integer().positive().optional().allow(null),
            CompanyId: Joi.number().integer().positive().required(),
            user_id: Joi.number().integer().positive().required(),
            isActive: Joi.boolean().optional(),
        });
        return schema.validate(inventory);
    }

    // Method to update or create inventory entry
    static async updateInventory(data: {
        work_order?: string;
        item_id: number;
        qty: number;
        uom_id: number;
        rate?: number;
        amount?: number;
        location?: string;
        warehouseId?: number | null;
        godownId?: number | null;
        stack?: number | null;
        work_category_id?: number | null;
        customer_id?: number | null;
        lot_number?: string;
        CompanyId: number;
        user_id: number;
        operation: 'ADD' | 'SUBTRACT';
    }, transaction?: any) {
        const {
            work_order,
            item_id,
            qty,
            uom_id,
            rate,
            amount,
            location,
            warehouseId,
            godownId,
            stack,
            work_category_id,
            customer_id,
            lot_number,
            CompanyId,
            user_id,
            operation
        } = data;

        // Build the where clause, handling null values properly
        const whereClause: any = {
            item_id,
            uom_id,
            CompanyId,
            isActive: true
        };

        if (customer_id !== undefined) {
            whereClause.customer_id = customer_id;
        } else {
            whereClause.customer_id = null;
        }

        // Add optional fields only if they are not null/undefined
        if (work_order !== null && work_order !== undefined) {
            whereClause.work_order = work_order;
        } else {
            whereClause.work_order = null;
        }

        if (lot_number !== null && lot_number !== undefined) {
            whereClause.lot_number = lot_number;
        } else {
            whereClause.lot_number = null;
        }

        if (warehouseId !== null && warehouseId !== undefined) {
            whereClause.warehouseId = warehouseId;
        } else {
            whereClause.warehouseId = null;
        }

        if (godownId !== null && godownId !== undefined) {
            whereClause.godownId = godownId;
        } else {
            whereClause.godownId = null;
        }

        if (stack !== null && stack !== undefined) {
            whereClause.stack = stack;
        } else {
            whereClause.stack = null;
        }

        // Handle optional work_category_id
        if (work_category_id !== null && work_category_id !== undefined) {
            whereClause.work_category_id = work_category_id;
        } else {
            whereClause.work_category_id = null;
        }

        // Handle optional material_status_id


        // Include rate in matching criteria: inventory entries with different rates should be separate rows
        if (rate !== null && rate !== undefined) {
            // Normalize to number for comparison since DB stores decimal
            whereClause.rate = Number(rate);
        } else {
            whereClause.rate = null;
        }

        // Find existing inventory entry
        const existingInventory = await InventoryCount.findOne({
            where: whereClause,
            ...(transaction ? { transaction } : {})
        });

        if (operation === 'SUBTRACT') {
            let targetInventory = existingInventory;

            // If exact match doesn't exist or has insufficient quantity, find candidate inventory records
            if (!targetInventory || Number(targetInventory.qty) < Number(qty)) {
                let candidates: InventoryCount[] = [];

                // Candidate search 1: Same item, company, and warehouse (if provided)
                const searchWhere: any = { item_id, CompanyId, isActive: true };
                if (warehouseId !== null && warehouseId !== undefined) {
                    searchWhere.warehouseId = warehouseId;
                }
                candidates = await InventoryCount.findAll({
                    where: searchWhere,
                    order: [['qty', 'DESC']],
                    ...(transaction ? { transaction } : {})
                });

                // Candidate search 2: Same item and company across any warehouse
                if (candidates.length === 0) {
                    candidates = await InventoryCount.findAll({
                        where: { item_id, CompanyId, isActive: true },
                        order: [['qty', 'DESC']],
                        ...(transaction ? { transaction } : {})
                    });
                }

                if (candidates.length === 0) {
                    throw new Error('Cannot subtract from non-existent inventory');
                }

                // Calculate total available stock across candidate records
                const totalAvailable = candidates.reduce((sum, inv) => sum + Math.max(0, Number(inv.qty)), 0);
                if (totalAvailable < Number(qty)) {
                    throw new Error(`Insufficient inventory. Available: ${totalAvailable}, Requested: ${qty}`);
                }

                // Deduct stock starting from candidate with highest qty
                let remainingToDeduct = Number(qty);
                let primaryUpdated: InventoryCount = candidates[0];

                for (const inv of candidates) {
                    if (remainingToDeduct <= 0) break;
                    const currentQty = Math.max(0, Number(inv.qty));
                    if (currentQty <= 0) continue;

                    const deductQty = Math.min(currentQty, remainingToDeduct);
                    const newQty = currentQty - deductQty;
                    const invRate = Number(inv.rate) || 0;
                    const newAmount = newQty * invRate;

                    const today = new Date();
                    const createdDate = new Date(inv.createdAt);
                    const timeDifference = today.getTime() - createdDate.getTime();
                    const daysDifference = Math.floor(timeDifference / (1000 * 3600 * 24));

                    await inv.update({
                        qty: newQty,
                        amount: newAmount,
                        inventory_age: daysDifference
                    }, transaction ? { transaction } : {});

                    remainingToDeduct -= deductQty;
                    primaryUpdated = inv;
                }

                return primaryUpdated;
            } else {
                // Exact match exists and has sufficient quantity
                const newQty = Number(targetInventory.qty) - Number(qty);
                const updatedRate = rate !== undefined && rate !== null ? Number(rate) : Number(targetInventory.rate) || 0;
                const newAmount = newQty * updatedRate;

                const today = new Date();
                const createdDate = new Date(targetInventory.createdAt);
                const timeDifference = today.getTime() - createdDate.getTime();
                const daysDifference = Math.floor(timeDifference / (1000 * 3600 * 24));

                await targetInventory.update({
                    qty: newQty,
                    rate: rate !== undefined && rate !== null ? rate : targetInventory.rate,
                    amount: newAmount,
                    inventory_age: daysDifference,
                    location: location || targetInventory.location,
                    warehouseId: warehouseId !== undefined && warehouseId !== null ? warehouseId : targetInventory.warehouseId,
                    godownId: godownId !== undefined && godownId !== null ? godownId : targetInventory.godownId,
                    stack: stack !== undefined && stack !== null ? stack : targetInventory.stack,
                    work_category_id: work_category_id !== undefined && work_category_id !== null ? work_category_id : targetInventory.work_category_id,
                }, transaction ? { transaction } : {});

                return targetInventory;
            }
        } else {
            if (existingInventory) {
                // Update existing entry for ADD
                const newQty = Number(existingInventory.qty) + Number(qty);

                const updatedRate = rate !== undefined && rate !== null ? Number(rate) : Number(existingInventory.rate) || 0;
                const newAmount = newQty * updatedRate;

                const today = new Date();
                const createdDate = new Date(existingInventory.createdAt);
                const timeDifference = today.getTime() - createdDate.getTime();
                const daysDifference = Math.floor(timeDifference / (1000 * 3600 * 24));

                await existingInventory.update({
                    qty: newQty,
                    rate: rate !== undefined && rate !== null ? rate : existingInventory.rate,
                    amount: newAmount,
                    inventory_age: daysDifference,
                    location: location || existingInventory.location,
                    warehouseId: warehouseId !== undefined && warehouseId !== null ? warehouseId : existingInventory.warehouseId,
                    godownId: godownId !== undefined && godownId !== null ? godownId : existingInventory.godownId,
                    stack: stack !== undefined && stack !== null ? stack : existingInventory.stack,
                    work_category_id: work_category_id !== undefined && work_category_id !== null ? work_category_id : existingInventory.work_category_id,
                }, transaction ? { transaction } : {});

                return existingInventory;
            } else {
                // Create new inventory entry for ADD
                const inventoryAge = 0;

                const newInventory = await InventoryCount.create({
                    work_order: work_order || undefined,
                    item_id,
                    qty,
                    uom_id,
                    rate: rate || 0,
                    amount: amount || 0,
                    inventory_age: inventoryAge,
                    location: location || undefined,
                    warehouseId: warehouseId as any,
                    godownId: godownId as any,
                    stack: stack as any,
                    work_category_id: work_category_id !== undefined && work_category_id !== null ? work_category_id : undefined,
                    customer_id: customer_id ?? null,
                    lot_number: lot_number || undefined,
                    CompanyId,
                    user_id,
                    isActive: true
                }, transaction ? { transaction } : {});

                return newInventory;
            }
        }
    }

    // Get available quantity for an item
    static async getAvailableQuantity(params: {
        work_order?: string;
        item_id: number;
        customer_id?: number;
        lot_number?: string;
        city_id?: number;
        site_id?: number;
        CompanyId: number;
    }) {
        const { work_order, item_id, customer_id, lot_number, city_id, site_id, CompanyId } = params;

        let whereClause: any = {
            item_id,
            CompanyId,
            isActive: true,
            qty: { [Op.gt]: 0 }
        };

        if (work_order) whereClause.work_order = work_order;
        if (customer_id) whereClause.customer_id = customer_id;
        if (lot_number) whereClause.lot_number = lot_number;

        const inventories = await InventoryCount.findAll({
            where: whereClause,
            include: [
                {
                    model: ItemMaster,
                    as: "item",
                    attributes: ["id", "item_name"]
                },
                {
                    model: UOMMaster,
                    as: "uom",
                    attributes: ["id", "uom_name"]
                }
            ]
        });

        return inventories;
    }

    // Bulk reverse inventory operations for line items
    static async reverseInventoryForLineItems(
        lineItems: any[],
        headerData: {
            work_order: string;
            customer_id: number;
            CompanyId: number;
            user_id: number;
        },
        originalOperation: 'ADD' | 'SUBTRACT',
        transaction?: any
    ) {
        const reverseOperation = originalOperation === 'ADD' ? 'SUBTRACT' : 'ADD';

        for (const lineItem of lineItems) {
            const itemRate = lineItem.rate || 0;
            const itemQty = lineItem.qty_issued || lineItem.qty_delivered || 0;
            const itemAmount = lineItem.amount || (itemQty * itemRate); // Calculate amount from lineItem or use qty * rate

            await InventoryCount.updateInventory({
                work_order: headerData.work_order,
                item_id: lineItem.item_id,
                customer_id: headerData.customer_id,
                lot_number: lineItem.lot_number || 'GENERAL',
                warehouseId: lineItem.warehouseId,
                godownId: lineItem.godownId,
                stack: lineItem.stack,
                location: lineItem.location || 'GENERAL',
                qty: itemQty,
                uom_id: lineItem.uom_id,
                rate: itemRate,
                amount: itemAmount,
                CompanyId: headerData.CompanyId,
                user_id: headerData.user_id,
                operation: reverseOperation
            }, transaction);
        }
    }
}

InventoryCount.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        work_order: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        item_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        qty: {
            type: DataTypes.DECIMAL(15, 4),
            allowNull: false,
            defaultValue: 0,
        },
        uom_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        rate: {
            type: DataTypes.DECIMAL(15, 4),
            allowNull: true,
            defaultValue: 0,
        },
        amount: {
            type: DataTypes.DECIMAL(15, 4),
            allowNull: true,
            defaultValue: 0,
        },
        inventory_age: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
        },
        location: {
            type: DataTypes.STRING(200),
            allowNull: true,
        },
        warehouseId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        godownId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
        },
        stack: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
        },
        customer_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            defaultValue: null,
        },
        lot_number: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        work_category_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
        },
        CompanyId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        sequelize,
        modelName: "InventoryCount",
        tableName: "inventory_counts",
        timestamps: true,
    }
);

// Associations
InventoryCount.belongsTo(Company, { foreignKey: "CompanyId", as: "company" });
InventoryCount.belongsTo(User, { foreignKey: "user_id", as: "user" });
InventoryCount.belongsTo(ItemMaster, { foreignKey: "item_id", as: "item" });
InventoryCount.belongsTo(UOMMaster, { foreignKey: "uom_id", as: "uom" });
InventoryCount.belongsTo(Customer, { foreignKey: "customer_id", as: "customer" });
InventoryCount.belongsTo(WorkCategory, { foreignKey: "work_category_id", as: "workCategory" });
InventoryCount.belongsTo(Warehouse, { foreignKey: "warehouseId", as: "warehouse" });
InventoryCount.belongsTo(Godown, { foreignKey: "godownId", as: "godown" });
InventoryCount.belongsTo(Stack, { foreignKey: "stack", as: "stackDetails" });

// Reverse associations
Company.hasMany(InventoryCount, { foreignKey: "CompanyId", as: "inventoryCounts" });
User.hasMany(InventoryCount, { foreignKey: "user_id", as: "inventoryCounts" });
ItemMaster.hasMany(InventoryCount, { foreignKey: "item_id", as: "inventoryCounts" });
UOMMaster.hasMany(InventoryCount, { foreignKey: "uom_id", as: "inventoryCounts" });
Customer.hasMany(InventoryCount, { foreignKey: "customer_id", as: "inventoryCounts" });
WorkCategory.hasMany(InventoryCount, { foreignKey: "work_category_id", as: "inventoryCounts" });
Warehouse.hasMany(InventoryCount, { foreignKey: "warehouseId", as: "inventoryCounts" });
Godown.hasMany(InventoryCount, { foreignKey: "godownId", as: "inventoryCounts" });
Stack.hasMany(InventoryCount, { foreignKey: "stack", as: "inventoryCounts" });

export default InventoryCount;