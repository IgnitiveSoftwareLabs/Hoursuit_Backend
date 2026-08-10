import { Response } from "express";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { CustomRequest } from "../../typeRequest/customReq";
import Permission from "../../modals/permission/permission";
import User from "../../modals/user/user";
import UserPermission from "../../modals/userPermission/userPermission";

const PermissionController = {
    // Create default permissions (run once to seed permissions)
    seedPermissions: asyncHandler(async (req: CustomRequest, res: Response) => {
        try {
            const modules = ["warehouse", "godown", "stack", "gatepass", "customer", "commodity", "deposit", "delivery", "bill", "invoice", "inventory", "ledger", "grade", "rent", "insurance", "voucher", "NewUser", "layout"];
            const actions = ["create", "read", "update", "delete"];

            const permissions: Array<{ name: string; module: string; action: string; description: string }> = [];
            for (const module of modules) {
                for (const action of actions) {
                    permissions.push({
                        name: `${module}_${action}`,
                        module,
                        action,
                        description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${module}`,
                    });
                }
            }

            await Permission.bulkCreate(permissions, { ignoreDuplicates: true });

            res.status(StatusCodes.OK).json({
                message: "Permissions seeded successfully",
                success: true,
            });
        } catch (error: any) {
            throw new Error(error.message);
        }
    }),

    // Get all permissions
    getAllPermissions: asyncHandler(async (req: CustomRequest, res: Response) => {
        try {
            const permissions = await Permission.findAll({
                order: [["module", "ASC"], ["action", "ASC"]],
            });

            res.status(StatusCodes.OK).json({
                message: "Permissions fetched successfully",
                success: true,
                result: permissions,
            });
        } catch (error: any) {
            throw new Error(error.message);
        }
    }),

    // Assign permissions to user
    assignPermissions: asyncHandler(async (req: CustomRequest, res: Response) => {
        try {
            const { userId, permissionIds } = req.body;

            // Check if the current user is superadmin
            const currentUser = await User.findByPk(req.user.id);
            if (currentUser?.Type !== "superadmin") {
                res.status(StatusCodes.FORBIDDEN);
                throw new Error("Only superadmin can assign permissions");
            }

            // Check if target user exists
            const targetUser = await User.findByPk(userId);
            if (!targetUser) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("User not found");
            }

            // Remove existing permissions
            await UserPermission.destroy({ where: { userId } });

            // Add new permissions
            const userPermissions = permissionIds.map((permissionId: number) => ({
                userId,
                permissionId,
            }));

            await UserPermission.bulkCreate(userPermissions);

            res.status(StatusCodes.OK).json({
                message: "Permissions assigned successfully",
                success: true,
            });
        } catch (error: any) {
            throw new Error(error.message);
        }
    }),

    // Get user permissions
    getUserPermissions: asyncHandler(async (req: CustomRequest, res: Response) => {
        try {
            const { userId }: any = req.params;

            const user = await User.findByPk(userId, {
                include: [
                    {
                        model: Permission,
                        as: "permissions",
                        through: { attributes: [] },
                    },
                ],
            });

            if (!user) {
                res.status(StatusCodes.NOT_FOUND);
                throw new Error("User not found");
            }

            res.status(StatusCodes.OK).json({
                message: "User permissions fetched successfully",
                success: true,
                result: (user as any).permissions,
            });
        } catch (error: any) {
            throw new Error(error.message);
        }
    }),
};

export default PermissionController;