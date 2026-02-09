import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onGroupParticipantsUpdate } from "../middleware/onGroupParticipantsUpdate.js";

// Mock the logger
vi.mock("../config/logs.js", () => ({
  appLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock the welcome service
vi.mock("../services/welcomeService.js", () => ({
  sendWelcomeMessage: vi.fn(),
}));

import { sendWelcomeMessage } from "../services/welcomeService.js";
import { appLogger } from "../config/logs.js";

describe("onGroupParticipantsUpdate", () => {
  let mockSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket = {
      sendMessage: vi.fn(),
    };
    sendWelcomeMessage.mockResolvedValue(true);
  });

  describe("Basic functionality", () => {
    it("should call sendWelcomeMessage for each new participant", async () => {
      const update = {
        id: "123456789@g.us",
        participants: ["5511999999999@s.whatsapp.net", "5511888888888@s.whatsapp.net"],
        action: "add",
      };

      await onGroupParticipantsUpdate(mockSocket, update);

      expect(sendWelcomeMessage).toHaveBeenCalledTimes(2);
      expect(sendWelcomeMessage).toHaveBeenCalledWith(
        mockSocket,
        "123456789@g.us",
        expect.objectContaining({
          jid: "5511999999999@s.whatsapp.net",
        })
      );
      expect(sendWelcomeMessage).toHaveBeenCalledWith(
        mockSocket,
        "123456789@g.us",
        expect.objectContaining({
          jid: "5511888888888@s.whatsapp.net",
        })
      );
    });

    it("should ignore 'remove' action", async () => {
      const update = {
        id: "123456789@g.us",
        participants: ["5511999999999@s.whatsapp.net"],
        action: "remove",
      };

      await onGroupParticipantsUpdate(mockSocket, update);

      expect(sendWelcomeMessage).not.toHaveBeenCalled();
    });

    it("should ignore 'promote' action", async () => {
      const update = {
        id: "123456789@g.us",
        participants: ["5511999999999@s.whatsapp.net"],
        action: "promote",
      };

      await onGroupParticipantsUpdate(mockSocket, update);

      expect(sendWelcomeMessage).not.toHaveBeenCalled();
    });

    it("should ignore 'demote' action", async () => {
      const update = {
        id: "123456789@g.us",
        participants: ["5511999999999@s.whatsapp.net"],
        action: "demote",
      };

      await onGroupParticipantsUpdate(mockSocket, update);

      expect(sendWelcomeMessage).not.toHaveBeenCalled();
    });
  });

  describe("Input validation", () => {
    it("should handle null socket gracefully", async () => {
      const update = {
        id: "123456789@g.us",
        participants: ["5511999999999@s.whatsapp.net"],
        action: "add",
      };

      await onGroupParticipantsUpdate(null, update);

      expect(appLogger.error).toHaveBeenCalled();
      expect(sendWelcomeMessage).not.toHaveBeenCalled();
    });

    it("should handle invalid socket object", async () => {
      const update = {
        id: "123456789@g.us",
        participants: ["5511999999999@s.whatsapp.net"],
        action: "add",
      };

      await onGroupParticipantsUpdate({}, update);

      expect(appLogger.error).toHaveBeenCalled();
      expect(sendWelcomeMessage).not.toHaveBeenCalled();
    });

    it("should handle null update gracefully", async () => {
      await onGroupParticipantsUpdate(mockSocket, null);

      expect(appLogger.error).toHaveBeenCalled();
      expect(sendWelcomeMessage).not.toHaveBeenCalled();
    });

    it("should handle invalid update object (not an object)", async () => {
      await onGroupParticipantsUpdate(mockSocket, "invalid");

      expect(appLogger.error).toHaveBeenCalled();
      expect(sendWelcomeMessage).not.toHaveBeenCalled();
    });

    it("should handle missing groupJid", async () => {
      const update = {
        participants: ["5511999999999@s.whatsapp.net"],
        action: "add",
      };

      await onGroupParticipantsUpdate(mockSocket, update);

      expect(appLogger.error).toHaveBeenCalled();
      expect(sendWelcomeMessage).not.toHaveBeenCalled();
    });

    it("should handle invalid groupJid (not a string)", async () => {
      const update = {
        id: 123456789,
        participants: ["5511999999999@s.whatsapp.net"],
        action: "add",
      };

      await onGroupParticipantsUpdate(mockSocket, update);

      expect(appLogger.error).toHaveBeenCalled();
      expect(sendWelcomeMessage).not.toHaveBeenCalled();
    });

    it("should handle empty participants array", async () => {
      const update = {
        id: "123456789@g.us",
        participants: [],
        action: "add",
      };

      await onGroupParticipantsUpdate(mockSocket, update);

      expect(appLogger.debug).toHaveBeenCalled();
      expect(sendWelcomeMessage).not.toHaveBeenCalled();
    });

    it("should handle missing participants array", async () => {
      const update = {
        id: "123456789@g.us",
        action: "add",
      };

      await onGroupParticipantsUpdate(mockSocket, update);

      expect(appLogger.debug).toHaveBeenCalled();
      expect(sendWelcomeMessage).not.toHaveBeenCalled();
    });
  });

  describe("Error handling", () => {
    it("should continue processing if one participant fails", async () => {
      sendWelcomeMessage
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error("Send failed"))
        .mockResolvedValueOnce(true);

      const update = {
        id: "123456789@g.us",
        participants: [
          "5511999999999@s.whatsapp.net",
          "5511888888888@s.whatsapp.net",
          "5511777777777@s.whatsapp.net",
        ],
        action: "add",
      };

      await onGroupParticipantsUpdate(mockSocket, update);

      expect(sendWelcomeMessage).toHaveBeenCalledTimes(3);
      expect(appLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          error: "Send failed",
        })
      );
    });

    it("should catch and log errors in the main handler", async () => {
      const update = {
        id: "123456789@g.us",
        participants: ["5511999999999@s.whatsapp.net"],
        action: "add",
      };

      sendWelcomeMessage.mockRejectedValue(new Error("Critical error"));

      await onGroupParticipantsUpdate(mockSocket, update);

      expect(appLogger.error).toHaveBeenCalled();
    });
  });

  describe("Member JID extraction", () => {
    it("should extract phone number as fallback name from JID", async () => {
      const update = {
        id: "123456789@g.us",
        participants: ["5511999999999@s.whatsapp.net"],
        action: "add",
      };

      await onGroupParticipantsUpdate(mockSocket, update);

      expect(sendWelcomeMessage).toHaveBeenCalledWith(
        mockSocket,
        "123456789@g.us",
        expect.objectContaining({
          jid: "5511999999999@s.whatsapp.net",
          name: "5511999999999",
        })
      );
    });

    it("should handle different JID formats", async () => {
      const update = {
        id: "123456789@g.us",
        participants: ["5511999999999@s.whatsapp.net", "554699999999@s.whatsapp.net"],
        action: "add",
      };

      await onGroupParticipantsUpdate(mockSocket, update);

      expect(sendWelcomeMessage).toHaveBeenCalledTimes(2);
      const calls = sendWelcomeMessage.mock.calls;
      expect(calls[0][2].jid).toBe("5511999999999@s.whatsapp.net");
      expect(calls[1][2].jid).toBe("554699999999@s.whatsapp.net");
    });
  });

  describe("Logging", () => {
    it("should log info when processing participant update", async () => {
      const update = {
        id: "123456789@g.us",
        participants: ["5511999999999@s.whatsapp.net"],
        action: "add",
      };

      await onGroupParticipantsUpdate(mockSocket, update);

      expect(appLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          groupJid: "123456789@g.us",
          action: "add",
          participantsCount: 1,
        })
      );
    });

    it("should log debug for each participant being processed", async () => {
      const update = {
        id: "123456789@g.us",
        participants: ["5511999999999@s.whatsapp.net"],
        action: "add",
      };

      await onGroupParticipantsUpdate(mockSocket, update);

      expect(appLogger.debug).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          groupJid: "123456789@g.us",
          memberJid: "5511999999999@s.whatsapp.net",
          memberName: "5511999999999",
        })
      );
    });
  });
});
