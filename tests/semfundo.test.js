import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@imgly/background-removal-node", () => ({
  removeBackground: vi.fn(async (imageBlob) => imageBlob),
}));

import semfundoCommand from "../commands/user/semfundo.js";

// 1x1 PNG (red pixel) used as deterministic fixture in tests.
const RED_PIXEL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2L4s8AAAAASUVORK5CYII=";

describe("semfundo command", () => {
  let mockParams;

  beforeEach(() => {
    mockParams = {
      webMessage: {
        pushName: "TestUser",
      },
      isImage: false,
      downloadImageBuffer: vi.fn(),
      sendErrorReply: vi.fn(),
      sendStickerFromBuffer: vi.fn(),
      sendWaitReact: vi.fn(),
      sendSucessReact: vi.fn(),
    };
  });

  it("should have correct command metadata", () => {
    expect(semfundoCommand.name).toBe("Sem Fundo");
    expect(semfundoCommand.commands).toEqual(["semfundo", "sf", "removebg"]);
    expect(semfundoCommand.description).toContain("Remove o fundo");
  });

  it("should reject non-image messages", async () => {
    mockParams.isImage = false;

    await semfundoCommand.handle(mockParams);

    expect(mockParams.sendErrorReply).toHaveBeenCalledWith(
      expect.stringContaining("Envie ou responda uma imagem"),
    );
    expect(mockParams.sendWaitReact).not.toHaveBeenCalled();
  });

  it("should reject when image download fails", async () => {
    mockParams.isImage = true;
    mockParams.downloadImageBuffer.mockResolvedValue(null);

    await semfundoCommand.handle(mockParams);

    expect(mockParams.sendWaitReact).toHaveBeenCalled();
    expect(mockParams.sendErrorReply).toHaveBeenCalledWith(
      expect.stringContaining("Não foi possível baixar a imagem"),
    );
  });

  it("should process image and send sticker when background removal succeeds", async () => {
    // Use a static PNG fixture to avoid flaky runtime sharp image generation.
    const testImageBuffer = Buffer.from(RED_PIXEL_PNG_BASE64, "base64");

    mockParams.isImage = true;
    mockParams.downloadImageBuffer.mockResolvedValue(testImageBuffer);

    await semfundoCommand.handle(mockParams);

    expect(mockParams.sendWaitReact).toHaveBeenCalled();
    expect(mockParams.sendStickerFromBuffer).toHaveBeenCalled();
    expect(mockParams.sendSucessReact).toHaveBeenCalled();
  });
});
