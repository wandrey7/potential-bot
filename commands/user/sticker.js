import { spawn } from "child_process";
import Webp from "node-webpmux";
import sharp from "sharp";
import { BOT_LINK, BOT_NAME, PREFIX } from "../../config/config.js";
import { appLogger } from "../../config/logs.js";

const convertVideoToWebp = (videoBuffer) => {
  return new Promise((resolve, reject) => {
    const ffmpegArgs = [
      "-i",
      "pipe:0", // Input from stdin
      "-t",
      "6", // Limit duration to 6 seconds
      "-fs",
      "950K", // Limit file size to 950KB
      "-vf",
      "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:-1:-1:color=black@0.0",
      "-loop",
      "0", // Loop indefinitely
      "-an", // No audio
      "-f",
      "webp", // Output format
      "pipe:1", // Output to stdout
    ];

    const ffmpeg = spawn("ffmpeg", ffmpegArgs);

    let outputChunks = [];
    let errorOutput = "";

    ffmpeg.stdout.on("data", (chunk) => {
      outputChunks.push(chunk);
    });

    ffmpeg.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ffmpeg.on("close", (code) => {
      if (code !== 0) {
        appLogger.error(
          "ffmpeg process exited with code %d. stderr: %s",
          code,
          errorOutput
        );
        return reject(
          new Error(`ffmpeg exited with code ${code}: ${errorOutput}`)
        );
      }
      resolve(Buffer.concat(outputChunks));
    });

    ffmpeg.on("error", (err) => {
      appLogger.error("Failed to start ffmpeg process: %o", err);
      reject(err);
    });

    // Handle EPIPE error, which can happen if ffmpeg closes the stream early
    ffmpeg.stdin.on("error", (err) => {
      appLogger.error("ffmpeg stdin error: %o", err);
      if (err.code === "EPIPE") {
        // This is normal when ffmpeg decides it has enough data and closes its stdin.
        return;
      }
      appLogger.error({ err }, "ffmpeg stdin stream error");
      reject(err);
    });

    ffmpeg.stdin.write(videoBuffer);
    ffmpeg.stdin.end();
  });
};

export default {
  name: "sticker",
  description: "Cria um sticker a partir de uma imagem ou vídeo.",
  commands: ["sticker", "s"],
  usage: `${PREFIX}sticker`,
  handle: async ({
    webMessage,
    downloadImageBuffer,
    downloadVideoBuffer,
    sendErrorReply,
    sendStickerFromBuffer,
  }) => {
    try {
      const imageBuffer = await downloadImageBuffer(webMessage);
      const videoBuffer = !imageBuffer
        ? await downloadVideoBuffer(webMessage)
        : null;

      if (!imageBuffer && !videoBuffer) {
        await sendErrorReply(
          "Por favor, envie uma imagem ou vídeo para criar um sticker."
        );
        return;
      }

      let stickerWebpBuffer;

      if (imageBuffer) {
        stickerWebpBuffer = await sharp(imageBuffer)
          .resize(512, 512, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .webp()
          .toBuffer();
      } else if (videoBuffer) {
        try {
          stickerWebpBuffer = await convertVideoToWebp(videoBuffer);
        } catch (error) {
          await sendErrorReply(
            "Houve um erro ao converter o vídeo para sticker."
          );
          return;
        }
      }

      const webp = new Webp.Image();
      await webp.load(stickerWebpBuffer);

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
      const finalStickerBuffer = await webp.save(null);

      await sendStickerFromBuffer(finalStickerBuffer);
    } catch (error) {
      appLogger.error("Error creating sticker: %o", {
        error: error.message,
        stack: error.stack,
      });
      await sendErrorReply("Tente novamente.");
    }
  },
};
