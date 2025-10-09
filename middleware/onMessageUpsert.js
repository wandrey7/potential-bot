import { downloadMediaMessage } from "baileys";
import chalk from "chalk";
import { ping } from "../commands/ping.js";
import { sticker } from "../commands/sticker.js";
import { PREFIX } from "../config/config.js";
import { appLogger } from "../config/logs.js";

export const onMessageUpsert = async (socket, { type, messages }) => {
  if (messages.length === 0) return;
  if (type == "notify") {
    // Obtain the target JID and try to convert to LID if it's a PN
    let targetJid = messages[0].key.remoteJid;
    const messageToQuote = messages[0];
    let targetMessage = messages[0];

    if (messages[0].message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      const quotedInfo = messages[0].message.extendedTextMessage.contextInfo;
      targetMessage = {
        key: {
          remoteJid: messages[0].key.remoteJid,
          id: quotedInfo.stanzaId,
          participant: quotedInfo.participant || messages[0].key.remoteJid,
        },
        message: quotedInfo.quotedMessage,
      };
    }

    const isLid = targetJid.includes("@lid");
    const messageText =
      messages[0].message?.conversation ||
      messages[0].message?.extendedTextMessage?.text;

    const caption =
      messages[0].message?.imageMessage?.caption ||
      messages[0].message?.videoMessage?.caption ||
      messages[0].message?.extendedTextMessage?.contextInfo?.quotedMessage
        ?.imageMessage?.caption;

    // TODO: Add suport to video message
    const image =
      messages[0].message?.imageMessage ||
      messages[0].message?.extendedTextMessage?.contextInfo?.quotedMessage
        ?.imageMessage;
    const commandText = messageText || caption;

    if (!isLid) {
      try {
        const lid = await socket.signalRepository?.lidMapping?.getLIDForPN(
          targetJid
        );
        if (lid) {
          targetJid = lid;
        }
      } catch (err) {
        appLogger.error("Failed to convert to LID", {
          error: err.message,
          targetJid,
        });
      }
    }

    const from = targetJid.split("@")[0];
    const name = messages[0].pushName || "Desconhecido";

    if (commandText && commandText.startsWith(PREFIX)) {
      const commandBody = commandText.slice(PREFIX.length).trim();
      const command = commandBody.split(" ")[0].toLowerCase();

      appLogger.info(
        `new_message from=${from} name=${name} command=${commandText}`
      );

      console.log(
        "\n" +
          chalk.green.bold("📩 Nova mensagem recebida!") +
          "\n" +
          chalk.blue("👤 De: ") +
          from +
          "\n" +
          chalk.blue("📛 Nome: ") +
          name +
          "\n" +
          chalk.blue("💬 Mensagem: ") +
          commandText +
          "\n" +
          chalk.gray("----------------------------------------")
      );

      if (command === "s" || command === "sticker") {
        if (!image) {
          await socket.sendMessage(
            targetJid,
            { text: "Por favor, envie uma imagem para criar um sticker." },
            { quoted: messageToQuote }
          );
          return;
        } else {
          await socket.sendMessage(
            targetJid,
            { text: "🤖 Processando sua imagem, aguarde..." },
            { quoted: messageToQuote }
          );
        }
        if (image) {
          try {
            const buffer = await downloadMediaMessage(
              targetMessage,
              "buffer",
              {},
              {}
            );
            await sticker(socket, targetJid, name, buffer);
          } catch (err) {
            appLogger.error("Erro ao baixar mídia para sticker", {
              error: err,
            });
          }
        } else {
          appLogger.warn("Comando sticker requer uma imagem");
        }
      } else if (command === "ping") {
        await ping(socket, targetJid);
      } else {
        appLogger.warn("Comando desconhecido: " + command);
      }
    }
  }
};
