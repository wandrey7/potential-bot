import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/logs.js", () => ({
  appLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  fileLogger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("baileys", () => ({
  isJidGroup: vi.fn(),
}));

vi.mock("../middleware/checkPermission.js", () => ({
  checkPermission: vi.fn(),
}));

vi.mock("../services/groupService.js", () => ({
  checkGroupRentalStatus: vi.fn(),
  createGroupIfNotExists: vi.fn(),
}));

vi.mock("../services/userService.js", () => ({
  addUserIfNotExists: vi.fn(),
  checkUserPermission: vi.fn(),
  createUserGroupIfNotExists: vi.fn(),
}));

vi.mock("../utils/extractDataFromMessage.js", () => ({
  findCommandImport: vi.fn(),
  verifyPrefix: vi.fn(),
}));

vi.mock("../config/config.js", () => ({
  OWNER_NUMBER: "5551999999999",
  PREFIX: "/",
  BOT_EMOJI: ":)",
}));

import { dynamicCommand } from "../utils/dynamicCommand.js";
import { DangerError, InvalidParameterError } from "../utils/errors.js";
import { appLogger, fileLogger } from "../config/logs.js";
import { isJidGroup } from "baileys";
import { checkPermission } from "../middleware/checkPermission.js";
import {
  checkGroupRentalStatus,
  createGroupIfNotExists,
} from "../services/groupService.js";
import {
  addUserIfNotExists,
  checkUserPermission,
  createUserGroupIfNotExists,
} from "../services/userService.js";
import {
  findCommandImport,
  verifyPrefix,
} from "../utils/extractDataFromMessage.js";

const buildParams = (overrides = {}) => ({
  webMessage: { pushName: "User" },
  prefix: "/",
  sendWarningReply: vi.fn(),
  sendErrorReply: vi.fn(),
  socket: {},
  remoteJid: "123456@g.us",
  userName: "User",
  groupName: "My Group",
  senderJid: "5511999999999@s.whatsapp.net",
  args: [],
  commandName: "ping",
  isImage: false,
  isVideo: false,
  isSticker: false,
  ...overrides,
});

describe("dynamicCommand", () => {
  let commandHandle;

  beforeEach(() => {
    vi.clearAllMocks();
    commandHandle = vi.fn().mockResolvedValue(undefined);

    findCommandImport.mockResolvedValue({
      type: "member",
      command: { handle: commandHandle },
    });
    verifyPrefix.mockReturnValue(true);
    isJidGroup.mockReturnValue(true);
    checkPermission.mockResolvedValue(true);
    checkGroupRentalStatus.mockResolvedValue(true);
    checkUserPermission.mockResolvedValue(true);
  });

  it("returns early when remoteJid is missing", async () => {
    const params = buildParams({ remoteJid: null });

    await dynamicCommand(params);

    expect(commandHandle).not.toHaveBeenCalled();
    expect(params.sendWarningReply).not.toHaveBeenCalled();
    expect(addUserIfNotExists).not.toHaveBeenCalled();
  });

  it("ignores group messages with invalid prefix without warning", async () => {
    const params = buildParams();
    verifyPrefix.mockReturnValue(false);
    isJidGroup.mockReturnValue(true);

    await dynamicCommand(params);

    expect(commandHandle).not.toHaveBeenCalled();
    expect(params.sendWarningReply).not.toHaveBeenCalled();
    expect(addUserIfNotExists).not.toHaveBeenCalled();
  });

  it("warns when prefix is valid but command is missing in private chat", async () => {
    const params = buildParams({ remoteJid: "551100000000@s.whatsapp.net" });
    isJidGroup.mockReturnValue(false);
    verifyPrefix.mockReturnValue(true);
    findCommandImport.mockResolvedValue({ type: "member", command: null });

    await dynamicCommand(params);

    expect(params.sendWarningReply).toHaveBeenCalledWith(
      expect.stringContaining("Comando ou prefixo"),
    );
    expect(commandHandle).not.toHaveBeenCalled();
  });

  it("blocks admin command when permission check fails", async () => {
    const params = buildParams();
    findCommandImport.mockResolvedValue({
      type: "admin",
      command: { handle: commandHandle },
    });
    checkPermission.mockResolvedValue(false);

    await dynamicCommand(params);

    expect(params.sendWarningReply).toHaveBeenCalledWith(
      expect.stringMatching(/permiss/i),
    );
    expect(commandHandle).not.toHaveBeenCalled();
  });

  it("blocks group command when rental is invalid", async () => {
    const params = buildParams();
    checkPermission.mockResolvedValue(false);
    checkGroupRentalStatus.mockResolvedValue(false);

    await dynamicCommand(params);

    expect(params.sendWarningReply).toHaveBeenCalledWith(
      expect.stringMatching(/permiss/i),
    );
    expect(commandHandle).not.toHaveBeenCalled();
  });

  it("blocks private command when user has no permission", async () => {
    const params = buildParams({ remoteJid: "551100000000@s.whatsapp.net" });
    isJidGroup.mockReturnValue(false);
    checkPermission.mockResolvedValue(false);
    checkUserPermission.mockResolvedValue(false);

    await dynamicCommand(params);

    expect(params.sendWarningReply).toHaveBeenCalledWith(
      expect.stringMatching(/permiss/i),
    );
    expect(commandHandle).not.toHaveBeenCalled();
  });

  it("executes command and logs when checks pass", async () => {
    const params = buildParams();

    await dynamicCommand(params);

    expect(commandHandle).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "member",
        commandName: "ping",
      }),
    );
    expect(addUserIfNotExists).toHaveBeenCalledWith(
      "User",
      "5511999999999@s.whatsapp.net",
    );
    expect(createGroupIfNotExists).toHaveBeenCalledWith("my group", "123456");
    expect(createUserGroupIfNotExists).toHaveBeenCalledWith(
      "5511999999999@s.whatsapp.net",
      "123456",
    );
    expect(fileLogger.info).toHaveBeenCalled();
  });

  it("maps InvalidParameterError to warning reply", async () => {
    const params = buildParams();
    commandHandle.mockRejectedValue(new InvalidParameterError("bad"));

    await dynamicCommand(params);

    expect(params.sendWarningReply).toHaveBeenCalledWith(
      expect.stringContaining("Parâmetros inválidos"),
    );
    expect(fileLogger.error).toHaveBeenCalled();
  });

  it("maps DangerError to error reply", async () => {
    const params = buildParams();
    commandHandle.mockRejectedValue(new DangerError("boom"));

    await dynamicCommand(params);

    expect(params.sendErrorReply).toHaveBeenCalledWith(
      expect.stringContaining("boom"),
    );
  });

  it("logs and sends error reply for unknown errors", async () => {
    const params = buildParams();
    commandHandle.mockRejectedValue(new Error("unexpected"));

    await dynamicCommand(params);

    expect(appLogger.error).toHaveBeenCalled();
    expect(params.sendErrorReply).toHaveBeenCalledWith(
      expect.stringContaining("Ocorreu um erro"),
    );
  });
});
