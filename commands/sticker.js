import sharp from "sharp";
import { appLogger } from "../config/logs.js";
export const sticker = async (socket, targetUser, imageBuffer) => {
  try {
    const webpBuffer = await sharp(imageBuffer)
      .resize(512, 512, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: 80 })
      .toBuffer();

    await socket.sendMessage(targetUser, { sticker: webpBuffer });

    appLogger.info("Sticker sent", { to: targetUser });
  } catch (err) {
    appLogger.error("Error creating/sending sticker", { error: err });
  }
};
