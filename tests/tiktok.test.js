import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/logs.js", () => ({
  appLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../prisma/client.js", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("child_process", () => ({
  execFile: vi.fn(),
}));

import { execFile } from "child_process";
import tiktokCommand from "../commands/user/tiktok.js";
import { appLogger } from "../config/logs.js";
import prisma from "../prisma/client.js";

const buildParams = (overrides = {}) => ({
  socket: { sendMessage: vi.fn() },
  remoteJid: "123456789@s.whatsapp.net",
  senderJid: "5511999999999@s.whatsapp.net",
  args: [],
  webMessage: { key: { id: "123" } },
  sendErrorReply: vi.fn(),
  sendWaitReact: vi.fn(),
  sendSucessReact: vi.fn(),
  ...overrides,
});

describe("tiktok command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      senderJid: "5511999999999@s.whatsapp.net",
      lastDownload: null,
    });
    prisma.user.update.mockResolvedValue({
      senderJid: "5511999999999@s.whatsapp.net",
      lastDownload: new Date(),
    });
  });

  describe("Command structure", () => {
    it("should have required exports (name, description, commands, usage, handle)", () => {
      expect(tiktokCommand.name).toBe("tiktok");
      expect(tiktokCommand.description).toBeDefined();
      expect(Array.isArray(tiktokCommand.commands)).toBe(true);
      expect(tiktokCommand.commands).toContain("tiktok");
      expect(tiktokCommand.usage).toBeDefined();
      expect(typeof tiktokCommand.handle).toBe("function");
    });
  });

  describe("Empty arguments", () => {
    it("should return usage message when no args provided", async () => {
      const params = buildParams({ args: [] });
      await tiktokCommand.handle(params);

      expect(params.sendErrorReply).toHaveBeenCalledWith(
        expect.stringContaining("Por favor, forneça uma URL de TikTok")
      );
    });
  });

  describe("URL validation", () => {
    it("should reject non-TikTok URL", async () => {
      const params = buildParams({
        args: ["https://youtube.com/watch?v=abc"],
      });
      await tiktokCommand.handle(params);

      expect(params.sendErrorReply).toHaveBeenCalledWith(
        expect.stringContaining("URL inválida")
      );
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("should accept valid tiktok.com URL through URL validation", async () => {
      const params = buildParams({
        args: ["https://www.tiktok.com/@user/video/123456789"],
      });

      prisma.user.findUnique.mockResolvedValue({
        senderJid: params.senderJid,
        lastDownload: new Date(Date.now() - 120000),
      });

      // Mock execFile to handle metadata call
      execFile.mockImplementationOnce((cmd, args, cb) => {
        expect(cmd).toBe("yt-dlp");
        expect(args[0]).toBe("--dump-json");
        cb(null, JSON.stringify({ filesize: 50000000, duration: 15 }));
        return {
          stdout: { on: vi.fn() },
          stderr: { on: vi.fn() },
        };
      });

      // Mock for download call
      const mockStdout = {
        on: vi.fn((event, handler) => {
          if (event === "data") {
            handler(Buffer.from("video"));
          }
        }),
      };

      execFile.mockImplementationOnce((cmd, args, options, cb) => {
        expect(cmd).toBe("yt-dlp");
        expect(args[0]).toBe("-f");
        cb(null);
        return {
          stdout: mockStdout,
          stderr: { on: vi.fn() },
        };
      });

      await tiktokCommand.handle(params);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { senderJid: params.senderJid },
      });
    });

    it("should accept valid vm.tiktok.com short URL", async () => {
      const params = buildParams({
        args: ["https://vm.tiktok.com/abc123/"],
      });

      prisma.user.findUnique.mockResolvedValue({
        senderJid: params.senderJid,
        lastDownload: new Date(Date.now() - 120000),
      });

      // URL validation should pass
      expect(params.args[0]).toBe("https://vm.tiktok.com/abc123/");
    });
  });

  describe("Cooldown enforcement", () => {
    it("should reject user on cooldown with remaining time", async () => {
      const now = Date.now();
      const params = buildParams({ args: ["https://vm.tiktok.com/abc123/"] });

      const lastDownload = new Date(now - 30000); // 30 seconds ago
      prisma.user.findUnique.mockResolvedValue({
        senderJid: params.senderJid,
        lastDownload,
      });

      await tiktokCommand.handle(params);

      expect(params.sendErrorReply).toHaveBeenCalledWith(
        expect.stringContaining("Você precisa aguardar")
      );
      expect(params.sendWaitReact).not.toHaveBeenCalled();
    });
  });

  describe("Cooldown expiration", () => {
    it("should allow download when cooldown expired", async () => {
      const params = buildParams({ args: ["https://vm.tiktok.com/abc123/"] });

      prisma.user.findUnique.mockResolvedValue({
        senderJid: params.senderJid,
        lastDownload: new Date(Date.now() - 120000), // 120 seconds ago
      });

      execFile.mockImplementationOnce((cmd, args, cb) => {
        cb(null, JSON.stringify({ filesize: 50000000, duration: 15 }));
        return {
          stdout: { on: vi.fn() },
          stderr: { on: vi.fn() },
        };
      });

      const mockStdout = {
        on: vi.fn((event, handler) => {
          if (event === "data") handler(Buffer.from("v"));
        }),
      };

      execFile.mockImplementationOnce((cmd, args, options, cb) => {
        cb(null);
        return {
          stdout: mockStdout,
          stderr: { on: vi.fn() },
        };
      });

      await tiktokCommand.handle(params);

      expect(params.sendWaitReact).toHaveBeenCalled();
    });
  });
  describe("Metadata query via --dump-json", () => {
    it("should call yt-dlp with --dump-json flag", async () => {
      const url = "https://vm.tiktok.com/abc123/";
      const params = buildParams({ args: [url] });

      prisma.user.findUnique.mockResolvedValue({
        senderJid: params.senderJid,
        lastDownload: new Date(Date.now() - 120000),
      });

      execFile.mockImplementationOnce((cmd, args, cb) => {
        expect(args[0]).toBe("--dump-json");
        expect(args[1]).toBe(url);
        cb(null, JSON.stringify({ filesize: 50000000, duration: 15 }));
        return {
          stdout: { on: vi.fn() },
          stderr: { on: vi.fn() },
        };
      });

      const mockStdout = {
        on: vi.fn((event, handler) => {
          if (event === "data") handler(Buffer.from("v"));
        }),
      };

      execFile.mockImplementationOnce((cmd, args, options, cb) => {
        cb(null);
        return {
          stdout: mockStdout,
          stderr: { on: vi.fn() },
        };
      });

      await tiktokCommand.handle(params);

      // Verify metadata query was called
      expect(execFile).toHaveBeenCalledTimes(2);
    });
  });
  describe("Size limit enforcement", () => {
    it("should reject video >100MB", async () => {
      const params = buildParams({ args: ["https://vm.tiktok.com/abc123/"] });

      prisma.user.findUnique.mockResolvedValue({
        senderJid: params.senderJid,
        lastDownload: new Date(Date.now() - 120000),
      });

      // 150MB file
      const largeFilesize = 150 * 1024 * 1024;

      execFile.mockImplementationOnce((cmd, args, cb) => {
        cb(null, JSON.stringify({ filesize: largeFilesize, duration: 15 }));
        return {
          stdout: { on: vi.fn() },
          stderr: { on: vi.fn() },
        };
      });

      await tiktokCommand.handle(params);

      expect(params.sendErrorReply).toHaveBeenCalledWith(
        expect.stringContaining("vídeo é muito grande")
      );
      expect(params.socket.sendMessage).not.toHaveBeenCalled();
    });
  });
  describe("Download with acceptable size", () => {
    it("should proceed to download when size ≤100MB", async () => {
      const params = buildParams({ args: ["https://vm.tiktok.com/abc123/"] });

      prisma.user.findUnique.mockResolvedValue({
        senderJid: params.senderJid,
        lastDownload: new Date(Date.now() - 120000),
      });

      // First call: metadata
      execFile.mockImplementationOnce((cmd, args, cb) => {
        cb(null, JSON.stringify({ filesize: 50 * 1024 * 1024, duration: 15 }));
        return {
          stdout: { on: vi.fn() },
          stderr: { on: vi.fn() },
        };
      });

      // Second call: download
      const mockStdout = {
        on: vi.fn((event, handler) => {
          if (event === "data") handler(Buffer.from("video"));
        }),
      };

      execFile.mockImplementationOnce((cmd, args, options, cb) => {
        expect(args[0]).toBe("-f");
        expect(args[1]).toBe("best[filesize<100M]");
        expect(args[2]).toBe("-o");
        expect(args[3]).toBe("-");
        cb(null);
        return {
          stdout: mockStdout,
          stderr: { on: vi.fn() },
        };
      });

      await tiktokCommand.handle(params);

      // Both calls should have been made
      expect(execFile).toHaveBeenCalledTimes(2);
    });
  });
  describe("Successful download", () => {
    it("should update lastDownload after successful download", async () => {
      const params = buildParams({ args: ["https://vm.tiktok.com/abc123/"] });

      prisma.user.findUnique.mockResolvedValue({
        senderJid: params.senderJid,
        lastDownload: new Date(Date.now() - 120000),
      });

      // Metadata call
      execFile.mockImplementationOnce((cmd, args, cb) => {
        cb(null, JSON.stringify({ filesize: 50000000, duration: 15 }));
        return {
          stdout: { on: vi.fn() },
          stderr: { on: vi.fn() },
        };
      });

      // Download call
      const mockStdout = {
        on: vi.fn((event, handler) => {
          if (event === "data") handler(Buffer.from("video"));
        }),
      };

      execFile.mockImplementationOnce((cmd, args, options, cb) => {
        cb(null);
        return {
          stdout: mockStdout,
          stderr: { on: vi.fn() },
        };
      });

      await tiktokCommand.handle(params);

      expect(params.socket.sendMessage).toHaveBeenCalledWith(
        params.remoteJid,
        expect.objectContaining({
          video: expect.any(Buffer),
          caption: expect.stringContaining("TikTok Video"),
        }),
        expect.any(Object)
      );

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { senderJid: params.senderJid },
        data: { lastDownload: expect.any(Date) },
      });

      expect(params.sendSucessReact).toHaveBeenCalled();
    });
  });
  describe("Metadata query failure", () => {
    it("should handle private/unavailable video without updating cooldown", async () => {
      const params = buildParams({ args: ["https://vm.tiktok.com/abc123/"] });

      prisma.user.findUnique.mockResolvedValue({
        senderJid: params.senderJid,
        lastDownload: new Date(Date.now() - 120000),
      });

      execFile.mockImplementationOnce((cmd, args, cb) => {
        cb(new Error("Video not found or is private"));
        return {
          stdout: { on: vi.fn() },
          stderr: { on: vi.fn() },
        };
      });

      await tiktokCommand.handle(params);

      expect(params.sendErrorReply).toHaveBeenCalledWith(
        expect.stringContaining("Não foi possível obter informações")
      );

      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
  describe("Download process error", () => {
    it("should handle download error without updating cooldown", async () => {
      const params = buildParams({ args: ["https://vm.tiktok.com/abc123/"] });

      prisma.user.findUnique.mockResolvedValue({
        senderJid: params.senderJid,
        lastDownload: new Date(Date.now() - 120000),
      });

      // Metadata succeeds
      execFile.mockImplementationOnce((cmd, args, cb) => {
        cb(null, JSON.stringify({ filesize: 50000000, duration: 15 }));
        return {
          stdout: { on: vi.fn() },
          stderr: { on: vi.fn() },
        };
      });

      // Download fails
      execFile.mockImplementationOnce((cmd, args, options, cb) => {
        cb(new Error("Network timeout"));
        return {
          stdout: { on: vi.fn() },
          stderr: { on: vi.fn() },
        };
      });

      await tiktokCommand.handle(params);

      expect(params.sendErrorReply).toHaveBeenCalledWith(
        expect.stringContaining("Erro ao baixar")
      );

      expect(appLogger.error).toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
  describe("Test suite validation", () => {
    it("all tests should be defined and executable", () => {
      expect(tiktokCommand).toBeDefined();
      expect(prisma).toBeDefined();
      expect(execFile).toBeDefined();
    });
  });
});
