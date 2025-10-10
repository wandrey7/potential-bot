import { appLogger } from "../config/logger.js";

export const convertLid = async ({ socket, messages }) => {
  let targetJid = messages[0].key.remoteJid;
  const isLid = targetJid.includes("@lid");

  if (!isLid) {
    try {
      const lid = await socket.signalRepository?.lidMapping?.getLIDForPN(
        targetJid
      );
      if (lid) {
        targetJid = lid;
      }
    } catch (err) {
      appLogger.error("Failed to convert to LID: %o", {
        error: err.message,
        targetJid,
      });
    }
  }

  return targetJid;
};
