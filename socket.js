import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "baileys";
import NodeCache from "node-cache";
import path from "path";
import QRCode from "qrcode";
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
    browser: ["Chrome (Linux)", "", ""],
    cachedGroupMetadata: async (jid) => groupCache.get(jid),
    markOnlineOnConnect: false,
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
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        appLogger.info("Connection closed, reconnecting...");
        setTimeout(async () => {
          await connect();
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
