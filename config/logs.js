import path from "path";
import P from "pino";

const LOG_DIR = path.resolve("assets", "logs");

const ROLL_DEFAULTS = {
  frequency: "daily",
  size: "10M",
  mkdir: true,
};

const infoFileTarget = {
  target: "pino-roll",
  level: "info",
  options: {
    file: path.resolve(LOG_DIR, "log"),
    limit: { count: 7 },
    ...ROLL_DEFAULTS,
  },
};

const errorFileTarget = {
  target: "pino-roll",
  level: "error",
  options: {
    file: path.resolve(LOG_DIR, "error"),
    limit: { count: 30 },
    ...ROLL_DEFAULTS,
  },
};

const prettyTarget = (level) => ({
  target: "pino-pretty",
  level,
  options: {
    colorize: true,
    translateTime: "SYS:standard",
    ignore: "pid,hostname,service",
  },
});

const appLogger = P(
  { level: "info" },
  P.transport({
    targets: [infoFileTarget, errorFileTarget, prettyTarget("info")],
  })
);

const baileysLogger = P(
  { level: "error" },
  P.transport({
    targets: [errorFileTarget, prettyTarget("error")],
  })
);

const fileLogger = P(
  { level: "info" },
  P.transport({
    targets: [infoFileTarget, errorFileTarget],
  })
);

export { appLogger, baileysLogger, fileLogger };
