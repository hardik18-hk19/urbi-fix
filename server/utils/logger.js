import fs from "fs";
import path from "path";

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Log levels
const LOG_LEVELS = {
  ERROR: "ERROR",
  WARN: "WARN",
  INFO: "INFO",
  DEBUG: "DEBUG",
};

// Color codes for console output
const COLORS = {
  ERROR: "\x1b[31m", // Red
  WARN: "\x1b[33m", // Yellow
  INFO: "\x1b[36m", // Cyan
  DEBUG: "\x1b[35m", // Magenta
  RESET: "\x1b[0m", // Reset
};

class Logger {
  constructor() {
    this.logFile = path.join(
      logsDir,
      `app-${new Date().toISOString().split("T")[0]}.log`
    );
  }

  // Format log message
  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaString = Object.keys(meta).length > 0 ? JSON.stringify(meta) : "";
    return `[${timestamp}] [${level}] ${message} ${metaString}`.trim();
  }

  // Write to file
  writeToFile(message) {
    try {
      fs.appendFileSync(this.logFile, message + "\n");
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
  }

  // Log to console with colors
  logToConsole(level, message) {
    const color = COLORS[level] || COLORS.RESET;
    console.log(`${color}${message}${COLORS.RESET}`);
  }

  // Generic log method
  log(level, message, meta = {}) {
    const formattedMessage = this.formatMessage(level, message, meta);

    // Log to console in development
    if (process.env.NODE_ENV !== "production") {
      this.logToConsole(level, formattedMessage);
    }

    // Always log to file
    this.writeToFile(formattedMessage);
  }

  // Specific log level methods
  error(message, meta = {}) {
    this.log(LOG_LEVELS.ERROR, message, meta);
  }

  warn(message, meta = {}) {
    this.log(LOG_LEVELS.WARN, message, meta);
  }

  info(message, meta = {}) {
    this.log(LOG_LEVELS.INFO, message, meta);
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV === "development") {
      this.log(LOG_LEVELS.DEBUG, message, meta);
    }
  }

  // Log HTTP requests
  logRequest(req, res, duration) {
    const { method, url, ip } = req;
    const { statusCode } = res;
    const userAgent = req.get("User-Agent") || "";

    this.info(`${method} ${url}`, {
      statusCode,
      duration: `${duration}ms`,
      ip,
      userAgent,
    });
  }

  // Log errors with stack trace
  logError(error, req = null) {
    const meta = {
      stack: error.stack,
      ...(req && {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      }),
    };

    this.error(error.message, meta);
  }
}

// Create singleton instance
const logger = new Logger();

// Express middleware for request logging
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.logRequest(req, res, duration);
  });

  next();
};

export default logger;
