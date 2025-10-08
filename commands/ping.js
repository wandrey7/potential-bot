import { appLogger } from "../config/logs.js";

export const ping = async (socket, targetUser) => {
  try {
    await socket.sendMessage(targetUser, { text: "🏓 Pong!" });
  } catch (err) {
    appLogger.error("Error sending ping response", { error: err });
  }
};
