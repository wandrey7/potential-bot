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

// Reconnection attempt counter
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let listenersRegistered = false;

// onReady will be invoked once per socket instance (initial + every reconnect)
export const connect = async (onReady) => {
  const { state, saveCreds } = await useMultiFileAuthState(
    path.resolve(__dirname, "assets", "auth", "baileys"),
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
    keepAliveIntervalMs: 30_000,
  });

  const clearAuth = () => {
    const authDir = path.resolve(__dirname, "assets", "auth", "baileys");
    if (existsSync(authDir)) {
      try {
        rmSync(authDir, { recursive: true, force: true });
        appLogger.info("Auth state cleared.");
      } catch (err) {
        appLogger.error("Failed to clear auth state: %s", err.message);
      }
    }
    listenersRegistered = false;
  };

  const scheduleReconnect = (ms) => {
    appLogger.info("Reconnecting in %dms...", ms);
    setTimeout(async () => {
      try {
        await connect(onReady);
      } catch (err) {
        appLogger.error("Reconnection failed: %s", err.message);
      }
    }, ms);
  };

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !state?.creds?.registered) {
      try {
        const qrCode = await QRCode.toString(qr, {
          type: "terminal",
          small: true,
        });
        console.log(
          "\n\x1b[32m%s\x1b[0m",
          "SCAN THE QR CODE BELOW TO CONNECT:",
        );
        console.log(qrCode);
        console.log(
          "\x1b[33m%s\x1b[0m",
          "Note: QR code will expire in 60 seconds",
        );
        appLogger.info("QR Code received, scan it to authenticate.");
      } catch (error) {
        appLogger.error("Error generating QR code: %s", error.message);
      }
    } else if (qr && state?.creds?.registered) {
      appLogger.info("QR code ignorado: credenciais ja registradas.");
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;

      appLogger.info(
        "Connection closed (attempt %d/%d), status: %s",
        reconnectAttempts,
        MAX_RECONNECT_ATTEMPTS,
        statusCode,
      );

      switch (statusCode) {
        case DisconnectReason.loggedOut:
        case DisconnectReason.badSession:
          clearAuth();
          reconnectAttempts++;
          if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
            appLogger.error(
              "Reconnect limit reached. Cooling down for 2 min...",
            );
            reconnectAttempts = 0;
            scheduleReconnect(120_000);
          } else {
            scheduleReconnect(3_000);
          }
          break;
        case DisconnectReason.restartRequired:
          scheduleReconnect(1_000);
          break;
        case 428:
        case DisconnectReason.connectionClosed:
        case DisconnectReason.connectionLost:
        default:
          reconnectAttempts++;

          if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
            appLogger.error(
              "Reconnect limit reached. Cooling down for 2 min...",
            );
            reconnectAttempts = 0;
            scheduleReconnect(120_000);
          } else {
            const delay = Math.min(1000 * 2 ** reconnectAttempts, 30_000);
            scheduleReconnect(delay);
          }
          break;
      }
    } else if (connection === "open") {
      reconnectAttempts = 0;
      appLogger.info("✅ Socket conectado, registrando listeners...");

      if (typeof onReady === "function") {
        try {
          await onReady(sock, listenersRegistered);
          listenersRegistered = true;
        } catch (err) {
          appLogger.error("Error running onReady for socket %o", {
            error: err?.message,
            stack: err?.stack,
          });
        }
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);
  return sock;
};
