import { Request, Response } from 'express';

import asyncHandler from "express-async-handler";
import { StatusCodes } from 'http-status-codes';
import * as fastcsv from 'fast-csv';
import { Op } from 'sequelize';

import WorkCategory from '../../modals/masters/workCategory/workCatMaster';
import { findCompanyForUser } from '../../utils/findCompanyForUser';
import Warehouse from '../../modals/masters/warehouse/warehouse';
import ItemMaster from '../../modals/masters/items/itemMaster';
import Customer from '../../modals/masters/customer/customer';
import InventoryCount from '../../modals/inventory/inventory';
import UOMMaster from '../../modals/masters/UOM/UOMMaster';
import Godown from '../../modals/masters/godown/godown';
import Stack from '../../modals/masters/stack/stack';
import ChartOfAccountMaster from '../../modals/masters/chartOfAccount/chartOfAccount';
import AccountTypeMaster from '../../modals/platform/accountType/accountType';
import Company from '../../modals/company/company';
import CityMaster from '../../modals/masters/city/city';

interface CustomRequest extends Request {
    user?: any;
}

const InventoryController = {
    // GET ALL INVENTORY BALANCES for current user's company with search, pagination, and stats
    getAllInventoryBalances: asyncHandler(async (req: CustomRequest, res: Response) => {
        const UserId = req.user.id;

        const company = await findCompanyForUser(req.user);
        if (!company) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Company not found");
        }

        // Extract query parameters
        const {
            search,
            page = 1,
            limit = 10,
            warehouseId,

            clientId,
            commodityId,
            godownId,
            stackId,
            sortBy = 'updatedAt',
            sortOrder = 'DESC'
        } = req.query;

        // Map frontend sort fields to actual database columns
        const sortFieldMapping: { [key: string]: string } = {
            'id': 'id',
            //   'weight': 'measurment_or_weight',
            //   'quantity': 'details_of_number_of_bags_sacks',
            'createdAt': 'createdAt',
            'updatedAt': 'updatedAt',
            'last_updated': 'last_updated'
        };

        const actualSortField = sortFieldMapping[sortBy as string] || 'updatedAt';

        const pageNumber = parseInt(page as string, 10) || 1;
        const pageSize = parseInt(limit as string, 10) || 10;
        const offset = (pageNumber - 1) * pageSize;

        // Build dynamic where clause
        let whereClause: any = { CompanyId: company.id };

        // Client filter
        if (clientId) {
            whereClause.customerId = clientId;
        }

        // Warehouse filter
        if (warehouseId) {
            whereClause.warehouseId = warehouseId;
        }

        // Commodity filter
        // if (commodityId) {
        //   whereClause.CommodityId = commodityId;
        // }

        // Godown filter
        if (godownId) {
            whereClause.GodownId = godownId;
        }

        // Stack filter
        if (stackId) {
            whereClause.StackId = stackId;
        }

        const itemIncludeConfig = {
            model: ItemMaster,
            as: "item",
            include: [
                {
                    model: CityMaster,
                    as: "location",
                    attributes: ["id", "city_name"],
                },
                {
                    model: ChartOfAccountMaster,
                    as: "asset_account",
                    attributes: ["id", "account_number", "account_name"],
                    include: [{ model: AccountTypeMaster, as: "accountType", attributes: ["id", "account_type_name"] }],
                },
                {
                    model: ChartOfAccountMaster,
                    as: "income_account",
                    attributes: ["id", "account_number", "account_name"],
                    include: [{ model: AccountTypeMaster, as: "accountType", attributes: ["id", "account_type_name"] }],
                },
                {
                    model: ChartOfAccountMaster,
                    as: "cogs_account",
                    attributes: ["id", "account_number", "account_name"],
                    include: [{ model: AccountTypeMaster, as: "accountType", attributes: ["id", "account_type_name"] }],
                },
                {
                    model: ChartOfAccountMaster,
                    as: "expense_account",
                    attributes: ["id", "account_number", "account_name"],
                    include: [{ model: AccountTypeMaster, as: "accountType", attributes: ["id", "account_type_name"] }],
                },
            ],
        };

        // Define includes
        const includes = [
            itemIncludeConfig,
            { model: UOMMaster, as: "uom", attributes: ["id", "uom_name"] },
            { model: Customer, as: "customer" },
            { model: Warehouse, as: "warehouse" },
            { model: Godown, as: "godown" },
            { model: Stack, as: "stackDetails" },
        ];

        // Handle search using raw SQL in where clause
        let finalWhereClause = whereClause;
        if (search) {
            const searchTerm = search as string;
            // Add search condition using Sequelize.literal for complex joins
            finalWhereClause = {
                ...whereClause,
                [Op.or]: [
                    InventoryCount.sequelize!.literal(`EXISTS (
            SELECT 1 FROM item_masters im WHERE im.id = InventoryCount.item_id AND (im.item_name LIKE '%${searchTerm}%' OR im.item_code LIKE '%${searchTerm}%')
          )`),
                    InventoryCount.sequelize!.literal(`EXISTS (
            SELECT 1 FROM customers c WHERE c.id = InventoryCount.customer_id AND c.name LIKE '%${searchTerm}%'
          )`),
                    InventoryCount.sequelize!.literal(`EXISTS (
            SELECT 1 FROM godowns g WHERE g.id = InventoryCount.godown_id AND g.name LIKE '%${searchTerm}%'
          )`),
                    InventoryCount.sequelize!.literal(`EXISTS (
            SELECT 1 FROM stacks s WHERE s.id = InventoryCount.stack_id AND s.name LIKE '%${searchTerm}%'
          )`),
                ]
            };
        }

        // Get paginated data
        const { rows: inventory, count: totalItems } = await InventoryCount.findAndCountAll({
            where: finalWhereClause,
            include: includes,
            offset,
            limit: pageSize,
            distinct: true,
            order: [[actualSortField, sortOrder as string]],
        });

        // Calculate statistics for ALL inventory (not just current page)
        const statsAggregates = await InventoryCount.findOne({
            where: finalWhereClause,
            attributes: [
                [InventoryCount.sequelize!.fn('SUM', InventoryCount.sequelize!.col('qty')), 'totalQty'],
                [InventoryCount.sequelize!.fn('SUM', InventoryCount.sequelize!.col('amount')), 'totalValue'],
            ],
            raw: true,
        });

        const overallQty = parseFloat((statsAggregates as any)?.totalQty || '0').toFixed(2);
        const overallValue = parseFloat((statsAggregates as any)?.totalValue || '0').toFixed(2);

        // Get location breakdown (warehouse-wise summary)
        const locationBreakdownRaw = await InventoryCount.findAll({
            where: finalWhereClause,
            include: [
                {
                    model: Warehouse,
                    as: "warehouse",
                    attributes: ['id', 'name']
                }
            ],
            attributes: [
                'warehouseId',
                [
                    InventoryCount.sequelize!.fn(
                        'COUNT',
                        InventoryCount.sequelize!.col('InventoryCount.id')
                    ),
                    'itemCount'
                ],
                [
                    InventoryCount.sequelize!.fn(
                        'SUM',
                        InventoryCount.sequelize!.col('qty')
                    ),
                    'totalQty'
                ],
                [
                    InventoryCount.sequelize!.fn(
                        'SUM',
                        InventoryCount.sequelize!.col('amount')
                    ),
                    'totalValue'
                ]
            ],
            group: ['warehouseId', 'warehouse.id', 'warehouse.name'],
            raw: false,
        });

        const locationBreakdown = locationBreakdownRaw.map((loc: any) => ({
            warehouseId: loc.warehouseId,
            warehouseName: loc.warehouse?.name || 'Unknown',
            itemCount: parseInt(loc.get('itemCount') || '0', 10),
            totalQty: parseFloat(loc.get('totalQty') || '0').toFixed(2),
            totalValue: parseFloat(loc.get('totalValue') || '0').toFixed(2),
        }));

        // Calculate pagination info
        const totalPages = Math.ceil(totalItems / pageSize);
        const hasNextPage = pageNumber < totalPages;
        const hasPrevPage = pageNumber > 1;

        res.status(StatusCodes.OK).json({
            message: "Inventory balances fetched successfully",
            success: true,
            result: {
                inventory,
                pagination: {
                    currentPage: pageNumber,
                    totalPages,
                    pageSize,
                    totalItems,
                    hasNextPage,
                    hasPrevPage,
                },
                stats: {
                    totalItems,
                    totalQty: overallQty,
                    totalValue: overallValue,
                    uniqueWarehouses: locationBreakdown.length,
                    locationBreakdown,
                }
            }
        });
    }),

    // GET SINGLE INVENTORY BALANCE BY ID
    getInventoryBalanceById: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id }: any = req.params;

        const inventory = await InventoryCount.findByPk(id, {
            include: [
                {
                    model: ItemMaster,
                    as: "item",
                    include: [
                        {
                            model: CityMaster,
                            as: "location",
                            attributes: ["id", "city_name"],
                        },
                        {
                            model: ChartOfAccountMaster,
                            as: "asset_account",
                            attributes: ["id", "account_number", "account_name"],
                            include: [{ model: AccountTypeMaster, as: "accountType", attributes: ["id", "account_type_name"] }],
                        },
                        {
                            model: ChartOfAccountMaster,
                            as: "income_account",
                            attributes: ["id", "account_number", "account_name"],
                            include: [{ model: AccountTypeMaster, as: "accountType", attributes: ["id", "account_type_name"] }],
                        },
                        {
                            model: ChartOfAccountMaster,
                            as: "cogs_account",
                            attributes: ["id", "account_number", "account_name"],
                            include: [{ model: AccountTypeMaster, as: "accountType", attributes: ["id", "account_type_name"] }],
                        },
                        {
                            model: ChartOfAccountMaster,
                            as: "expense_account",
                            attributes: ["id", "account_number", "account_name"],
                            include: [{ model: AccountTypeMaster, as: "accountType", attributes: ["id", "account_type_name"] }],
                        },
                    ],
                },
                { model: UOMMaster, as: "uom", attributes: ["id", "uom_name", "uom_code"] },
                { model: Customer, as: "customer" },
                { model: Company, as: "company" },
                { model: Warehouse, as: "warehouse" },
                { model: Godown, as: "godown" },
                { model: Stack, as: "stackDetails" },
            ],
        });

        if (!inventory) {
            res.status(StatusCodes.NOT_FOUND);
            throw new Error("Inventory balance not found");
        }

        res.status(StatusCodes.OK).json({
            message: "Inventory balance fetched successfully",
            success: true,
            result: inventory,
        });
    }),

    // Get work orders by customer
    getWorkOrdersByCustomer: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { customerId } = req.params;
        const company = await findCompanyForUser(req.user);
        const CompanyId = company?.id;

        if (!CompanyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        if (!customerId) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Customer ID is required");
        }

        // Get unique work orders for the customer with summary information
        const workOrders = await InventoryCount.findAll({
            attributes: [
                'work_order',
                'customer_id',
                // 'city_id',
                // 'site_id',
                [InventoryCount.sequelize!.fn('COUNT', InventoryCount.sequelize!.col('item_id')), 'total_items'],
                [InventoryCount.sequelize!.fn('SUM', InventoryCount.sequelize!.col('qty')), 'total_qty']
            ],
            where: {
                customer_id: customerId,
                CompanyId,
                isActive: true,
                qty: { [Op.gt]: 0 } // Only work orders with available inventory
            },
            group: ['work_order', 'customer_id', 'city_id', 'site_id'],
            raw: true // Use raw to avoid include issues with GROUP BY
        });

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Work orders retrieved successfully",
            result: workOrders
        });
    }),

    // Get inventory items by work order
    getInventoryItemsByWorkOrder: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { workOrder }: any = req.params;
        const company = await findCompanyForUser(req.user);
        const CompanyId = company?.id;

        if (!CompanyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        if (!workOrder) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Work order is required");
        }

        const inventoryItems = await InventoryCount.findAll({
            where: {
                work_order: decodeURIComponent(workOrder),
                CompanyId,
                isActive: true,
                qty: { [Op.gt]: 0 } // Only items with available quantity
            },
            // include: [
            //     {
            //         model: ItemMaster,
            //         as: 'item',
            //         attributes: ['id', 'item_code', 'item_name']
            //     },
            //     {
            //         model: UOMMaster,
            //         as: 'uom',
            //         attributes: ['id', 'uom_name']
            //     }
            //     ,
            //     // {
            //     //   model: StoreMaster,
            //     //   as: 'store',
            //     //   attributes: ['id', 'store_name']
            //     // }
            //     ,
            //     {
            //         model: WorkCategory,
            //         as: 'workCategory',
            //         attributes: ['id', 'work_category_name']
            //     },
            //     // {
            //     //   model: MaterialStatus,
            //     //   as: 'materialStatus',

            //     // }
            // ],
            order: [['item_id', 'ASC'], ['lot_number', 'ASC']]
        });

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Inventory items retrieved successfully",
            result: inventoryItems
        });
    }),

    // Get available quantity for specific item/work order/customer
    getItemAvailableQuantity: asyncHandler(async (req: CustomRequest, res: Response) => {
        const { item_id, work_order, customer_id } = req.query;
        const company = await findCompanyForUser(req.user);
        const CompanyId = company?.id;

        if (!CompanyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        if (!item_id || !work_order || !customer_id) {
            res.status(StatusCodes.BAD_REQUEST);
            throw new Error("Item ID, work order, and customer ID are required");
        }

        const totalQuantity = await InventoryCount.sum('qty', {
            where: {
                item_id: Number(item_id),
                work_order: decodeURIComponent(work_order as string),
                customer_id: Number(customer_id),
                CompanyId,
                isActive: true
            }
        });

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Available quantity retrieved successfully",
            result: {
                available_qty: totalQuantity || 0
            }
        });
    }),

    // Get all inventory with filters
    getInventoryItems: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const CompanyId = company?.id;
        const {
            page = 1,
            limit = 10,
            search,
            customer_id,
            work_order,
            item_id,
            work_category_id,
            // store_id,
            // city_id,
            // material_status_id
        } = req.query;

        if (!CompanyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        const offset = (Number(page) - 1) * Number(limit);
        let whereClause: any = {
            CompanyId,
            isActive: true
        };

        // Add filters
        if (customer_id) {
            whereClause.customer_id = customer_id;
        }

        if (work_category_id) {
            whereClause.work_category_id = work_category_id;
        }

        // if (store_id) {
        //     whereClause.store_id = store_id;
        // }

        // if (city_id) {
        //     whereClause.city_id = city_id;
        // }

        if (work_category_id) {
            whereClause.work_category_id = work_category_id;
        }

        // if (store_id) {
        //     whereClause.store_id = store_id;
        // }

        // if (city_id) {
        //     whereClause.city_id = city_id;
        // }

        if (work_order) {
            // Case-insensitive match compatible with MySQL/MariaDB
            whereClause[Op.and] = whereClause[Op.and] || [];
            whereClause[Op.and].push(
                InventoryCount.sequelize!.where(
                    InventoryCount.sequelize!.fn('LOWER', InventoryCount.sequelize!.col('work_order')),
                    { [Op.like]: `%${String(work_order).toLowerCase()}%` }
                )
            );
        }

        if (item_id) {
            whereClause.item_id = item_id;
        }

        // if (material_status_id) {
        //     whereClause.material_status_id = material_status_id;
        // }

        // Add search filter
        if (search) {
            const q = String(search).toLowerCase();
            whereClause[Op.or] = [
                InventoryCount.sequelize!.where(
                    InventoryCount.sequelize!.fn('LOWER', InventoryCount.sequelize!.col('work_order')),
                    { [Op.like]: `%${q}%` }
                ),
                InventoryCount.sequelize!.where(
                    InventoryCount.sequelize!.fn('LOWER', InventoryCount.sequelize!.col('lot_number')),
                    { [Op.like]: `%${q}%` }
                ),
                InventoryCount.sequelize!.where(
                    InventoryCount.sequelize!.fn('LOWER', InventoryCount.sequelize!.col('location')),
                    { [Op.like]: `%${q}%` }
                )
            ];
        }

        const { count, rows } = await InventoryCount.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: ItemMaster,
                    as: 'item',
                    attributes: ['id', 'item_code', 'item_name', 'item_desc', 'cost_price', 'default_rate', 'asset_account_id', 'income_account_id', 'cogs_account_id', 'expense_account_id'],
                    include: [
                        { model: ChartOfAccountMaster, as: "asset_account", attributes: ["id", "account_number", "account_name"], include: [{ association: "accountType", attributes: ["id", "account_type_name"] }] },
                        { model: ChartOfAccountMaster, as: "income_account", attributes: ["id", "account_number", "account_name"], include: [{ association: "accountType", attributes: ["id", "account_type_name"] }] },
                        { model: ChartOfAccountMaster, as: "cogs_account", attributes: ["id", "account_number", "account_name"], include: [{ association: "accountType", attributes: ["id", "account_type_name"] }] },
                        { model: ChartOfAccountMaster, as: "expense_account", attributes: ["id", "account_number", "account_name"], include: [{ association: "accountType", attributes: ["id", "account_type_name"] }] },
                    ],
                },
                {
                    model: UOMMaster,
                    as: 'uom',
                    attributes: ['id', 'uom_name']
                },
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'name']
                },
                {
                    model: Warehouse,
                    as: 'warehouse',
                    attributes: ['id', 'warehouse_name']
                },
                {
                    model: Godown,
                    as: 'godown',
                    attributes: ['id', 'godown_name']
                },
                {
                    model: Stack,
                    as: 'stackDetails',
                    attributes: ['id', 'stack_name']
                },
                {
                    model: WorkCategory,
                    as: 'workCategory',
                    attributes: ['id', 'work_category_name']
                },
            ],
            limit: Number(limit),
            offset,
            order: [['updatedAt', 'DESC']]
        });
        // Summary calculations across the full filtered set (not just current page)
        const totalItems = count;
        const totalValueRaw = await InventoryCount.sum('amount', { where: whereClause });
        const totalValue = Number(totalValueRaw) || 0;

        // out_of_stock: qty === 0
        const outOfStockItems = await InventoryCount.count({ where: { ...whereClause, qty: 0 } });

        // low_stock: qty > 0 and qty < 10
        const lowStockItems = await InventoryCount.count({ where: { ...whereClause, qty: { [Op.gt]: 0, [Op.lt]: 10 } } });

        // normal/active: qty >= 10
        const normalStockItems = await InventoryCount.count({ where: { ...whereClause, qty: { [Op.gte]: 10 } } });

        const criticalStockItems = outOfStockItems + lowStockItems;

        res.status(StatusCodes.OK).json({
            success: true,
            message: "Inventory items retrieved successfully",
            result: {
                inventories: rows,
                total: count,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(count / Number(limit)),
                // Summary fields for overall (filtered) dataset
                summary: {
                    totalItems,
                    totalValue,
                    lowStockItems,
                    outOfStockItems,
                    criticalStockItems,
                    normalStockItems
                }
            }
        });
    }),

    // Export Inventory to CSV
    exportInventoryCSV: asyncHandler(async (req: CustomRequest, res: Response) => {
        const company = await findCompanyForUser(req.user);
        const CompanyId = company?.id;
        const { search, customer_id, work_order, item_id, startDate, endDate, material_status_id } = req.query;

        if (!CompanyId) {
            res.status(StatusCodes.UNAUTHORIZED);
            throw new Error("User authentication required");
        }

        let whereClause: any = { CompanyId, isActive: true };

        // Add search filter
        if (search) {
            const q = String(search).toLowerCase();
            whereClause[Op.or] = [
                InventoryCount.sequelize!.where(
                    InventoryCount.sequelize!.fn('LOWER', InventoryCount.sequelize!.col('work_order')),
                    { [Op.like]: `%${q}%` }
                ),
                InventoryCount.sequelize!.where(
                    InventoryCount.sequelize!.fn('LOWER', InventoryCount.sequelize!.col('lot_number')),
                    { [Op.like]: `%${q}%` }
                ),
                InventoryCount.sequelize!.where(
                    InventoryCount.sequelize!.fn('LOWER', InventoryCount.sequelize!.col('location')),
                    { [Op.like]: `%${q}%` }
                )
            ];
        }

        // Add filters
        if (customer_id) {
            whereClause.customer_id = customer_id;
        }

        if (work_order) {
            const q = String(work_order).toLowerCase();
            whereClause.work_order = InventoryCount.sequelize!.where(
                InventoryCount.sequelize!.fn('LOWER', InventoryCount.sequelize!.col('InventoryCount.work_order')),
                { [Op.like]: `%${q}%` }
            );
        }

        if (item_id) {
            whereClause.item_id = item_id;
        }

        if (material_status_id) {
            whereClause.material_status_id = material_status_id;
        }

        // Add date range filter
        if (startDate && endDate) {
            const start = new Date(startDate as string);
            const end = new Date(endDate as string);

            // Set start date to beginning of day (00:00:00)
            start.setHours(0, 0, 0, 0);

            // Set end date to end of day (23:59:59.999)
            end.setHours(23, 59, 59, 999);

            whereClause.createdAt = {
                [Op.between]: [start, end]
            };
        }

        const inventories = await InventoryCount.findAll({
            where: whereClause,
            include: [
                {
                    model: ItemMaster,
                    as: 'item',
                    attributes: ['id', 'item_code', 'item_name', 'item_desc']
                },
                {
                    model: UOMMaster,
                    as: 'uom',
                    attributes: ['id', 'uom_name']
                },
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'name']
                },
                // {
                //     model: CityMaster,
                //     as: 'city',
                //     attributes: ['id', 'city_name']
                // },
                // {
                //     model: SiteMaster,
                //     as: 'site',
                //     attributes: ['id', 'site_name']
                // }
                // ,
                // {
                //     model: StoreMaster,
                //     as: 'store',
                //     attributes: ['id', 'store_name']
                // },
                {
                    model: WorkCategory,
                    as: 'workCategory',
                    attributes: ['id', 'work_category_name']
                },
                // {
                //     model: MaterialStatus,
                //     as: 'materialStatus',
                //     attributes: ['id', 'material_status_name']
                // }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Prepare CSV data
        const csvData = inventories.map((inventory: any) => ({
            'Work Order': inventory.work_order || '',
            'Item Code': inventory.item?.item_code || '',
            'Item Name': inventory.item?.item_name || '',
            'Item Description': inventory.item?.item_desc || '',
            'Customer': inventory.customer?.name || '',
            'City': inventory.city?.city_name || '',
            'Site': inventory.site?.site_name || '',
            'Store': inventory.store?.store_name || '',
            'Work Category': inventory.workCategory?.work_category_name || '',
            'Material Status': inventory.materialStatus?.material_status_name || '',
            'Lot Number': inventory.lot_number || '',
            'Location': inventory.location || '',
            'Quantity': inventory.qty || 0,
            'UOM': inventory.uom?.uom_name || '',
            'Rate': inventory.rate || 0,
            'Amount': inventory.amount || 0,
            'Inventory Age (Days)': inventory.inventory_age || 0,
            'Created Date': inventory.createdAt ? new Date(inventory.createdAt).toLocaleDateString('en-IN') : '',
            'Last Updated': inventory.updatedAt ? new Date(inventory.updatedAt).toLocaleDateString('en-IN') : ''
        }));

        // Set response headers for CSV download
        const fileName = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        // Create and pipe CSV stream
        const csvStream = fastcsv.format({ headers: true });
        csvStream.pipe(res);

        csvData.forEach(row => csvStream.write(row));
        csvStream.end();
    })
};

export default InventoryController;