import { isJidGroup } from "baileys";
import { OWNER_NUMBER } from "../config/config.js";

/**
 * Check if the sender has the required permission level.
 * @param {Object} params - The parameters object.
 * @param {string} params.type - The required permission type ('member', 'admin', 'owner').
 * @param {Object} params.socket - The Baileys socket instance.
 * @param {string} params.senderJid - The JID of the message sender.
 * @param {string} params.remoteJid - The JID of the chat (group or individual).
 * @returns {Promise<boolean>} - Returns true if the sender has the required permission, false otherwise.
 *
 * Logic:
 * - If the sender is the bot owner, always return true.
 * - If the required type is 'member', always return true.
 * - If the required type is 'admin':
 *   - Check if the chat is a group; if not, return false.
 *   - Fetch group metadata and check if the sender is an admin or group owner.
 * - If the required type is 'owner', always return false (only bot owner has this).
 * - For any other type, return false.
 **/
export const checkPermission = async ({
  type,
  socket,
  senderJid,
  remoteJid,
}) => {
  const senderNumber = senderJid?.split("@")[0];
  if (senderJid && senderNumber === OWNER_NUMBER) {
    return true;
  }

  if (type === "member") {
    return true;
  }

  if (type === "admin") {
    if (!isJidGroup(remoteJid)) {
      return false;
    }

    const groupMetadata = await socket.groupMetadata(remoteJid);
    const { participants, owner } = groupMetadata;
    const participant = participants.find((p) => p.id === senderJid);

    if (!participant) {
      return false;
    }

    const isGroupOwner =
      participant.id === owner || participant.admin === "superadmin";
    const isAdmin = isGroupOwner || participant.admin === "admin";

    if (isAdmin) {
      return true;
    }
    return false;
  }

  if (type === "owner") {
    return false;
  }

  return false;
};
