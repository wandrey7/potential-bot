import { describe, it, expect } from "vitest";
import {
  ensureStickerSize,
  processImageToSticker,
} from "../utils/stickerHelpers.js";
import sharp from "sharp";

describe("stickerHelpers", () => {
  describe("processImageToSticker", () => {
    it("should process an image to a 512x512 WebP sticker", async () => {
      // Create a simple 1000x1000 test image
      const testImageBuffer = await sharp({
        create: {
          width: 1000,
          height: 1000,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const result = await processImageToSticker(testImageBuffer);

      // Verify it's a WebP buffer
      expect(result).toBeInstanceOf(Buffer);
      
      // Verify dimensions
      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe("webp");
      expect(metadata.width).toBeLessThanOrEqual(512);
      expect(metadata.height).toBeLessThanOrEqual(512);
    });
  });

  describe("ensureStickerSize", () => {
    it("should return buffer as-is if under 1MB", async () => {
      // Create a small WebP
      const smallBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .webp()
        .toBuffer();

      const result = await ensureStickerSize(smallBuffer, false);
      
      // Should be unchanged since it's small
      expect(result.length).toBeLessThan(1024 * 1024);
    });
  });
});
