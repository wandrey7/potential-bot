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
