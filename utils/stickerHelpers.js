import { spawn } from "child_process";
import Webp from "node-webpmux";
import sharp from "sharp";
import { BOT_LINK, BOT_NAME } from "../config/config.js";
import { appLogger } from "../config/logs.js";

/**
 * Converts a video buffer to WebP format using ffmpeg
 * @param {Buffer} videoBuffer - The video buffer to convert
 * @returns {Promise<Buffer>} - WebP buffer
 */
export const convertVideoToWebp = (videoBuffer) => {
  return new Promise((resolve, reject) => {
    const ffmpegArgs = [
      "-i",
      "pipe:0", // Input from stdin
      "-t",
      "5", // Limit duration to 5 seconds (reduced from 6)
      "-fs",
      "500K", // Limit file size to 500KB (reduced from 950K for iOS compatibility)
      "-vf",
      "scale=512:512:force_original_aspect_ratio=decrease,fps=10,pad=512:512:-1:-1:color=black@0.0",
      "-loop",
      "0", // Loop indefinitely
      "-an", // No audio
      "-quality",
      "75", // WebP quality (0-100, lower = smaller file)
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

/**
 * Ensures the sticker buffer is under 1MB for iOS compatibility
 * If the buffer is too large, it reprocesses with lower quality
 * @param {Buffer} webpBuffer - The WebP buffer to check/compress
 * @param {boolean} animated - Whether the sticker is animated
 * @returns {Promise<Buffer>} - Compressed WebP buffer
 */
export const ensureStickerSize = async (webpBuffer, animated = false) => {
  const MAX_SIZE_BYTES = 1024 * 1024; // 1MB in bytes

  // If already under 1MB, return as is
  if (webpBuffer.length <= MAX_SIZE_BYTES) {
    appLogger.info(
      `Sticker size OK: ${(webpBuffer.length / 1024).toFixed(2)}KB`
    );
    return webpBuffer;
  }

  appLogger.warn(
    `Sticker too large (${(webpBuffer.length / 1024).toFixed(2)}KB), reprocessing...`
  );

  try {
    const qualities = [50, 35];

    for (const quality of qualities) {
      const compressedBuffer = await sharp(webpBuffer, { animated })
        .webp({ quality, effort: 4 })
        .toBuffer();

      if (compressedBuffer.length <= MAX_SIZE_BYTES) {
        appLogger.info(
          `Sticker compressed to ${(compressedBuffer.length / 1024).toFixed(2)}KB at quality ${quality}`
        );
        return compressedBuffer;
      }
    }

    // If still too large after all attempts, return the most compressed version
    appLogger.warn("Could not reduce sticker below 1MB, using lowest quality");
    const finalBuffer = await sharp(webpBuffer, { animated })
      .webp({ quality: 25, effort: 4 })
      .toBuffer();

    return finalBuffer;
  } catch (error) {
    appLogger.error("Error compressing sticker: %o", error);
    return webpBuffer;
  }
};

/**
 * Builds a WebP sticker buffer with EXIF metadata (pack name, author, etc.)
 * @param {Buffer} webpBuffer - The WebP buffer to add metadata to
 * @param {string} pushName - The name of the user who requested the sticker
 * @returns {Promise<Buffer>} - WebP buffer with EXIF metadata
 */
export const buildStickerWithExif = async (webpBuffer, pushName) => {
  const webp = new Webp.Image();
  await webp.load(webpBuffer);

  const json = {
    "sticker-pack-id": Date.now().toString(),
    "sticker-pack-name": `Solicitado por: ${pushName} \n\n`,
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
  return webp.save(null);
};

/**
 * Processes an image buffer to a WebP sticker (512x512 with transparent background)
 * @param {Buffer} imageBuffer - The image buffer to process
 * @returns {Promise<Buffer>} - WebP buffer
 */
export const processImageToSticker = async (imageBuffer) => {
  return sharp(imageBuffer)
    .resize(512, 512, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp()
    .toBuffer();
};
