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
    auth: state, // auth state of your choosing,
    logger: baileysLogger, // Pino logger instance para Baileys (apenas erros)
    browser: Browsers.ubuntu("Desktop"), // set a browser
    cachedGroupMetadata: async (jid) => groupCache.get(jid),
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
      appLogger.warn("Closed Conection, trying to reconnect...");
      const shoudReconect =
        lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shoudReconect) {
        setTimeout(async () => {
          appLogger.info("Trying to reconnect...");
          await connect();
        }, config.TIMEOUT_IN_MILI_BY_EVENT);
      } else {
        appLogger.error("You have been logged out.");
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
