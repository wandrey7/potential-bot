import Webp from "node-webpmux";
import sharp from "sharp";
import { BOT_LINK, BOT_NAME } from "../config/config.js";
import { appLogger } from "../config/logs.js";

async function imageToSticker(imageBuffer, requester, botName, botLink) {
  const webpBuffer = await sharp(imageBuffer)
    .resize(512, 512)
    .webp()
    .toBuffer();

  const webp = new Webp.Image();
  await webp.load(webpBuffer);

  const json = {
    "sticker-pack-id": Date.now().toString(),
    "sticker-pack-name": `Solicitado por: ${requester} \n\n`,
    "sticker-pack-publisher": `Criado por: ${botName} | ${botLink}`,
    "sticker-pack-version": "1",
    "sticker-pack-copyright": botName,
    emojis: ["🤖", "😊", "👍"],
  };

  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
  ]);
  const jsonBuffer = Buffer.from(JSON.stringify(json), "utf8");
  const exif = Buffer.concat([exifAttr, jsonBuffer]);
  exif.writeUIntLE(jsonBuffer.length, 14, 4);

  webp.exif = exif;

  return await webp.save(null);
}

export const sticker = async (socket, targetUser, userName, imageBuffer) => {
  try {
    const stickerBuffer = await imageToSticker(
      imageBuffer,
      userName,
      BOT_NAME,
      BOT_LINK
    );
    await socket.sendMessage(targetUser, { sticker: stickerBuffer });

    appLogger.info("Sticker sent", { to: targetUser });
  } catch (err) {
    appLogger.error("Error creating/sending sticker", {
      error: err.message,
      stack: err.stack,
    });
  }
};
