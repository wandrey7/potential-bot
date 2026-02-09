import { appLogger } from "../config/logs.js";
import { sendWelcomeMessage } from "../services/welcomeService.js";

/**
 * Handles group participant updates (members joining/leaving)
 * Sends welcome message when new member joins
 *
 * @param {Object} socket - The Baileys socket instance
 * @param {Object} update - The group-participants.update event data
 * @param {string} update.id - The group JID
 * @param {string[]} update.participants - Array of participant JIDs
 * @param {string} update.action - Action type: 'add', 'remove', 'promote', 'demote'
 * @returns {Promise<void>}
 */
export const onGroupParticipantsUpdate = async (socket, update) => {
  try {
    // Validate inputs
    if (!socket || typeof socket.sendMessage !== "function") {
      appLogger.error("Invalid socket in onGroupParticipantsUpdate");
      return;
    }

    if (!update || typeof update !== "object") {
      appLogger.error("Invalid update object in onGroupParticipantsUpdate");
      return;
    }

    const { id: groupJid, participants = [], action } = update;

    // Only process "add" action (new members joining)
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
    });

    // Process each new member
    for (const participant of participants) {
      try {
        // Extract member info
        // Participant JID format: "1234567890@s.whatsapp.net"
        // We need to get the display name
        const memberJid = participant;
        const memberName = participant.split("@")[0]; // Extract phone number as fallback

        appLogger.debug("Processing new member %o", {
          groupJid,
          memberJid,
          memberName,
        });

        // Send welcome message
        await sendWelcomeMessage(socket, groupJid, {
          jid: memberJid,
          name: memberName,
        });
      } catch (error) {
        appLogger.error("Error processing participant in group %o", {
          error: error.message,
          stack: error.stack,
          groupJid,
          participant,
        });
        // Continue with next participant even if one fails
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
