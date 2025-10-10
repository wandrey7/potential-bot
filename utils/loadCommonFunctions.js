import fs from "fs";
import { BOT_EMOJI } from "../config/config.js";
import {
  baileysIs,
  download,
  downloadBuffer,
  extractDataFromMessage,
} from "../utils/extractDataFromMessage.js";

export const loadCommonFunction = async ({ socket, webMessage }) => {
  const { userJid, prefix, isReply, replyJid, args, commandName, remoteJid } =
    extractDataFromMessage(webMessage);

  const isImage = baileysIs(webMessage, "image");
  const isVideo = baileysIs(webMessage, "video");
  const isSticker = baileysIs(webMessage, "sticker");

  const downloadImage = async (webMessage, filename) => {
    return await download(webMessage, filename, "image", "png");
  };

  const downloadSticker = async (webMessage, filename) => {
    return await download(webMessage, filename, "sticker", "webp");
  };

  const downloadVideo = async (webMessage, filename) => {
    return await download(webMessage, filename, "video", "mp4");
  };

  const downloadImageBuffer = async (webMessage) => {
    return await downloadBuffer(webMessage, "image");
  };

  const downloadStickerBuffer = async (webMessage) => {
    return await downloadBuffer(webMessage, "sticker");
  };

  const downloadVideoBuffer = async (webMessage) => {
    return await downloadBuffer(webMessage, "video");
  };

  const sendText = async (text) => {
    return socket.sendMessage(remoteJid, { text: `${BOT_EMOJI} ${text}` });
  };

  const sendReply = async (text) => {
    return socket.sendMessage(
      remoteJid,
      {
        text: `${BOT_EMOJI} ${text}`,
      },
      {
        quoted: webMessage,
      }
    );
  };

  const sendReact = async (emoji) => {
    return socket.sendMessage(remoteJid, {
      react: {
        text: emoji,
        key: webMessage.key,
      },
    });
  };

  const sendSucessReact = async () => {
    return sendReact("😊");
  };

  const sendWaitReact = async () => {
    return sendReact("⏳");
  };

  const sendWarningReact = async () => {
    return sendReact("⚠️");
  };

  const sendErrorReact = async () => {
    return sendReact("❌");
  };

  const sendSucessReply = async (text) => {
    await sendSucessReact();
    return sendReply(`😊 ${text}`);
  };

  const sendWaitReply = async (text) => {
    await sendWaitReact();
    return sendReply(`⏳ Aguarde ${text}`);
  };

  const sendWarningReply = async (text) => {
    await sendWarningReact();
    return sendReply(`⚠️ Atenção! ${text}`);
  };

  const sendErrorReply = async (text) => {
    await sendErrorReact();
    return sendReply(`❌ Erro! ${text}`);
  };

  const sendStickerFromFile = async (file) => {
    return socket.sendSticker(remoteJid, {
      sticker: fs.readFileSync(file),
    });
  };
  const sendStickerFromBuffer = async (stickerBuffer) => {
    return socket.sendMessage(remoteJid, { sticker: stickerBuffer });
  };

  const sendImageFromFile = async (file) => {
    return socket.sendImage(remoteJid, {
      image: fs.readFileSync(file),
    });
  };

  return {
    socket,
    remoteJid,
    userJid,
    prefix,
    isReply,
    replyJid,
    args,
    commandName,
    isImage,
    isVideo,
    isSticker,
    webMessage,
    downloadImage,
    downloadSticker,
    downloadVideo,
    sendText,
    sendReply,
    sendReact,
    sendSucessReact,
    sendWaitReact,
    sendWarningReact,
    sendErrorReact,
    sendSucessReply,
    sendWaitReply,
    sendWarningReply,
    sendStickerFromBuffer,
    sendErrorReply,
    sendStickerFromFile,
    sendImageFromFile,
    downloadImageBuffer,
    downloadStickerBuffer,
    downloadVideoBuffer,
  };
};
