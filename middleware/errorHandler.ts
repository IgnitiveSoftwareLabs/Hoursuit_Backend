import { Request, Response, NextFunction } from "express";

// Global error handler with TypeScript
const globalErrorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
    let message = err.message;
    if ((err as any).errors && Array.isArray((err as any).errors) && (err as any).errors.length > 0) {
        message = (err as any).errors.map((e: any) => e.message || e).join(", ");
    } else if ((err as any).parent && (err as any).parent.detail) {
        message = (err as any).parent.detail;
    }

    res.status(statusCode).json({
        message,
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
