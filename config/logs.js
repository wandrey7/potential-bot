import { existsSync, mkdirSync } from "fs";
import path from "path";
import P from "pino";

const __dirname = path.resolve();

const logFilePath = path.resolve(__dirname, "assets", "logs", "log");
const errorLogFilePath = path.resolve(__dirname, "assets", "logs", "error");
const logDirPath = path.resolve(__dirname, "assets", "logs");

// Create logs directory if it doesn't exist (Pino doesn't create it automatically)
if (!existsSync(logDirPath)) {
  mkdirSync(logDirPath, { recursive: true });
}

// Logger base with the lowest level to capture eveything
const baseLogger = P(
  P.transport({
    targets: [
      {
        target: "pino-roll",
        level: "info",
        options: {
          file: logFilePath,
          frequency: "daily",
          size: "10M",
          limit: {
            count: 7,
          },
          mkdir: true,
        },
      },
      {
        target: "pino-roll",
        level: "error",
        options: {
          file: errorLogFilePath,
          frequency: "daily",
          size: "10M",
          limit: {
            count: 30,
          },
          mkdir: true,
        },
      },
      {
        target: "pino-pretty",
        level: "info",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname,service",
          hideObject: false,
        },
      },
    ],
  })
);

// Logger for Baileys - only shows errors in the console
const baileysLogger = P(
  P.transport({
    targets: [
      {
        target: "pino-roll",
        level: "error",
        options: {
          file: errorLogFilePath,
          frequency: "daily",
          size: "10M",
          limit: {
            count: 30,
          },
          mkdir: true,
        },
      },
      {
        target: "pino-pretty",
        level: "error",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname,service",
          hideObject: false,
        },
      },
    ],
  })
);

// Logger for the application - shows info in the console
const appLogger = baseLogger.child({ level: "info" });

// Logger that only writes to files, without console output
const fileLogger = P(
  P.transport({
    targets: [
      {
        target: "pino-roll",
        level: "info",
        options: {
          file: logFilePath,
          frequency: "daily",
          size: "10M",
          limit: {
            count: 7,
          },
          mkdir: true,
        },
      },
      {
        target: "pino-roll",
        level: "error",
        options: {
          file: errorLogFilePath,
          frequency: "daily",
          size: "10M",
          limit: {
            count: 30,
          },
          mkdir: true,
        },
      },
    ],
  })
);

export { appLogger, baileysLogger, fileLogger };
