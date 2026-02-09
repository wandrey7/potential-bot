import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getWelcomeTemplate,
  sendWelcomeMessage,
  substituteMentionsAndVariables,
} from "../services/welcomeService.js";

// Mock the logger
vi.mock("../config/logs.js", () => ({
  appLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock the Prisma client
vi.mock("../prisma/client.js", () => ({
  default: {
    group: {
      findUnique: vi.fn(),
    },
  },
}));

import { appLogger } from "../config/logs.js";
import prisma from "../prisma/client.js";

describe("welcomeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("substituteMentionsAndVariables", () => {
    it("should substitute all variables in template correctly", () => {
      const template = "Bem-vindo @{memberName} ao grupo {groupName}!";
      const variables = {
        memberName: "João",
        groupName: "Dev Team",
        memberJid: "5511999999999@s.whatsapp.net",
      };

      const result = substituteMentionsAndVariables(template, variables);

      expect(result.text).toContain("Bem-vindo @João ao grupo Dev Team!");
      expect(result.mentions).toContain("5511999999999@s.whatsapp.net");
    });

    it("should substitute date and time variables", () => {
      const testDate = new Date("2025-02-09T14:30:00");
      const template = "Entrada em {date} às {time}";
      const variables = {
        memberName: "João",
        groupName: "Grupo",
        date: testDate,
        memberJid: "5511999999999@s.whatsapp.net",
      };

      const result = substituteMentionsAndVariables(template, variables);

      expect(result.text).toContain("09/02/2025");
      expect(result.text).toContain("14:30");
    });

    it("should create mentions array with memberJid", () => {
      const template = "Bem-vindo @{memberName}!";
      const memberJid = "5511999999999@s.whatsapp.net";
      const variables = {
        memberName: "João",
        groupName: "Grupo",
        memberJid,
      };

      const result = substituteMentionsAndVariables(template, variables);

      expect(result.mentions).toEqual([memberJid]);
    });

    it("should throw error if template is not a string", () => {
      expect(() => {
        substituteMentionsAndVariables(null, {
          memberName: "João",
          groupName: "Grupo",
        });
      }).toThrow("Template must be a non-empty string");
    });

    it("should throw error if variables is not an object", () => {
      expect(() => {
        substituteMentionsAndVariables("Template", "invalid");
      }).toThrow("Variables must be an object");
    });

    it("should throw error if memberName is missing", () => {
      expect(() => {
        substituteMentionsAndVariables("Template", { groupName: "Grupo" });
      }).toThrow("memberName is required and must be a string");
    });

    it("should throw error if groupName is missing", () => {
      expect(() => {
        substituteMentionsAndVariables("Template", { memberName: "João" });
      }).toThrow("groupName is required and must be a string");
    });

    it("should handle multiple occurrences of same variable", () => {
      const template =
        "Bem-vindo {memberName}! {memberName} é novo no {groupName}!";
      const variables = {
        memberName: "João",
        groupName: "Dev Team",
        memberJid: "5511999999999@s.whatsapp.net",
      };

      const result = substituteMentionsAndVariables(template, variables);

      expect(result.text).toBe("Bem-vindo João! João é novo no Dev Team!");
    });

    it("should add memberJid to mentions when template contains @{memberName}", () => {
      const template = "Bem-vindo @{memberName} ao grupo {groupName}!";
      const memberJid = "5511999999999@s.whatsapp.net";
      const variables = {
        memberName: "João",
        groupName: "Dev Team",
        memberJid,
      };

      const result = substituteMentionsAndVariables(template, variables);

      expect(result.text).toBe("Bem-vindo @João ao grupo Dev Team!");
      expect(result.mentions).toEqual([memberJid]);
    });

    it("should add memberJid to mentions when template contains {memberName} (without @)", () => {
      const template = "Bem-vindo {memberName} ao grupo {groupName}!";
      const memberJid = "5511999999999@s.whatsapp.net";
      const variables = {
        memberName: "João",
        groupName: "Dev Team",
        memberJid,
      };

      const result = substituteMentionsAndVariables(template, variables);

      expect(result.text).toBe("Bem-vindo João ao grupo Dev Team!");
      expect(result.mentions).toEqual([memberJid]);
    });
  });

  describe("getWelcomeTemplate", () => {
    it("should return default template", async () => {
      const template = await getWelcomeTemplate("123456789@g.us");

      expect(template).toBeDefined();
      expect(template).toContain("{memberName}");
      expect(template).toContain("{groupName}");
    });

    it("should handle errors gracefully and return default template", async () => {
      // Even if there's an error, should return default template
      const template = await getWelcomeTemplate("invalid");

      expect(template).toBeDefined();
      expect(typeof template).toBe("string");
    });
  });

  describe("sendWelcomeMessage", () => {
    let mockSocket;

    beforeEach(() => {
      mockSocket = {
        sendMessage: vi.fn().mockResolvedValue(true),
      };
      prisma.group.findUnique.mockResolvedValue(null);
    });

    it("should send message with correct text and mentions", async () => {
      const result = await sendWelcomeMessage(mockSocket, "123456789@g.us", {
        jid: "5511999999999@s.whatsapp.net",
        name: "João",
      });

      expect(result).toBe(true);
      expect(mockSocket.sendMessage).toHaveBeenCalled();

      const callArgs = mockSocket.sendMessage.mock.calls[0];
      expect(callArgs[0]).toBe("123456789@g.us");
      expect(callArgs[1].text).toContain("João");
      expect(callArgs[1].mentions).toContain("5511999999999@s.whatsapp.net");
    });

    it("should fetch group name from database when available", async () => {
      prisma.group.findUnique.mockResolvedValue({ name: "Tech Lovers" });

      await sendWelcomeMessage(mockSocket, "123456789@g.us", {
        jid: "5511999999999@s.whatsapp.net",
        name: "João",
      });

      expect(prisma.group.findUnique).toHaveBeenCalledWith({
        where: { groupJid: "123456789@g.us" },
        select: { name: true },
      });

      const messageText = mockSocket.sendMessage.mock.calls[0][1].text;
      expect(messageText).toContain("Tech Lovers");
    });

    it("should use default group name when database query fails", async () => {
      prisma.group.findUnique.mockRejectedValue(new Error("DB Error"));

      await sendWelcomeMessage(mockSocket, "123456789@g.us", {
        jid: "5511999999999@s.whatsapp.net",
        name: "João",
      });

      expect(appLogger.warn).toHaveBeenCalled();
      const messageText = mockSocket.sendMessage.mock.calls[0][1].text;
      expect(messageText).toContain("Grupo");
    });

    it("should throw error if socket is invalid", async () => {
      const result = await sendWelcomeMessage(null, "123456789@g.us", {
        jid: "5511999999999@s.whatsapp.net",
        name: "João",
      });

      expect(result).toBe(false);
      expect(appLogger.error).toHaveBeenCalled();
    });

    it("should throw error if groupJid is invalid", async () => {
      const result = await sendWelcomeMessage(mockSocket, null, {
        jid: "5511999999999@s.whatsapp.net",
        name: "João",
      });

      expect(result).toBe(false);
      expect(appLogger.error).toHaveBeenCalled();
    });

    it("should throw error if newMember is invalid", async () => {
      const result = await sendWelcomeMessage(
        mockSocket,
        "123456789@g.us",
        null,
      );

      expect(result).toBe(false);
      expect(appLogger.error).toHaveBeenCalled();
    });

    it("should throw error if newMember.jid is missing", async () => {
      const result = await sendWelcomeMessage(mockSocket, "123456789@g.us", {
        name: "João",
      });

      expect(result).toBe(false);
      expect(appLogger.error).toHaveBeenCalled();
    });

    it("should throw error if newMember.name is missing", async () => {
      const result = await sendWelcomeMessage(mockSocket, "123456789@g.us", {
        jid: "5511999999999@s.whatsapp.net",
      });

      expect(result).toBe(false);
      expect(appLogger.error).toHaveBeenCalled();
    });

    it("should log success when message is sent", async () => {
      await sendWelcomeMessage(mockSocket, "123456789@g.us", {
        jid: "5511999999999@s.whatsapp.net",
        name: "João",
      });

      expect(appLogger.info).toHaveBeenCalled();
      const logCall = appLogger.info.mock.calls.find((call) =>
        call[0].includes("Welcome message sent"),
      );
      expect(logCall).toBeDefined();
    });

    it("should handle socket.sendMessage errors", async () => {
      mockSocket.sendMessage.mockRejectedValue(new Error("Send failed"));

      const result = await sendWelcomeMessage(mockSocket, "123456789@g.us", {
        jid: "5511999999999@s.whatsapp.net",
        name: "João",
      });

      expect(result).toBe(false);
      expect(appLogger.error).toHaveBeenCalled();
    });
  });
});
