import { appLogger } from "../config/logs";

export const getUserDisplayName = async (jid, socket, remoteJid) => {
  try {
    const contact = socket.store.contacts?.[jid];
    if (contact?.notify) {
      return `@${contact.notify}`;
    }

    if (remoteJid.includes("@g.us")) {
      const groupMetadata = await socket.groupMetadata(remoteJid);
      const participant = groupMetadata.participants.find((p) => p.id === jid);
      if (participant?.notify) {
        return `@${participant.notify}`;
      }
    }

    return `@${jid.split("@")[0]}`;
  } catch (error) {
    appLogger.error("Error getting user display name %o", {
      error: error.message,
      stack: error.stack,
      jid,
      remoteJid,
    });
    return `@${jid.split("@")[0]}`;
  }
};
