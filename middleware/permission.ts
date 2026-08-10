import { Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import User from "../modals/user/user";
import Permission from "../modals/permission/permission";
import { CustomRequest } from "../typeRequest/customReq";

/**
 * Enterprise Authorization Middleware
 * Verifies permission using hierarchical naming conventions: <namespace>.<action>
 * Example: verifyPermission("platform.accountType.create")
 */
export const verifyPermission = (permissionName: string) => {
    return async (req: CustomRequest, res: Response, next: NextFunction) => {
        try {
            const tokenUser = req.user;
            if (!tokenUser || !tokenUser.id) {
                res.status(StatusCodes.UNAUTHORIZED).json({
                    success: false,
                    message: "Unauthorized: User token missing or invalid",
                });
                return;
            }

            // Fetch user from DB to verify current status and role
            const user = await User.findByPk(tokenUser.id, {
                include: [
                    {
                        model: Permission,
                        as: "permissions",
                        through: { attributes: [] },
                        required: false,
                    },
                ],
            });

            if (!user) {
                res.status(StatusCodes.UNAUTHORIZED).json({
                    success: false,
                    message: "Unauthorized: User not found",
                });
                return;
            }

            if (user.isActive === false) {
                res.status(StatusCodes.FORBIDDEN).json({
                    success: false,
                    message: "Forbidden: Account is inactive",
                });
                return;
            }

            const isPlatformSuperAdmin =
                user.Type === "superadmin" &&
                (user.company_id === null || user.company_id === undefined);

            // Platform Module Governance
            if (permissionName.startsWith("platform.")) {
                const isReadOperation = permissionName.endsWith(".read");

                if (isReadOperation) {
                    // Both Platform Super Admin and Company Users can read Platform Masters for ERP dropdowns
                    return next();
                }

                // Platform mutations (create, update, delete) are strictly restricted to Platform Super Admin
                if (!isPlatformSuperAdmin) {
                    res.status(StatusCodes.FORBIDDEN).json({
                        success: false,
                        message:
                            "Forbidden: Only Platform Super Admin can modify platform master data",
                    });
                    return;
                }

                return next();
            }

            // Non-platform / Company Domain Governance
            // Platform Super Admin has full global access
            if (isPlatformSuperAdmin) {
                return next();
            }

            // Company Admin has full access within company
            if (user.Type === "admin" && user.company_id) {
                return next();
            }

            // Check if user has explicit permission assigned
            const userPermissions = (user as any).permissions || [];
            const hasPermission = userPermissions.some(
                (p: any) => p.name === permissionName
            );

            if (!hasPermission) {
                res.status(StatusCodes.FORBIDDEN).json({
                    success: false,
                    message: `Forbidden: Missing required permission '${permissionName}'`,
                });
                return;
            }

            return next();
        } catch (error: any) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || "Internal authorization error",
            });
            return;
        }
    };
};

/**
 * Legacy checkPermission middleware helper mapped to verifyPermission
 */
export const checkPermission = (module: string, action: string) => {
    const permissionName = `${module}.${action}`;
    return verifyPermission(permissionName);
};

export default verifyPermission;