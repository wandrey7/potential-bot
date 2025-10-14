import { PREFIX } from "../../config/config.js";

export default {
  name: "hidetag",
  description: "Marca todos os participantes do grupo",
  commands: ["hidetag"],
  usage: `${PREFIX}hidetag`,
  handle: async ({
    remoteJid,
    socket,
    webMessage,
    args,
    isBotAdmin,
    sendWarningReply,
    downloadImageBuffer,
    downloadVideoBuffer,
    downloadDocumentBuffer,
  }) => {
    if (!isBotAdmin()) {
      return sendWarningReply("Eu preciso ser admin para usar esse comando.");
    }

    const groupMetadata = await socket.groupMetadata(remoteJid);
    const participants = groupMetadata.participants.map((p) => p.id);
    const quotedMessage =
      webMessage.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (quotedMessage) {
      // Logic to handle quoted media/text
      let content = {};
      const messageToRelay = { message: quotedMessage }; // Re-wrap for download functions

      if (quotedMessage.imageMessage) {
        const buffer = await downloadImageBuffer(messageToRelay);
        content = {
          image: buffer,
          caption: quotedMessage.imageMessage.caption || "",
          mentions: participants,
        };
      } else if (quotedMessage.videoMessage) {
        const buffer = await downloadVideoBuffer(messageToRelay);
        content = {
          video: buffer,
          caption: quotedMessage.videoMessage.caption || "",
          mentions: participants,
        };
      } else if (quotedMessage.documentMessage) {
        const buffer = await downloadDocumentBuffer(messageToRelay);
        content = {
          document: buffer,
          fileName: quotedMessage.documentMessage.fileName || "file",
          caption: quotedMessage.documentMessage.caption || "",
          mentions: participants,
        };
      } else if (
        quotedMessage.conversation ||
        quotedMessage.extendedTextMessage
      ) {
        const text =
          quotedMessage.conversation || quotedMessage.extendedTextMessage.text;
        content = {
          text: text,
          mentions: participants,
        };
      }

      if (Object.keys(content).length > 0) {
        await socket.sendMessage(remoteJid, content);
      } else {
        // Fallback if quoted message is something else (e.g. a sticker)
        const text = args.join(" ") || "";
        await socket.sendMessage(remoteJid, { text, mentions: participants });
      }
    } else {
      // Logic for regular hidetag with optional text
      const text = args.join(" ") || "";
      await socket.sendMessage(remoteJid, {
        text,
        mentions: participants,
      });
    }
  },
};
