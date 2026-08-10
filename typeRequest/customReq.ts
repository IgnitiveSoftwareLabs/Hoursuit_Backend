import { Request } from "express";

// Custom type extending Request to include `user` and `session`
export interface CustomRequest extends Request {
    user?: any; // Replace `any` with your specific `User` type if available
    session?: any; // Session information for the current user
    startTime?: number; // For logging middleware
    modelName?: string; // For logging middleware
}
