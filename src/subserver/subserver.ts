import express, { Express } from "express";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import fs from "fs";

import indexRouter from "../../router/index";
import {
  globalErrorHandler,
  notFoundHandler,
} from "../../middleware/errorHandler";

const path = require("path");

// ANSI color codes for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m", // 5xx errors
  yellow: "\x1b[33m", // 4xx errors
  green: "\x1b[32m", // 2xx success
  cyan: "\x1b[36m", // 3xx redirects
  gray: "\x1b[90m", // timestamps
};

const createApp = (): Express => {
  const app = express();
app.set("trust proxy", "loopback");

  // Setup logging directory
  const logsDir = path.resolve(__dirname, "../../logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Create log stream for file logging
  const accessLogStream = fs.createWriteStream(
    path.join(logsDir, "access.log"),
    { flags: "a" }
  );

  // Custom timestamp token with Indian timezone
  morgan.token("timestamp", () => {
    return new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  });

  // Custom colored status token
  morgan.token("colored-status", (req: any, res: any) => {
    const status = res.statusCode;
    let color = colors.reset;

    if (status >= 500) {
      color = colors.red; // Server errors
    } else if (status >= 400) {
      color = colors.yellow; // Client errors
    } else if (status >= 300) {
      color = colors.cyan; // Redirects
    } else if (status >= 200) {
      color = colors.green; // Success
    }

    return `${color}${status}${colors.reset}`;
  });

  // Format for console with colors
  const consoleFormat = `${colors.gray}[:timestamp]${colors.reset} :method :url :colored-status :response-time ms - IP: :remote-addr`;

  // Format for file without colors (plain text)
  const fileFormat =
    '[:timestamp] :method :url :status :response-time ms - IP: :remote-addr - User-Agent: ":user-agent"';

  // Static files
  app.use(
    "/uploads",
    express.static(path.resolve(__dirname, "../../../uploads"))
  );

  // 1. CORS MUST come before rate limiter to handle preflight requests
  const corsOptions = {
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
  };
  app.use(cors(corsOptions));
  // app.options("*", cors(corsOptions));

  // 2. Helmet (but after CORS)
  app.use(helmet());

  // 3. Rate limiter
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === "OPTIONS",
    handler: (req, res) => {
      res.status(429).json({
        error: "Too many requests from this IP, please try again later.",
      });
    },
  });
  app.use(limiter);

  // 4. Morgan logging
  // Console logging with colors
  app.use(morgan(consoleFormat));

  // File logging without colors (plain text)
  app.use(morgan(fileFormat, { stream: accessLogStream }));

  app.use(cookieParser());
  app.use(bodyParser.json({ limit: "50mb" }));
  app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

  // 5. Routes
  app.use("/api", indexRouter);

  // 6. Error handlers (must be last)
  app.use(globalErrorHandler);
  app.use(notFoundHandler);

  return app;
};

export default createApp;