import { createCanvas } from "canvas";
import GIFEncoder from "gif-encoder-2";
import Webp from "node-webpmux";
import sharp from "sharp";
import { BOT_LINK, BOT_NAME, PREFIX } from "../../config/config.js";
import { appLogger } from "../../config/logs.js";

export default {
  name: "attp",
  description: "Retorna um GIF animado com texto RGB.",
  commands: ["attp"],
  usage: `${PREFIX}attp`,
  handle: async ({
    args,
    webMessage,
    sendErrorReply,
    sendStickerFromBuffer,
  }) => {
    try {
      if (!args || args.length === 0) {
        return await sendErrorReply("Por favor, forneça um texto para o GIF.");
      }
      const text = args.join(" ");

      const gifBuffer = await createRgbTextGif(text);

      const stickerWebpBuffer = await sharp(gifBuffer, { animated: true })
        .webp()
        .toBuffer();

      const webp = new Webp.Image();
      await webp.load(stickerWebpBuffer);

      const json = {
        "sticker-pack-id": Date.now().toString(),
        "sticker-pack-name": `Solicitado por: ${webMessage.pushName} \n\n`,
        "sticker-pack-publisher": `Criado por: ${BOT_NAME} | ${BOT_LINK}`,
        "sticker-pack-version": "1",
        "sticker-pack-copyright": BOT_NAME,
        emojis: ["✨", "🤖"],
      };

      const exifAttr = Buffer.from([
        0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
        0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
      ]);
      const jsonBuffer = Buffer.from(JSON.stringify(json), "utf8");
      const exif = Buffer.concat([exifAttr, jsonBuffer]);
      exif.writeUIntLE(jsonBuffer.length, 14, 4);

      webp.exif = exif;
      const finalStickerBuffer = await webp.save(null);

      await sendStickerFromBuffer(finalStickerBuffer);
    } catch (error) {
      appLogger.error("Error creating attp sticker: %o", {
        error: error.message,
        stack: error.stack,
      });
      await sendErrorReply("Tente novamente.");
    }
  },
};

export async function createRgbTextGif(text) {
  const width = 512;
  const height = 512;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const encoder = new GIFEncoder(width, height);

  const stream = encoder.createReadStream();

  encoder.start();
  encoder.setRepeat(0); // 0 for repeat, -1 for no-repeat
  encoder.setDelay(50); // frame delay in ms
  encoder.setQuality(10); // image quality. 10 is default.

  const frames = 30;
  const hueStep = 360 / frames;

  for (let i = 0; i < frames; i++) {
    const hue = i * hueStep;
    ctx.fillStyle = "#000"; // Black background
    ctx.fillRect(0, 0, width, height);

    ctx.font = "bold 40px Sans";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.fillText(text, width / 2, height / 2);

    encoder.addFrame(ctx);
  }

  encoder.finish();

  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
