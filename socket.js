import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "baileys";
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
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        appLogger.info("Connection closed, reconnecting...");
        appLogger.info("Reason: %s", DisconnectReason[statusCode] || "unknown");
        setTimeout(async () => {
          await connect(onReady);
        }, 5000);
      } else {
        appLogger.error("Logged out");
      }
    } else if (connection === "open") {
      appLogger.info("Connected successfully!");
    }
  });

  sock.ev.on("creds.update", saveCreds);
  return sock;
};
