import UserSession from "../modals/userSession/userSession";
import { Request } from "express";

export interface DeviceInfo {
    deviceType: string;
    os: string;
    browser: string;
    version: string;
}

export class SessionManager {
    /**
     * Extract device information from user agent
     */
    static extractDeviceInfo(userAgent: string): DeviceInfo {
        const deviceInfo: DeviceInfo = {
            deviceType: "unknown",
            os: "unknown",
            browser: "unknown",
            version: "unknown"
        };

        if (!userAgent) return deviceInfo;

        // Detect device type
        if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(userAgent)) {
            deviceInfo.deviceType = "mobile";
        } else if (/Tablet|iPad/i.test(userAgent)) {
            deviceInfo.deviceType = "tablet";
        } else {
            deviceInfo.deviceType = "desktop";
        }

        // Detect OS
        if (/Windows/i.test(userAgent)) {
            deviceInfo.os = "Windows";
        } else if (/Mac OS X/i.test(userAgent)) {
            deviceInfo.os = "macOS";
        } else if (/Linux/i.test(userAgent)) {
            deviceInfo.os = "Linux";
        } else if (/Android/i.test(userAgent)) {
            deviceInfo.os = "Android";
        } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
            deviceInfo.os = "iOS";
        }

        // Detect browser
        if (/Chrome/i.test(userAgent) && !/Chromium|Edge/i.test(userAgent)) {
            deviceInfo.browser = "Chrome";
        } else if (/Firefox/i.test(userAgent)) {
            deviceInfo.browser = "Firefox";
        } else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
            deviceInfo.browser = "Safari";
        } else if (/Edge/i.test(userAgent)) {
            deviceInfo.browser = "Edge";
        } else if (/Opera/i.test(userAgent)) {
            deviceInfo.browser = "Opera";
        }

        return deviceInfo;
    }

    /**
     * Get client IP address from request
     */
    static getClientIP(req: Request): string {
        return (
            (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
            (req.headers["x-real-ip"] as string) ||
            req.connection?.remoteAddress ||
            req.socket?.remoteAddress ||
            "unknown"
        );
    }

    /**
     * Create a new session for user
     */
    static async createSession(
        userId: number,
        sessionToken: string,
        req: Request,
        expiresIn: number = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    ): Promise<UserSession> {
        const userAgent = req.headers["user-agent"] || "";
        const deviceInfo = this.extractDeviceInfo(userAgent);
        const ipAddress = this.getClientIP(req);

        // Invalidate all existing sessions for this user (single device policy)
        await UserSession.invalidateOtherSessions(userId);

        // Create new session
        const session = await UserSession.create({
            userId,
            sessionToken,
            deviceInfo: JSON.stringify(deviceInfo),
            ipAddress,
            userAgent,
            isActive: true,
            lastActivity: new Date(),
            expiresAt: new Date(Date.now() + expiresIn),
        });

        return session;
    }

    /**
     * Invalidate a specific session
     */
    static async invalidateSession(sessionToken: string): Promise<boolean> {
        const session = await UserSession.findOne({
            where: { sessionToken, isActive: true }
        });

        if (session) {
            await session.invalidate();
            return true;
        }

        return false;
    }

    /**
     * Invalidate all sessions for a user
     */
    static async invalidateAllUserSessions(userId: number): Promise<void> {
        await UserSession.invalidateOtherSessions(userId);
    }

    /**
     * Clean up expired sessions (can be run as a cron job)
     */
    static async cleanupExpiredSessions(): Promise<number> {
        const result = await UserSession.update(
            { isActive: false },
            {
                where: {
                    expiresAt: {
                        [require('sequelize').Op.lt]: new Date()
                    },
                    isActive: true
                }
            }
        );

        return result[0]; // Number of affected rows
    }

    /**
     * Get active session for user
     */
    static async getActiveSession(userId: number): Promise<UserSession | null> {
        return await UserSession.findOne({
            where: {
                userId,
                isActive: true,
                expiresAt: {
                    [require('sequelize').Op.gt]: new Date()
                }
            },
            order: [['lastActivity', 'DESC']]
        });
    }

    /**
     * Validate if session is still active and not expired
     */
    static async validateSession(sessionToken: string): Promise<UserSession | null> {
        return await UserSession.findOne({
            where: {
                sessionToken,
                isActive: true,
                expiresAt: {
                    [require('sequelize').Op.gt]: new Date()
                }
            }
        });
    }
}