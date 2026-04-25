import { describe, it, expect, vi, beforeEach } from "vitest";
import semfundoCommand from "../commands/user/semfundo.js";
import sharp from "sharp";

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
      expect.stringContaining("Envie ou responda uma imagem")
    );
    expect(mockParams.sendWaitReact).not.toHaveBeenCalled();
  });

  it("should reject when image download fails", async () => {
    mockParams.isImage = true;
    mockParams.downloadImageBuffer.mockResolvedValue(null);

    await semfundoCommand.handle(mockParams);

    expect(mockParams.sendWaitReact).toHaveBeenCalled();
    expect(mockParams.sendErrorReply).toHaveBeenCalledWith(
      expect.stringContaining("Não foi possível baixar a imagem")
    );
  });

  it("should process image with background removal (integration test)", async () => {
    // Create a test image (simple red square)
    const testImageBuffer = await sharp({
      create: {
        width: 500,
        height: 500,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    mockParams.isImage = true;
    mockParams.downloadImageBuffer.mockResolvedValue(testImageBuffer);

    // Note: This will actually call the removeBackground function which might take time
    // In a real test environment, you might want to mock this
    await semfundoCommand.handle(mockParams);

    expect(mockParams.sendWaitReact).toHaveBeenCalled();
    // The actual background removal and sticker creation should complete
    // and call these methods
    expect(mockParams.sendStickerFromBuffer).toHaveBeenCalled();
    expect(mockParams.sendSucessReact).toHaveBeenCalled();
  }, 60000); // 60 second timeout for AI processing
});
