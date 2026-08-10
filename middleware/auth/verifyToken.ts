import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { CustomRequest } from "../../typeRequest/customReq";
import UserSession from "../../modals/userSession/userSession";
import dotenv from "dotenv";
dotenv.config();

const verifyToken = async (
    req: CustomRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ message: "Unauthorized: No token provided" });
            return;
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            res.status(401).json({ message: "Unauthorized: Token missing" });
            return;
        }

        // Verify the token
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);

        // Check if session exists and is active
        const session = await UserSession.findOne({
            where: {
                sessionToken: token,
                userId: decoded.id,
                isActive: true,
                expiresAt: {
                    [require('sequelize').Op.gt]: new Date()
                }
            }
        });

        if (!session) {
            res.status(401).json({
                message: "Session expired or invalid. Please login again.",
                sessionExpired: true
            });
            return;
        }

        // Update last activity
        await session.updateActivity();

        // Attach decoded data to `req.user` and session info
        req.user = decoded;
        req.session = session;
        const userid = req.user;
        userid;
        console.log("req.user", req.user);

        // Call `next()` to pass control to the next middleware/handler
        next();
    } catch (error: any) {
        console.error("Error verifying token:", error.message);
        if (error.name === 'TokenExpiredError') {
            res.status(401).json({
                message: "Token expired. Please login again.",
                sessionExpired: true
            });
        } else {
            res.status(403).json({ message: "Forbidden: Invalid token" });
        }
    }
};

export default verifyToken;