import { isJidGroup } from "baileys";

export const checkPermission = async ({
  type,
  socket,
  senderJid,
  remoteJid,
}) => {
  if (type === "member") {
    return true;
  }

  if (type === "admin" || type === "owner") {
    if (!isJidGroup(remoteJid)) {
      return false;
    }

    const groupMetadata = await socket.groupMetadata(remoteJid);
    const { participants, owner } = groupMetadata;

    const participant = participants.find((p) => p.id === senderJid);

    if (!participant) {
      return false;
    }

    const isOwner =
      participant.id === owner || participant.admin === "superadmin";

    const isAdmin = isOwner || participant.admin === "admin";

    if (type === "admin") return isAdmin;
    if (type === "owner") return isOwner;
  }

  return false;
};
