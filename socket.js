import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "baileys";
import { existsSync, rmSync } from "fs";
import NodeCache from "node-cache";
import path from "path";
import QRCode from "qrcode";
import { fileURLToPath } from "url";
import { appLogger, baileysLogger } from "./config/logs.js";

// Resolve the directory of this file (robust under PM2/Docker/ESM)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const groupCache = new NodeCache({
  /* ... */
});

// onReady will be invoked once per socket instance (initial + every reconnect)
export const connect = async (onReady) => {
  const { state, saveCreds } = await useMultiFileAuthState(
    path.resolve(__dirname, "assets", "auth", "baileys")
  );
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    printQRInTerminal: false,
    auth: state,
    logger: baileysLogger,
    browser: ["Chrome (Linux)", "", ""],
    cachedGroupMetadata: async (jid) => groupCache.get(jid),
    markOnlineOnConnect: false,
  });

  // Register app listeners for this socket instance immediately
  if (typeof onReady === "function") {
    try {
      await onReady(sock);
    } catch (err) {
      appLogger.error("Error running onReady for socket %o", {
        error: err?.message,
        stack: err?.stack,
      });
    }
  }

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
        appLogger.error("Error generating QR code: %s", error.message);
      }
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      appLogger.info("Connection closed, reconnecting %s", shouldReconnect);

      if (shouldReconnect) {
        appLogger.info("Attempting to reconnect...");
        setTimeout(async () => {
          try {
            await connect(onReady);
          } catch (error) {
            appLogger.error("Reconnection failed: %s", error.message);
          }
        }, 5000);
      } else {
        appLogger.error(
          "Logged out - clearing auth state and restarting connection"
        );

        // Clear auth state when logged out
        const authDir = path.resolve(__dirname, "assets", "auth", "baileys");
        if (existsSync(authDir)) {
          try {
            rmSync(authDir, { recursive: true, force: true });
            appLogger.info("Auth state cleared successfully");
          } catch (error) {
            appLogger.error("Failed to clear auth state: %s", error.message);
          }
        }

        // Restart connection after cleanup - NO process exit
        appLogger.info("Restarting connection with clean state...");
        setTimeout(async () => {
          try {
            await connect(onReady);
          } catch (error) {
            appLogger.error("Failed to restart connection: %s", error.message);
          }
        }, 3000);
      }
    } else if (connection === "open") {
      appLogger.info("✅ Socket conectado, registrando listeners...");
    }
  });

  sock.ev.on("creds.update", saveCreds);
  return sock;
};
