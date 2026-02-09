import { appLogger } from "../config/logs.js";
import prisma from "../prisma/client.js";

/**
 * Default welcome message template with variable support
 * Variables: {memberName}, {groupName}, {date}, {time}
 */
const DEFAULT_WELCOME_TEMPLATE =
  "Bem-vindo @{memberName} ao grupo {groupName}! 🎉\n\nFique à vontade para participar das conversas. Respeito e diversidade são valores importantes por aqui! 💪";

/**
 * Substitutes variables in the template with actual values
 * Supports: {memberName}, {groupName}, {date}, {time}
 *
 * @param {string} template - The message template
 * @param {Object} variables - The variables to substitute
 * @param {string} variables.memberName - Name of the new member
 * @param {string} variables.groupName - Name of the group
 * @param {Date} variables.date - Date of entry (optional)
 * @returns {Object} - { text: string, mentions: string[] }
 */
export const substituteMentionsAndVariables = (template, variables) => {
  if (!template || typeof template !== "string") {
    throw new Error("Template must be a non-empty string");
  }

  if (!variables || typeof variables !== "object") {
    throw new Error("Variables must be an object");
  }

  const { memberName, groupName, date, memberJid } = variables;

  if (!memberName || typeof memberName !== "string") {
    throw new Error("memberName is required and must be a string");
  }

  if (!groupName || typeof groupName !== "string") {
    throw new Error("groupName is required and must be a string");
  }

  // Format date and time
  const dateObj = date instanceof Date ? date : new Date();
  const formattedDate = dateObj.toLocaleDateString("pt-BR");
  const formattedTime = dateObj.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Replace variables in template
  let text = template
    .replace(/{memberName}/g, memberName)
    .replace(/{groupName}/g, groupName)
    .replace(/{date}/g, formattedDate)
    .replace(/{time}/g, formattedTime);

  // Extract mentions (JIDs marked with @{...})
  const mentions = [];
  if (memberJid && template.includes("{memberName}")) {
    mentions.push(memberJid);
  }

  return { text, mentions };
};

/**
 * Gets the welcome message template for a group
 * Can be customized per group in the future
 *
 * @param {string} groupJid - The group JID
 * @returns {Promise<string>} - The welcome template
 */
export const getWelcomeTemplate = async (groupJid) => {
  try {
    // TODO: In the future, this could fetch per-group customized templates
    // For now, return the default template
    return DEFAULT_WELCOME_TEMPLATE;
  } catch (error) {
    appLogger.error("Error getting welcome template %o", {
      error: error.message,
      groupJid,
    });
    return DEFAULT_WELCOME_TEMPLATE;
  }
};

/**
 * Sends a welcome message to a group when a new member joins
 *
 * @param {Object} socket - The Baileys socket instance
 * @param {string} groupJid - The JID of the group
 * @param {Object} newMember - Information about the new member
 * @param {string} newMember.jid - The JID of the new member
 * @param {string} newMember.name - The name of the new member
 * @returns {Promise<boolean>} - True if message was sent successfully
 */
export const sendWelcomeMessage = async (socket, groupJid, newMember) => {
  try {
    // Validate inputs
    if (!socket || typeof socket.sendMessage !== "function") {
      throw new Error("Invalid socket: must have sendMessage method");
    }

    if (!groupJid || typeof groupJid !== "string") {
      throw new Error("groupJid must be a non-empty string");
    }

    if (
      !newMember ||
      typeof newMember !== "object" ||
      !newMember.jid ||
      !newMember.name
    ) {
      throw new Error("newMember must be an object with jid and name");
    }

    // Fetch group information from database
    let groupName = "Grupo";
    try {
      const group = await prisma.group.findUnique({
        where: { groupJid },
        select: { name: true },
      });

      if (group && group.name) {
        groupName = group.name;
      }
    } catch (error) {
      appLogger.warn("Group not found in database, using default name %o", {
        error: error.message,
        groupJid,
      });
    }

    // Get welcome template
    const template = await getWelcomeTemplate(groupJid);

    // Substitute variables
    const { text, mentions } = substituteMentionsAndVariables(template, {
      memberName: newMember.name,
      groupName,
      date: new Date(),
      memberJid: newMember.jid,
    });

    // Send message with mentions
    const messageOptions = {
      text,
      mentions,
    };

    await socket.sendMessage(groupJid, messageOptions);

    appLogger.info("Welcome message sent successfully %o", {
      groupJid,
      memberJid: newMember.jid,
      memberName: newMember.name,
    });

    return true;
  } catch (error) {
    appLogger.error("Error sending welcome message %o", {
      error: error.message,
      stack: error.stack,
      groupJid,
      memberJid: newMember?.jid,
    });
    return false;
  }
};

/**
 * Logs member entry to database (for future analytics/tracking)
 * Currently optional, but can be extended
 *
 * @param {string} groupJid - The JID of the group
 * @param {string} memberJid - The JID of the member
 * @param {string} memberName - The name of the member
 * @returns {Promise<void>}
 */
export const logMemberEntry = async (groupJid, memberJid, memberName) => {
  try {
    // TODO: Implement if needed for tracking member entries
    appLogger.debug("Member entry logged %o", {
      groupJid,
      memberJid,
      memberName,
    });
  } catch (error) {
    appLogger.warn("Error logging member entry %o", {
      error: error.message,
      groupJid,
      memberJid,
    });
  }
};
