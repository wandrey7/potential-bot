import { appLogger } from "../config/logs.js";
import { sendWelcomeMessage } from "../services/welcomeService.js";

/**
 * Handles group participant updates (members joining/leaving)
 * Sends welcome message when new member joins
 *
 * @param {Object} socket - The Baileys socket instance
 * @param {Object} update - The group-participants.update event data
 * @param {string} update.id - The group JID
 * @param {(string|Object)[]} update.participants - Array of participant JIDs or GroupParticipant objects
 * @param {string} update.action - Action type: 'add', 'remove', 'promote', 'demote'
 * @returns {Promise<void>}
 */
export const onGroupParticipantsUpdate = async (socket, update) => {
  try {
    if (!socket || typeof socket.sendMessage !== "function") {
      appLogger.error("Invalid socket in onGroupParticipantsUpdate");
      return;
    }

    if (!update || typeof update !== "object") {
      appLogger.error("Invalid update object in onGroupParticipantsUpdate");
      return;
    }

    const { id: groupJid, participants = [], action } = update;

    if (action !== "add") {
      return;
    }

    if (!groupJid || typeof groupJid !== "string") {
      appLogger.error("Invalid groupJid in onGroupParticipantsUpdate", {
        groupJid,
      });
      return;
    }

    if (!Array.isArray(participants) || participants.length === 0) {
      appLogger.debug("No participants to process in onGroupParticipantsUpdate");
      return;
    }

    appLogger.info("Processing group participant update %o", {
      groupJid,
      action,
      participantsCount: participants.length,
      participants,
    });

    for (const participant of participants) {
      try {
        if (typeof participant !== "string") {
          appLogger.warn("Skipping non-string participant in group %o", {
            groupJid,
            participant,
            type: typeof participant,
          });
          continue;
        }

        const memberJid = participant;
        const memberName = participant.split("@")[0];

        appLogger.debug("Processing new member %o", {
          groupJid,
          memberJid,
          memberName,
        });

        const welcomeSent = await sendWelcomeMessage(socket, groupJid, {
          jid: memberJid,
          name: memberName,
        });

        if (!welcomeSent) {
          appLogger.warn("Failed to send welcome message %o", {
            groupJid,
            memberJid,
            memberName,
          });
        }
      } catch (error) {
        appLogger.error("Error processing participant in group %o", {
          error: error.message,
          stack: error.stack,
          groupJid,
          participant,
        });
        continue;
      }
    }
  } catch (error) {
    appLogger.error("Error in onGroupParticipantsUpdate %o", {
      error: error.message,
      stack: error.stack,
      updateId: update?.id,
    });
  }
};
