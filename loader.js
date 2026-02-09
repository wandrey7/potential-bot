import { config } from "./config/config.js";
import { appLogger } from "./config/logs.js";
import { onMessageUpsert } from "./middleware/onMessageUpsert.js";
import { onGroupParticipantsUpdate } from "./middleware/onGroupParticipantsUpdate.js";

export const loader = async (socket) => {
  // Ensure we don't accumulate duplicate listeners on reconnect
  socket.ev.removeAllListeners?.("messages.upsert");
  socket.ev.on("messages.upsert", async ({ type, messages }) => {
    setTimeout(async () => {
      try {
        await onMessageUpsert(socket, { type, messages });
      } catch (error) {
        appLogger.error("Error in onMessageUpsert %o", {
          error: error.message,
          stack: error.stack,
        });
      }
    }, config.TIMEOUT_IN_MILI_BY_EVENT);
  });

  // Listen for group participant updates (members joining/leaving)
  socket.ev.removeAllListeners?.("group-participants.update");
  socket.ev.on("group-participants.update", async (update) => {
    setTimeout(async () => {
      try {
        await onGroupParticipantsUpdate(socket, update);
      } catch (error) {
        appLogger.error("Error in onGroupParticipantsUpdate %o", {
          error: error.message,
          stack: error.stack,
        });
      }
    }, config.TIMEOUT_IN_MILI_BY_EVENT);
  });

  appLogger.info("✅ Event listeners registered successfully");
};
