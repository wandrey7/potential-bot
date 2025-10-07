import { onMessageUpsert } from "./commands/onMessageUpsert.js";
import { config } from "./config/config.js";

export const loader = async (socket) => {
  socket.ev.on("messages.upsert", async ({ type, messages }) => {
    setTimeout(async () => {
      await onMessageUpsert(socket, { type, messages });
    }, config.TIMEOUT_IN_MILI_BY_EVENT);
  });
};
