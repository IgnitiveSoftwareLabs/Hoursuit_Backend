import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Op, fn, col, literal } from "sequelize";
import { CustomRequest } from "../../typeRequest/customReq";
import SystemLog from "../../modals/systemLogs/systemLogs";
import Company from "../../modals/company/company";
import User from "../../modals/user/user";
import { findCompanyForUser } from "../../utils/findCompanyForUser";

const SystemLogController = {
  // Get all system logs with filtering and pagination
  getSystemLogs: asyncHandler(async (req: CustomRequest, res: Response) => {
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

    // Query parameters for pagination and filtering
    const {
      page = "1",
      limit = "25",
      search,
      model_name,
      action_type,
      performed_by,
      status,
      date_from,
      date_to,
      sort_by = "createdAt",
      sort_order = "DESC",
    } = req.query as any;

    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(String(limit)) || 25));
    const offset = (pageNum - 1) * pageSize;

    // Build where clause
    const whereClause: any = {
      CompanyId: company.id,
      isActive: true,
    };

    // Apply filters
    if (model_name && String(model_name) !== "") {
      whereClause.model_name = model_name;
    }

    if (action_type && String(action_type) !== "") {
      whereClause.action_type = action_type;
    }

    if (
      performed_by &&
      String(performed_by) !== "0" &&
      String(performed_by) !== ""
    ) {
      whereClause.performed_by = performed_by;
    }

    if (status && String(status) !== "") {
      whereClause.status = status;
    }

    // Date range filtering
    if (date_from || date_to) {
      const dateFilter: any = {};
      if (date_from) {
        dateFilter[Op.gte] = new Date(String(date_from));
      }
      if (date_to) {
        dateFilter[Op.lte] = new Date(String(date_to));
      }
      whereClause.createdAt = dateFilter;
    }

    // Search functionality
    if (search && String(search).trim() !== "") {
      const searchTerm = String(search).trim();
      whereClause[Op.or] = [
        { model_name: { [Op.like]: `%${searchTerm}%` } },
        { record_id: { [Op.like]: `%${searchTerm}%` } },
        { performed_by_name: { [Op.like]: `%${searchTerm}%` } },
        { description: { [Op.like]: `%${searchTerm}%` } },
        { endpoint: { [Op.like]: `%${searchTerm}%` } },
      ];
    }

    // Sorting
    const validSortFields = [
      "createdAt",
      "updatedAt",
      "model_name",
      "action_type",
      "performed_by_name",
      "status",
    ];
    const sortField = validSortFields.includes(String(sort_by))
      ? String(sort_by)
      : "createdAt";
    const sortDirection =
      String(sort_order).toUpperCase() === "ASC" ? "ASC" : "DESC";

    try {
      // Get paginated results with associations
      const { count: total, rows: logs } = await SystemLog.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "FirstName", "LastName", "Email"],
            required: false,
          },
          {
            model: Company,
            as: "company",
            attributes: ["id", "name"],
            required: false,
          },
        ],
        order: [[sortField, sortDirection]],
        offset,
        limit: pageSize,
        distinct: true,
      });

      const totalPages = Math.ceil(total / pageSize);

      // Get summary statistics
      const stats = await SystemLog.findAll({
        where: { CompanyId: company.id, isActive: true },
        attributes: ["action_type", [fn("COUNT", col("id")), "count"]],
        group: ["action_type"],
        raw: true,
      });

      const summary = {
        total_logs: total,
        create_count: 0,
        update_count: 0,
        delete_count: 0,
      };

      stats.forEach((stat: any) => {
        switch (stat.action_type) {
          case "CREATE":
            summary.create_count = parseInt(stat.count);
            break;
          case "UPDATE":
            summary.update_count = parseInt(stat.count);
            break;
          case "DELETE":
            summary.delete_count = parseInt(stat.count);
            break;
        }
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: "System logs retrieved successfully",
        result: logs,
        meta: {
          page: pageNum,
          limit: pageSize,
          total,
          totalPages,
          summary,
        },
      });
    } catch (error: any) {
      console.error("Error fetching system logs:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR);
      throw new Error("Failed to retrieve system logs");
    }
  }),

  // Get a specific system log by ID
  getSystemLogById: asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not authenticated");
    }

    if (!id || isNaN(Number(id))) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Valid system log ID is required");
    }

    const company = await findCompanyForUser(req.user);
    if (!company) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized: Company not found for user");
    }

    try {
      const log = await SystemLog.findOne({
        where: {
          id: Number(id),
          CompanyId: company.id,
          isActive: true,
        },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "FirstName", "LastName", "Email"],
            required: false,
          },
          {
            model: Company,
            as: "company",
            attributes: ["id", "name"],
            required: false,
          },
        ],
      });

      if (!log) {
        res.status(StatusCodes.NOT_FOUND);
        throw new Error("System log not found");
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "System log retrieved successfully",
        result: log,
      });
    } catch (error: any) {
      console.error("Error fetching system log:", error);
      if (error.message === "System log not found") {
        throw error;
      }
      res.status(StatusCodes.INTERNAL_SERVER_ERROR);
      throw new Error("Failed to retrieve system log");
    }
  }),

  // Get system log statistics and analytics
  getSystemLogStats: asyncHandler(async (req: CustomRequest, res: Response) => {
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

    const { days = "30" } = req.query as any;
    const daysCount = Math.max(1, Math.min(365, parseInt(String(days)) || 30));

    try {
      // Date range for statistics
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysCount);

      // Get activity by action type
      const actionStats = await SystemLog.findAll({
        where: {
          CompanyId: company.id,
          isActive: true,
          createdAt: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
        },
        attributes: ["action_type", [fn("COUNT", col("id")), "count"]],
        group: ["action_type"],
        raw: true,
      });

      // Get activity by model
      const modelStats = await SystemLog.findAll({
        where: {
          CompanyId: company.id,
          isActive: true,
          createdAt: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
        },
        attributes: ["model_name", [fn("COUNT", col("id")), "count"]],
        group: ["model_name"],
        order: [[literal("count"), "DESC"]],
        limit: 10,
        raw: true,
      });

      // Get activity by user (top 10 most active users)
      const userStats = await SystemLog.findAll({
        where: {
          CompanyId: company.id,
          isActive: true,
          createdAt: {
            [Op.gte]: startDate,
            [Op.lte]: endDate,
          },
        },
        attributes: [
          "performed_by",
          "performed_by_name",
          [fn("COUNT", col("id")), "count"],
        ],
        group: ["performed_by", "performed_by_name"],
        order: [[literal("count"), "DESC"]],
        limit: 10,
        raw: true,
      });

      // Get daily activity for the past week
      const dailyStats = await SystemLog.findAll({
        where: {
          CompanyId: company.id,
          isActive: true,
          createdAt: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        attributes: [
          [fn("DATE", col("createdAt")), "date"],
          [fn("COUNT", col("id")), "count"],
        ],
        group: [fn("DATE", col("createdAt"))],
        order: [[literal("date"), "ASC"]],
        raw: true,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: "System log statistics retrieved successfully",
        result: {
          period: {
            days: daysCount,
            start_date: startDate,
            end_date: endDate,
          },
          action_stats: actionStats,
          model_stats: modelStats,
          user_stats: userStats,
          daily_activity: dailyStats,
        },
      });
    } catch (error: any) {
      console.error("Error fetching system log statistics:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR);
      throw new Error("Failed to retrieve system log statistics");
    }
  }),

  // Get distinct values for filters (model names, users, etc.)
  getFilterOptions: asyncHandler(async (req: CustomRequest, res: Response) => {
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

    try {
      // Get distinct model names
      const modelNames = await SystemLog.findAll({
        where: { CompanyId: company.id, isActive: true },
        attributes: ["model_name"],
        group: ["model_name"],
        order: [["model_name", "ASC"]],
        raw: true,
      });

      // Get distinct users who have performed actions
      const users = await SystemLog.findAll({
        where: { CompanyId: company.id, isActive: true },
        attributes: ["performed_by", "performed_by_name"],
        group: ["performed_by", "performed_by_name"],
        order: [["performed_by_name", "ASC"]],
        raw: true,
      });

      // Get action types (these are fixed, but good to be consistent)
      const actionTypes = await SystemLog.findAll({
        where: { CompanyId: company.id, isActive: true },
        attributes: ["action_type"],
        group: ["action_type"],
        order: [["action_type", "ASC"]],
        raw: true,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Filter options retrieved successfully",
        result: {
          model_names: modelNames.map((item: any) => item.model_name),
          users: users.map((item: any) => ({
            id: item.performed_by,
            name: item.performed_by_name || `User ${item.performed_by}`,
          })),
          action_types: actionTypes.map((item: any) => item.action_type),
          status_options: ["SUCCESS", "FAILED"],
        },
      });
    } catch (error: any) {
      console.error("Error fetching filter options:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR);
      throw new Error("Failed to retrieve filter options");
    }
  }),

  // Soft delete system log (for cleanup purposes)
  deleteSystemLog: asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not authenticated");
    }

    if (!id || isNaN(Number(id))) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Valid system log ID is required");
    }

    const company = await findCompanyForUser(req.user);
    if (!company) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("Unauthorized: Company not found for user");
    }

    try {
      const log = await SystemLog.findOne({
        where: {
          id: Number(id),
          CompanyId: company.id,
          isActive: true,
        },
      });

      if (!log) {
        res.status(StatusCodes.NOT_FOUND);
        throw new Error("System log not found");
      }

      // Soft delete by setting isActive to false
      log.isActive = false;
      await log.save();

      res.status(StatusCodes.OK).json({
        success: true,
        message: "System log deleted successfully",
        result: null,
      });
    } catch (error: any) {
      console.error("Error deleting system log:", error);
      if (error.message === "System log not found") {
        throw error;
      }
      res.status(StatusCodes.INTERNAL_SERVER_ERROR);
      throw new Error("Failed to delete system log");
    }
  }),

  // Bulk cleanup old logs (optional utility function)
  cleanupOldLogs: asyncHandler(async (req: CustomRequest, res: Response) => {
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

    const { days = "365" } = req.body;
    const daysCount = Math.max(30, parseInt(String(days)) || 365); // Minimum 30 days

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysCount);

      const result = await SystemLog.destroy({
        where: {
          CompanyId: company.id,
          createdAt: { [Op.lt]: cutoffDate },
        },
      });
      //destroy old logs

      res.status(StatusCodes.OK).json({
        success: true,
        message: `Successfully cleaned up logs older than ${daysCount} days`,
        result: {
          affected_rows: result,
          cutoff_date: cutoffDate,
        },
      });
    } catch (error: any) {
      console.error("Error cleaning up old logs:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR);
      throw new Error("Failed to cleanup old logs");
    }
  }),
};

export default SystemLogController;