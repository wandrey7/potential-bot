import { PREFIX } from "../../config/config.js";

export default {
  name: "sugestao",
  description: "Sugerir algo para o bot",
  commands: ["sugestao"],
  usage: `${PREFIX}sugestao`,
  handle: async ({
    webMessage: message,
    args,
    sendTextWithoutEmoji,
    sendSucessReply,
    sendErrorReply,
    sendMessageToOwner,
  }) => {
    if (args.length === 0) {
      await sendTextWithoutEmoji(
        `Por favor, forneça uma sugestão após o comando.\nUso: ${PREFIX}sugestao sua sugestão aqui`
      );
      return;
    }

    const suggestion = args.join(" ");
    const isSuggestionSent = await sendMessageToOwner(
      `📢 *Nova Sugestão Recebida!*\n\n🕒 Horário: ${new Date().toLocaleString()}\n👤 Número: ${
        message.key?.remoteJid.split(":")[0]
      }\n💡 Sugestão: ${suggestion}`
    );

    if (isSuggestionSent) {
      await sendSucessReply(
        "Obrigado pela sua sugestão! Ela foi recebida com sucesso."
      );
    } else {
      await sendErrorReply("Por favor, tente novamente mais tarde.");
    }
  },
};
