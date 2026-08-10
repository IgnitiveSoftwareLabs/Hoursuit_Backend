import { Response, Request, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import User from "../../modals/user/user";
// import Token from "../../modals/Token/Token";
import bcrypt from "bcryptjs";
// import crypto from "crypto";
import generateToken, {
    refreshToken,
} from "../../middleware/auth/generateToken";
// import SendMail from "../../utils/SendMail";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { StatusCodes } from "http-status-codes";
import { CustomRequest } from "../../typeRequest/customReq";
import { SessionManager } from "../../utils/sessionManager";
import UserPermission from "../../modals/userPermission/userPermission";
import Permission from "../../modals/permission/permission";
import sequelize from "../../dbconfig/dbconfig";

dotenv.config();

const UserCtr = {
    // Register ctr
    registerCtr: asyncHandler(
        async (req: Request, res: Response): Promise<any> => {
            const transaction = await sequelize.transaction();
            try {
                let { FirstName, LastName, Email, Phone, Password } = req.body;

                const hashpassword = await bcrypt.hash(Password, 10);
                Password = hashpassword;
                const existingUser = await User.findOne({ where: { Email } });
                if (existingUser) {
                    res.status(400);
                    throw new Error("User already exists with this email");
                }
                const response = await User.create(
                    {
                        FirstName,
                        LastName,
                        Email,
                        Password,
                        Phone,
                        Type: "superadmin",
                        isActive: true, 
                    },
                    { transaction }
                );

                if (!response) {
                    res.status(400);
                    throw new Error("User Not Found");
                }
                const allPermissions = await Permission.findAll({
                    attributes: ["id"],
                });

                // Assign all permissions to superadmin
                if (allPermissions.length > 0) {
                    const userPermissions = allPermissions.map((permission) => ({
                        userId: response.id,
                        permissionId: permission.id,
                    }));

                    await UserPermission.bulkCreate(userPermissions, { transaction });
                }

                await transaction.commit();
                return res.status(201).json({
                    message: "registration successfully completed",
                    success: true,
                });
            } catch (error: any) {
                throw new Error(error?.message);
            }
        }
    ),

    //Signin ctr
    loginCtr: asyncHandler(
        async (req: Request, res: Response): Promise<any> => {
            try {
                const { Email, Password } = req.body;

                if (!Email || !Password) {
                    res.status(400);
                    throw new Error("Email and Password are required");
                }

                // Find all users with this email
                const users = await User.findAll({ where: { Email } });

                if (!users || users.length === 0) {
                    res.status(400);
                    throw new Error("User not found. Please sign in.");
                }

                // Check password for each user
                const matchedUsers = [];
                for (const user of users) {
                    const isPasswordValid = await bcrypt.compare(Password, user.Password);
                    if (isPasswordValid) {
                        matchedUsers.push(user);
                    }
                }

                if (matchedUsers.length === 0) {
                    res.status(400);
                    throw new Error("Invalid email or password");
                }

                if (matchedUsers.length > 1) {
                    res.status(400);
                    throw new Error(
                        "Multiple accounts found with the same credentials, cannot login"
                    );
                }

                const loggedInUser = matchedUsers[0];

                if (loggedInUser.isActive === false) {
                    res.status(403);
                    throw new Error("User is not active");
                }

                // Generate tokens
                const token = await generateToken(
                    loggedInUser.id,
                    loggedInUser?.created_by
                );
                const refreshTokenValue = await refreshToken(
                    loggedInUser.id,
                    loggedInUser?.created_by
                );

                // Create session
                await SessionManager.createSession(loggedInUser.id, token, req);

                return res.status(200).json({
                    message: "Login Successfully",
                    result: token,
                    refreshToken: refreshTokenValue,
                    success: true,
                });
            } catch (error: any) {
                throw new Error(error?.message);
            }
        }
    ),

    //refresh token ctr
    refreshTokenCtr: asyncHandler(
        async (req: CustomRequest, res: Response): Promise<any> => {
            try {
                const { refreshTokens } = req.body;

                if (!refreshTokens) {
                    return res.status(400).json({ message: "Unauthorized" });
                }

                const decoded = jwt.verify(
                    refreshTokens,
                    process.env.JWT_SECRET as string
                ) as jwt.JwtPayload;

                const user = await User.findByPk(decoded.id);

                if (!user) {
                    res.status(404).json({ message: "User not found, Please login" });
                    return;
                }

                const newToken = await generateToken(user.id, user?.created_by);
                const refreshTokenValue = await refreshToken(user.id, user?.created_by);

                // Create new session and invalidate old ones for single device control
                await SessionManager.createSession(user.id, newToken, req);

                res.status(200).json({
                    success: true,
                    message: "Token Refreshed",
                    result: newToken,
                    refreshToken: refreshTokenValue,
                });
            } catch (error: any) {
                res.status(500).json({ success: false, message: error.message });
            }
        }
    ),

    // logout Ctr
    logoutCtr: asyncHandler(
        async (req: CustomRequest, res: Response): Promise<any> => {
            try {
                // Get token from authorization header
                const authHeader = req.headers.authorization;
                if (authHeader && authHeader.startsWith("Bearer ")) {
                    const token = authHeader.split(" ")[1];

                    // Invalidate the session
                    await SessionManager.invalidateSession(token);
                }

                res.cookie("jwt", "", {
                    httpOnly: true,
                    secure: true,
                    sameSite: "none",
                    expires: new Date(0),
                });
                res.status(200).json({
                    success: true,
                    message: "Logged Out",
                });
            } catch (error: any) {
                throw new Error(error?.message);
            }
        }
    ),

    // Get User Ctr
    getUserCtr: asyncHandler(
        async (req: CustomRequest, res: Response): Promise<any> => {
            try {
                const response = await User.findOne({
                    where: { id: req.user.id },
                    attributes: { exclude: ["Password"] },
                    include: [
                        {
                            model: Permission,
                            as: "permissions",
                            through: { attributes: [] },
                        },
                    ],
                });

                if (!response) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error("Bad request");
                }

                return res.status(StatusCodes.OK).json({
                    message: "User fetched",
                    result: response,
                    success: true,
                });
            } catch (error: any) {
                throw new Error(error?.message);
            }
        }
    ),

    // Create User Ctr
    createUser: asyncHandler(
        async (req: CustomRequest, res: Response): Promise<any> => {
            try {
                const {
                    FirstName,
                    LastName,
                    Email,
                    Phone,
                    Password,
                    Type,
                    permissionIds,
                } = req.body;

                // Check if current user is superadmin
                const currentUser = await User.findByPk(req.user.id);
                if (currentUser?.Type !== "superadmin") {
                    res.status(StatusCodes.FORBIDDEN);
                    throw new Error("Only superadmin can create users");
                }

                // Check if user already exists
                const existingUser = await User.findOne({
                    where: { Email, created_by: currentUser.id },
                });
                if (existingUser) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error("User with this email already exists");
                }

                // Hash password
                const hashpassword = await bcrypt.hash(Password, 10);

                // Create user
                const newUser = await User.create({
                    FirstName,
                    LastName,
                    Email,
                    Phone,
                    Password: hashpassword,
                    Type: Type || "operator",
                    created_by: currentUser.id, // Set the creator's user ID
                    isActive: true, // New users are active by default
                    company_id: currentUser.company_id, // Assign
                });

                // Assign permissions if provided
                //also verify the permissionIds are present or not
                const checkPerm = await Permission.findAll({
                    where: { id: permissionIds },
                });
                if (checkPerm.length === 0) {
                    res.status(StatusCodes.BAD_REQUEST);
                    throw new Error("Invalid permission IDs");
                }
                if (
                    permissionIds &&
                    permissionIds.length > 0 &&
                    checkPerm.length === permissionIds.length
                ) {
                    const userPermissions = permissionIds.map((permissionId: number) => ({
                        userId: newUser.id,
                        permissionId,
                    }));
                    await UserPermission.bulkCreate(userPermissions);
                }

                res.status(StatusCodes.CREATED).json({
                    message: "User created successfully",
                    success: true,
                    result: {
                        id: newUser.id,
                        FirstName: newUser.FirstName,
                        LastName: newUser.LastName,
                        Email: newUser.Email,
                        Type: newUser.Type,
                    },
                });
            } catch (error: any) {
                throw new Error(error.message);
            }
        }
    ),

    // Edit created user (only for superadmin who created the user)
    editCreatedUser: asyncHandler(
        async (req: CustomRequest, res: Response): Promise<any> => {
            try {
                const { userId }: any = req.params;
                const {
                    FirstName,
                    LastName,
                    Email,
                    Phone,
                    Type,
                    permissionIds,
                    isActive,
                } = req.body;

                // Check if current user is superadmin
                const currentUser = await User.findByPk(req.user.id);
                if (currentUser?.Type !== "superadmin") {
                    res.status(StatusCodes.FORBIDDEN);
                    throw new Error("Only superadmin can edit users");
                }

                // Find the user to be edited
                const userToEdit = await User.findByPk(userId);
                if (!userToEdit) {
                    res.status(StatusCodes.NOT_FOUND);
                    throw new Error("User not found");
                }

                // Check if the current user created this user (or if it's a superadmin editing)
                if (
                    userToEdit.created_by !== currentUser.id &&
                    userToEdit.Type === "superadmin"
                ) {
                    res.status(StatusCodes.FORBIDDEN);
                    throw new Error(
                        "You can only edit users you created. Superadmin users cannot be edited by other superadmins."
                    );
                }

                // Check if email is being changed and if it already exists
                if (Email && Email !== userToEdit.Email) {
                    const existingUser = await User.findOne({
                        where: { Email, id: { [Op.ne]: userId } },
                    });
                    if (existingUser) {
                        res.status(StatusCodes.BAD_REQUEST);
                        throw new Error("User with this email already exists");
                    }
                }

                // Start transaction for atomic operation
                const transaction = await sequelize.transaction();

                try {
                    // Update user basic information
                    const updateData: any = {};
                    if (FirstName) updateData.FirstName = FirstName;
                    if (LastName) updateData.LastName = LastName;
                    if (Email) updateData.Email = Email;
                    if (Phone) updateData.Phone = Phone;
                    if (Type) updateData.Type = Type;
                    if (typeof isActive === "boolean") updateData.isActive = isActive;

                    await userToEdit.update(updateData, { transaction });

                    // Update permissions if provided
                    if (permissionIds && Array.isArray(permissionIds)) {
                        // Verify all permission IDs exist
                        const validPermissions = await Permission.findAll({
                            where: { id: permissionIds },
                            transaction,
                        });

                        if (validPermissions.length !== permissionIds.length) {
                            await transaction.rollback();
                            res.status(StatusCodes.BAD_REQUEST);
                            throw new Error("Some permission IDs are invalid");
                        }

                        // Remove existing permissions
                        await UserPermission.destroy({
                            where: { userId: userToEdit.id },
                            transaction,
                        });

                        // Add new permissions
                        if (permissionIds.length > 0) {
                            const userPermissions = permissionIds.map(
                                (permissionId: number) => ({
                                    userId: userToEdit.id,
                                    permissionId,
                                })
                            );
                            await UserPermission.bulkCreate(userPermissions, { transaction });
                        }
                    }

                    await transaction.commit();

                    // Fetch updated user with permissions
                    const updatedUser = await User.findByPk(userToEdit.id, {
                        attributes: { exclude: ["Password"] },
                        include: [
                            {
                                model: Permission,
                                as: "permissions",
                                through: { attributes: [] },
                            },
                            {
                                model: User,
                                as: "creator",
                                attributes: ["id", "FirstName", "LastName", "Email"],
                            },
                        ],
                    });

                    res.status(StatusCodes.OK).json({
                        message: "User updated successfully",
                        success: true,
                        result: updatedUser,
                    });
                } catch (error) {
                    await transaction.rollback();
                    throw error;
                }
            } catch (error: any) {
                throw new Error(error.message);
            }
        }
    ),

    // Delete created user (only for superadmin who created the user)
    deleteCreatedUser: asyncHandler(
        async (req: CustomRequest, res: Response): Promise<any> => {
            try {
                const { userId }: any = req.params;

                // Check if current user is superadmin
                const currentUser = await User.findByPk(req.user.id);
                if (currentUser?.Type !== "superadmin") {
                    res.status(StatusCodes.FORBIDDEN);
                    throw new Error("Only superadmin can delete users");
                }

                // Find the user to be deleted
                const userToDelete = await User.findByPk(userId);
                if (!userToDelete) {
                    res.status(StatusCodes.NOT_FOUND);
                    throw new Error("User not found");
                }

                // Check if the current user created this user
                if (userToDelete.created_by !== currentUser.id) {
                    res.status(StatusCodes.FORBIDDEN);
                    throw new Error("You can only delete users you created");
                }

                // Prevent deletion of superadmin users
                if (userToDelete.Type === "superadmin") {
                    res.status(StatusCodes.FORBIDDEN);
                    throw new Error("Superadmin users cannot be deleted");
                }

                // Start transaction for atomic operation
                const transaction = await sequelize.transaction();

                try {
                    // Delete user permissions first
                    await UserPermission.destroy({
                        where: { userId: userToDelete.id },
                        transaction,
                    });

                    // Delete the user
                    await userToDelete.destroy({ transaction });

                    await transaction.commit();

                    res.status(StatusCodes.OK).json({
                        message: "User deleted successfully",
                        success: true,
                        result: {
                            deletedUserId: userId,
                            deletedUserEmail: userToDelete.Email,
                        },
                    });
                } catch (error) {
                    await transaction.rollback();
                    throw error;
                }
            } catch (error: any) {
                throw new Error(error.message);
            }
        }
    ),

    // Get all users (only for superadmin)
    getAllUsers: asyncHandler(
        async (req: CustomRequest, res: Response): Promise<any> => {
            try {
                const currentUser = await User.findByPk(req.user.id);
                if (currentUser?.Type !== "superadmin") {
                    res.status(StatusCodes.FORBIDDEN);
                    throw new Error("Only superadmin can view all users");
                }

                const { page = 1, limit = 10, search } = req.query;
                const offset = (Number(page) - 1) * Number(limit);

                const whereClause: any = {
                    created_by: currentUser.id,
                };
                if (search) {
                    whereClause[Op.or] = [
                        { FirstName: { [Op.like]: `%${search}%` } },
                        { LastName: { [Op.like]: `%${search}%` } },
                        { Email: { [Op.like]: `%${search}%` } },
                    ];
                }

                const { rows: users, count: total } = await User.findAndCountAll({
                    where: whereClause,
                    attributes: { exclude: ["Password"] },
                    include: [
                        {
                            model: Permission,
                            as: "permissions",
                            through: { attributes: [] },
                        },
                    ],
                    offset,
                    limit: Number(limit),
                    order: [["createdAt", "DESC"]],
                });

                res.status(StatusCodes.OK).json({
                    message: "Users fetched successfully",
                    success: true,
                    result: users,
                    pagination: {
                        total,
                        page: Number(page),
                        limit: Number(limit),
                        totalPages: Math.ceil(total / Number(limit)),
                    },
                });
            } catch (error: any) {
                throw new Error(error.message);
            }
        }
    ),
}

export default UserCtr;