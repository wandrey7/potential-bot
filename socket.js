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
import { OWNER_NUMBER } from "./config/config.js";

// Resolve the directory of this file (robust under PM2/Docker/ESM)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const groupCache = new NodeCache({
  /* ... */
});

// Reconnection attempt counter
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
let pairingCodeRequested = false;

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

  if (!pairingCodeRequested && !state?.creds?.registered) {
    const ownerNumber = OWNER_NUMBER.replace(/\D/g, "");

    if (!ownerNumber) {
      appLogger.warn(
        "OWNER_NUMBER nao configurado. Nao foi possivel gerar pairing code.",
      );
    } else if (typeof sock?.requestPairingCode === "function") {
      pairingCodeRequested = true;
      try {
        const pairingCode = await sock.requestPairingCode(ownerNumber);
        console.log("\n\x1b[36m%s\x1b[0m", "PAIRING CODE:");
        console.log("\x1b[1m%s\x1b[0m", pairingCode);
        console.log(
          "\x1b[33m%s\x1b[0m",
          "Use este codigo em WhatsApp > Vincular dispositivo",
        );
        appLogger.info("Pairing code gerado com sucesso.");
      } catch (error) {
        appLogger.error("Falha ao solicitar pairing code: %s", error.message);
      }
    } else {
      appLogger.warn("Pairing code nao suportado nesta versao do Baileys.");
    }
  }

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
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;

      reconnectAttempts++;
      appLogger.info(
        "Connection closed (attempt %d/%d), status: %s",
        reconnectAttempts,
        MAX_RECONNECT_ATTEMPTS,
        statusCode,
      );

      if (isLoggedOut && reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        // Only clear auth after MAX attempts
        appLogger.error(
          "Max reconnect attempts reached (%d) - clearing auth state",
          MAX_RECONNECT_ATTEMPTS,
        );

        const authDir = path.resolve(__dirname, "assets", "auth", "baileys");
        if (existsSync(authDir)) {
          try {
            rmSync(authDir, { recursive: true, force: true });
            appLogger.info("Auth state cleared successfully");
          } catch (error) {
            appLogger.error("Failed to clear auth state: %s", error.message);
          }
        }

        pairingCodeRequested = false;

        reconnectAttempts = 0; // Reset counter after clearing
        appLogger.info("Restarting connection with clean state...");
        setTimeout(async () => {
          try {
            await connect(onReady);
          } catch (error) {
            appLogger.error("Failed to restart connection: %s", error.message);
          }
        }, 3000);
      } else {
        // Try to reconnect without clearing auth
        const delay = Math.min(5000 * reconnectAttempts, 30000); // Exponential backoff, max 30s
        appLogger.info("Attempting to reconnect in %dms...", delay);
        setTimeout(async () => {
          try {
            await connect(onReady);
          } catch (error) {
            appLogger.error("Reconnection failed: %s", error.message);
          }
        }, delay);
      }
    } else if (connection === "open") {
      reconnectAttempts = 0; // Reset counter on successful connection
      appLogger.info("✅ Socket conectado, registrando listeners...");
    }
  });

  sock.ev.on("creds.update", saveCreds);
  return sock;
};
