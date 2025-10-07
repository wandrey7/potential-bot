import { downloadMediaMessage } from "baileys";
import chalk from "chalk";
import "dotenv/config";
import { appLogger } from "../config/logs.js";
import { sticker } from "./sticker.js";

export const onMessageUpsert = async (socket, { type, messages }) => {
  if (messages.length === 0) return;
  if (type == "notify") {
    // Obtain the target JID and try to convert to LID if it's a PN
    let targetJid = messages[0].key.remoteJid;
    const isLid = targetJid.includes("@lid");
    const messageText = messages[0].message?.conversation;
    const caption =
      messages[0].message?.imageMessage?.caption ||
      messages[0].message?.videoMessage?.caption;
    const commandText = messageText || caption;

    if (!isLid) {
      const lid = socket.signalRepository?.lidMapping?.getLIDForPN(targetJid);
      if (lid) {
        targetJid = lid;
      }
    }

    const from = targetJid.split("@")[0];
    const name = messages[0].pushName || "Desconhecido";

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
        chalk.blue("📝 Mensagem: ") +
        (commandText || "Mídia") +
        "\n" +
        chalk.gray("----------------------------------------")
    );

    appLogger.info({
      event: "new_message",
      from,
      name,
      message: commandText,
      isLid,
    });

    if (commandText && commandText.startsWith(process.env.PREFIX)) {
      const commandBody = commandText.slice(process.env.PREFIX.length).trim();
      const command = commandBody.split(" ")[0].toLowerCase();

      if (command === "s" || command === "sticker") {
        if (messages[0].message.imageMessage) {
          try {
            const buffer = await downloadMediaMessage(
              messages[0],
              "buffer",
              {},
              {}
            );
            await sticker(socket, targetJid, buffer);
          } catch (err) {
            appLogger.error("Erro ao baixar mídia para sticker", {
              error: err,
            });
          }
        } else {
          appLogger.warn("Comando sticker requer uma imagem");
        }
      } else {
        appLogger.warn("Comando desconhecido: " + command);
      }
    }
  } else {
    console.log(
      "Tipo de mensagem não tratado: " + type + " Mensagens: ",
      messages
    );
  }
};
