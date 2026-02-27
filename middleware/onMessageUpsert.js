import { appLogger } from "../config/logs.js";
import { dynamicCommand } from "../utils/dynamicCommand.js";
import { loadCommonFunction } from "../utils/loadCommonFunctions.js";

export const onMessageUpsert = async (socket, { messages }) => {
  try {
    if (messages.length === 0) return;

    const webMessage = messages[0];

    // Ignorar mensagens do próprio bot
    if (webMessage?.key?.fromMe) {
      return;
    }

    // Ignorar mensagens sem conteúdo (pode ser erro de descriptografia)
    if (!webMessage?.message) {
      appLogger.debug("Mensagem sem conteúdo ignorada");
      return;
    }

    const commonFunctions = await loadCommonFunction({ socket, webMessage });

    await dynamicCommand(commonFunctions);
  } catch (error) {
    // Ignorar erros de descriptografia silenciosamente
    if (error?.output?.statusCode === 500) {
      appLogger.debug("Erro de descriptografia ignorado");
      return;
    }

    appLogger.error("Error in onMessageUpsert %o", {
      error: error.message,
      stack: error.stack,
      messages: messages?.[0]?.key?.remoteJid || "unknown",
    });
  }
};
