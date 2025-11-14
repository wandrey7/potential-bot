import { appLogger } from "../config/logs.js";
import prisma from "../prisma/client.js";

export const checkUserPermission = async (senderJid) => {
  try {
    const user = await prisma.user.findUnique({
      where: { senderJid: senderJid },
    });
    return user?.hasPermission === true;
  } catch (error) {
    appLogger.error("Error checking permissions %o", {
      error: error.message,
      stack: error.stack,
      senderJid,
    });
    return false;
  }
};

export const addPermission = async (senderJid) => {
  try {
    await prisma.user.update({
      where: { senderJid: senderJid },
      data: { hasPermission: true },
    });
    appLogger.info("Permission added %o", { senderJid });
  } catch (error) {
    appLogger.error("Error adding permission %o", {
      error: error.message,
      stack: error.stack,
      senderJid,
    });
  }
};

export const addUserIfNotExists = async (name, senderJid) => {
  try {
    await prisma.user.upsert({
      where: { senderJid: senderJid },
      update: { name: name },
      create: { name: name, senderJid: senderJid },
    });
  } catch (error) {
    appLogger.error("Error upserting user %o", {
      error: error.message,
      stack: error.stack,
      senderJid,
    });
  }
};

/**
 * Check if the user has stolen today in the specified group.
 * @param {string} senderJid - The sender's JID.
 * @param {string} groupJid - The group's JID.
 * @returns {Promise<boolean>} - Returns true if the user has stolen today, false otherwise.
 */
export const userStoleToday = async (senderJid, groupJid) => {
  try {
    const userGroup = await prisma.userGroup.findFirst({
      where: {
        user: { senderJid: senderJid },
        group: { groupJid: groupJid },
      },
      select: { stoleToday: true },
    });

    if (!userGroup) {
      appLogger.warn(
        "UserGroup not found for groupJid: %s, senderJid: %s",
        groupJid,
        senderJid
      );
      return false;
    }

    return userGroup.stoleToday === true;
  } catch (error) {
    appLogger.error("Error checking stole today %o", {
      error: error.message,
      stack: error.stack,
      senderJid,
      groupJid,
    });
    return false;
  }
};

/**
 * Check if the user has played roulette today in the specified group.
 * @param {string} senderJid - The sender's JID.
 * @param {string} groupJid - The group's JID.
 * @returns {Promise<boolean>} - Returns true if the user has played roulette today, false otherwise.
 */
export const userRouletteToday = async (senderJid, groupJid) => {
  try {
    const userGroup = await prisma.userGroup.findFirst({
      where: {
        user: { senderJid: senderJid },
        group: { groupJid: groupJid },
      },
      select: { roulettes: true },
    });

    if (!userGroup) {
      appLogger.warn(
        "UserGroup not found for groupJid: %s, senderJid: %s. Assuming roulette can be played.",
        groupJid,
        senderJid
      );
      return false;
    }

    return userGroup.roulettes >= 3;
  } catch (error) {
    appLogger.error("Error checking roulette today %o", {
      error: error.message,
      stack: error.stack,
      senderJid,
      groupJid,
    });
    return false;
  }
};

/**
 * Mark that the user has stolen today in the specified group.
 * @param {string} senderJid - The sender's JID.
 * @param {string} groupJid - The group's JID.
 */
export const incrementUserStoleToday = async (senderJid, groupJid) => {
  try {
    await prisma.userGroup.updateMany({
      where: {
        user: { senderJid: senderJid },
        group: { groupJid: groupJid },
      },
      data: {
        stoleToday: true,
      },
    });
  } catch (error) {
    appLogger.error("Error incrementing stole today %o", {
      error: error.message,
      stack: error.stack,
      senderJid,
      groupJid,
    });
  }
};

/** * Create a UserGroup entry if it does not exist.
 * @param {string} senderJid - The sender's JID.
 * @param {string} groupJid - The group's JID.
 */
export const createUserGroupIfNotExists = async (senderJid, groupJid) => {
  if (!senderJid || !groupJid) {
    return;
  }
  try {
    const user = await prisma.user.findUnique({ where: { senderJid } });
    const group = await prisma.group.findUnique({ where: { groupJid } });

    if (!user || !group) {
      return;
    }

    await prisma.userGroup.upsert({
      where: {
        userId_groupId: {
          userId: user.id,
          groupId: group.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        groupId: group.id,
      },
    });
  } catch (error) {
    appLogger.error("Error upserting userGroup %o", {
      error: error.message,
      stack: error.stack,
      senderJid,
      groupJid,
    });
  }
};

/**
 * Increment the roulette count for a user in a specific group.
 * @param {string} senderJid - The sender's JID.
 * @param {string} groupJid - The group's JID.
 */
export const incrementUserRoulette = async (senderJid, groupJid) => {
  try {
    if (!senderJid || !groupJid) {
      return;
    }
    await prisma.userGroup.updateMany({
      where: {
        user: { senderJid: senderJid },
        group: { groupJid: groupJid },
      },
      data: {
        roulettes: { increment: 1 },
      },
    });
  } catch (error) {
    appLogger.error("Error incrementing roulette %o", {
      error: error.message,
      stack: error.stack,
      senderJid,
      groupJid,
    });
  }
};

/**
 * Add or remove points to/from a user in a specific group.
 * @param {string} senderJid - The sender's JID.
 * @param {string} groupJid - The group's JID.
 * @param {number} points - The number of points to add or remove.
 * @param {boolean} increment - If true, points will be added; if false, points will be removed.
 */
export const pointsToUser = async (senderJid, groupJid, points, increment) => {
  try {
    if (!senderJid || !groupJid) {
      return;
    }
    const incrementValue = increment === false ? -points : points;
    await prisma.userGroup.updateMany({
      where: {
        user: { senderJid: senderJid },
        group: { groupJid: groupJid },
      },
      data: {
        points: { increment: incrementValue },
      },
    });
  } catch (error) {
    appLogger.error("Error adding points to user %o", {
      error: error.message,
      stack: error.stack,
      senderJid,
      points,
    });
  }
};
