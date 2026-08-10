declare namespace Express {
    interface Request {
        user?: any;
        session?: any;
        startTime?: number;
        modelName?: string;
    }
}
