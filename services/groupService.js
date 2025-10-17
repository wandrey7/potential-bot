import { appLogger } from "../config/logs.js";
import prisma from "../prisma/client.js";

/**
 * Creates a group entry in the database if it does not already exist.
 * @param {string} name - The name of the group.
 * @param {string} groupJid - The JID of the group.
 */
export const createGroupIfNotExists = async (name, groupJid) => {
  try {
    await prisma.group.upsert({
      where: { groupJid: groupJid },
      update: { name: name },
      create: { name: name, groupJid: groupJid },
    });
  } catch (error) {
    appLogger.error("Error upserting group %o", {
      error: error.message,
      stack: error.stack,
      groupJid,
    });
  }
};

/**
 * Sets a new rental expiration date for the group.
 * @param {string} groupJid - The JID of the group.
 * @param {Date} newDate - The new expiration date.
 */
export const setNewRentalDate = async (groupJid, newDate) => {
  try {
    await prisma.group.update({
      where: { groupJid: groupJid },
      data: { expireRental: newDate },
    });

    appLogger.info("Successfully updated rental date for group: %s", groupJid);
  } catch (error) {
    appLogger.error("Error updating rental date %o", {
      error: error.message,
      stack: error.stack,
      groupJid,
      newDate,
      newDateType: typeof newDate,
    });
  }
};

/**
 * Checks if the group's rental is still valid.
 * @param {string} groupJid - The JID of the group to check.
 * @returns {Promise<boolean>} - Returns true if the rental is valid, false otherwise.
 */
export const checkGroupRentalStatus = async (groupJid) => {
  try {
    const group = await prisma.group.findUnique({
      where: { groupJid: groupJid },
    });
    if (group && group.expireRental) {
      return group.expireRental > new Date();
    }
    return false;
  } catch (error) {
    appLogger.error("Error checking rental status %o", {
      error: error.message,
      stack: error.stack,
      groupJid,
    });
    return false;
  }
};

/**
 * Finds a group's JID by its name.
 * @param {any} socket - The Baileys socket instance.
 * @param {string} groupName - The name of the group to find.
 * @returns {Promise<string|null>} - The group JID or null if not found.
 */
export const getGroupJidByName = async (socket, groupName) => {
  try {
    const groups = await socket.groupFetchAllParticipating();
    const group = Object.values(groups).find(
      (g) => g.subject.toLowerCase() === groupName.toLowerCase()
    );
    return group?.id || null;
  } catch (error) {
    appLogger.error("Error fetching group by name %o", {
      error: error.message,
      stack: error.stack,
      groupName,
    });
    return null;
  }
};
