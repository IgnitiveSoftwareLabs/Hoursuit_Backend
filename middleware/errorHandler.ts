import { Request, Response, NextFunction } from "express";

// Global error handler with TypeScript
const globalErrorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === "production" ? null : err.stack, // Hide stack in production
    });
};

// 404 Not Found handler with TypeScript
const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
    const error = new Error(`No route found for ${req.originalUrl}`);
    res.status(404);
    res.send("This route does not exist");
};

export { globalErrorHandler, notFoundHandler };
