import Webp from "node-webpmux";
import sharp from "sharp";
import { BOT_LINK, BOT_NAME, PREFIX } from "../../config/config.js";
import { appLogger } from "../../config/logs.js";

export default {
  name: "sticker",
  description: "Sticker a partir de imagem",
  commands: ["sticker", "s"],
  usage: `${PREFIX}sticker`,
  handle: async ({
    webMessage,
    downloadImageBuffer,
    sendErrorReply,
    sendStickerFromBuffer,
  }) => {
    try {
      const imageBuffer = await downloadImageBuffer(webMessage);
      if (!imageBuffer) {
        await sendErrorReply(
          "Por favor, envie uma imagem para criar um sticker."
        );
        return;
      }

      const webpBuffer = await sharp(imageBuffer)
        .resize(512, 512)
        .webp()
        .toBuffer();

      const webp = new Webp.Image();
      await webp.load(webpBuffer);

      const json = {
        "sticker-pack-id": Date.now().toString(),
        "sticker-pack-name": `Solicitado por: ${webMessage.pushName} \n\n`,
        "sticker-pack-publisher": `Criado por: ${BOT_NAME} | ${BOT_LINK}`,
        "sticker-pack-version": "1",
        "sticker-pack-copyright": BOT_NAME,
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
      const stickerBuffer = await webp.save(null);

      await sendStickerFromBuffer(stickerBuffer);
    } catch (error) {
      appLogger.error("Error creating sticker: %o", {
        error: error.message,
        stack: error.stack,
      });
      await sendErrorReply("Tente novamente.");
    }
  },
};
