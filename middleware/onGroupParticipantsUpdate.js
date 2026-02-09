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
      appLogger.debug(
        "No participants to process in onGroupParticipantsUpdate",
      );
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
        let memberJid, memberName;

        // Handle both string format and object format
        if (typeof participant === "string") {
          // Old format: "5521965070832@s.whatsapp.net"
          memberJid = participant;
          memberName = participant.split("@")[0];
        } else if (participant && typeof participant === "object") {
          // New format: { id: "...", phoneNumber: "5521965070832@s.whatsapp.net", admin: null }
          if (participant.phoneNumber) {
            memberJid = participant.phoneNumber;
            memberName = participant.phoneNumber.split("@")[0];
          } else if (participant.id) {
            // Fallback to id if phoneNumber is not available
            memberJid = participant.id;
            memberName = participant.id.split("@")[0];
          } else {
            appLogger.warn(
              "Participant object missing both phoneNumber and id %o",
              {
                groupJid,
                participant,
              },
            );
            continue;
          }
        } else {
          appLogger.warn("Skipping invalid participant in group %o", {
            groupJid,
            participant,
            type: typeof participant,
          });
          continue;
        }

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
