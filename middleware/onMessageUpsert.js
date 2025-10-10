import { appLogger } from "../config/logs.js";
import { dynamicCommand } from "../utils/dynamicCommand.js";
import { loadCommonFunction } from "../utils/loadCommonFunctions.js";

export const onMessageUpsert = async (socket, { messages }) => {
  try {
    if (messages.length === 0) return;

    const webMessage = messages[0];

    const commonFunctions = await loadCommonFunction({ socket, webMessage });

    await dynamicCommand(commonFunctions);
  } catch (error) {
    console.log("Error in onMessageUpsert:", error);
    appLogger.error("Error in onMessageUpsert %o", {
      error: error.message,
      stack: error.stack,
      messages: messages?.[0]?.key?.remoteJid || "unknown",
    });
  }
};
