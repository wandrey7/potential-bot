import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "baileys";
import NodeCache from "node-cache";
import path from "path";
import QRCode from "qrcode";
import { config } from "./config/config.js";
import { appLogger, baileysLogger } from "./config/logs.js";

const __dirname = path.resolve();
const groupCache = new NodeCache({
  /* ... */
});

export const connect = async () => {
  const { state, saveCreds } = await useMultiFileAuthState(
    path.resolve(__dirname, "assets", "auth", "baileys")
  );
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    printQRInTerminal: false,
    auth: state,
    logger: baileysLogger,
    browser: Browsers.ubuntu("Desktop"),
    cachedGroupMetadata: async (jid) => groupCache.get(jid),
    markOnlineOnConnect: false,
    syncFullHistory: false,
    retryRequestDelayMs: 1000,
    maxRetries: 3,
    appStateMacVerification: {
      patch: true,
      snapshot: true,
    },
    getMessage: async (key) => {
      // Implementação básica para evitar erros de descriptografia
      return {
        conversation: "",
      };
    },
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const qrCode = await QRCode.toString(qr, {
          type: "terminal",
          small: true,
        });
        console.log(
          "\n\x1b[32m%s\x1b[0m",
          "SCAN THE QR CODE BELOW TO CONNECT:"
        );
        console.log(qrCode);
        console.log(
          "\x1b[33m%s\x1b[0m",
          "Note: QR code will expire in 60 seconds"
        );
        appLogger.info("QR Code received, scan it to authenticate.");
      } catch (error) {
        console.error("Error generating QR code:", error.message);
        appLogger.error("Error generating QR code:", error.message);
      }
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isError = lastDisconnect?.error;

      appLogger.warn("Connection closed", {
        statusCode,
        isError: isError ? isError.toString() : "Unknown error",
        shouldReconnect: statusCode !== DisconnectReason.loggedOut,
      });

      // Tratamento especial para erros de stream 515
      let shouldClearAuth = false;
      if (
        isError &&
        isError.toString().includes("stream errored out") &&
        statusCode === 515
      ) {
        appLogger.error(
          "Critical stream error 515 detected - may require re-pairing",
          {
            error: isError.toString(),
            code: statusCode,
          }
        );
        shouldClearAuth = true;
      }

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        // Delay progressivo para reconexão
        const reconnectDelay = Math.min(
          10000,
          config.TIMEOUT_IN_MILI_BY_EVENT * 2
        );
        appLogger.info("Reconnecting in " + reconnectDelay + "ms...");

        setTimeout(async () => {
          // Limpar estado de autenticação apenas se necessário
          if (shouldClearAuth) {
            try {
              const fs = require("fs");
              const authPath = path.resolve(
                __dirname,
                "assets",
                "auth",
                "baileys"
              );
              if (fs.existsSync(authPath)) {
                fs.rmSync(authPath, { recursive: true, force: true });
                fs.mkdirSync(authPath, { recursive: true });
                appLogger.info("Auth state cleared due to stream error");
              }
            } catch (err) {
              appLogger.error("Failed to clear auth state", {
                error: err.message,
              });
            }
          }
          await connect();
        }, reconnectDelay);
      } else {
        appLogger.error("Logged out - statusCode: " + statusCode);
        process.exit(1);
      }
    } else if (connection === "open") {
      appLogger.info("Connected successfully!");
    } else if (connection === "connecting") {
      appLogger.info("Connecting...");
    } else {
      appLogger.info("Connection state changed:" + connection);
    }
  });

  sock.ev.on("creds.update", saveCreds);
  return sock;
};
// `
