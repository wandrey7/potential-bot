import { isJidGroup } from "baileys";
import { OWNER_NUMBER } from "../config/config.js";
import { fileLogger } from "../config/logs.js";
import { checkPermission } from "../middleware/checkPermission.js";
import {
  checkGroupRentalStatus,
  createGroupIfNotExists,
} from "../services/groupService.js";
import {
  addUserIfNotExists,
  checkUserPermission,
} from "../services/userService.js";
import { DangerError, InvalidParameterError, WarningError } from "./errors.js";
import {
  findCommandImport,
  hasTypeOrCommand,
  verifyPrefix,
} from "./extractDataFromMessage.js";

import { appLogger } from "../config/logs.js";

export const dynamicCommand = async (paramsHandler) => {
  const {
    webMessage,
    prefix,
    sendWarningReply,
    sendErrorReply,
    socket,
    remoteJid,
    userName,
    groupName,
    senderJid,
    args,
    commandName,
    isImage,
    isVideo,
    isSticker,
  } = paramsHandler;

  appLogger.debug("dynamicCommand started for commandName: %o", {
    commandName,
  });
  const { type, command } = await findCommandImport(commandName);
  appLogger.debug("findCommandImport result %o", {
    type: type,
    comando: command?.name,
  });

  if (senderJid) {
    await addUserIfNotExists(userName, senderJid);
  }

  if (remoteJid && groupName) {
    const groupJidToSave = remoteJid.split("@")[0];
    await createGroupIfNotExists(groupName.toLowerCase(), groupJidToSave);
  }

  if (!verifyPrefix(prefix) || !hasTypeOrCommand({ type, command })) {
    return;
  }

  if (type === "admin" || type === "owner") {
    if (!(await checkPermission({ type, ...paramsHandler }))) {
      return sendWarningReply("Você não tem permissão para usar este comando.");
    }
  } else {
    if (!isJidGroup(remoteJid) && !(await checkUserPermission(senderJid))) {
      return sendWarningReply(
        `Você não tem permissão para usar este comando. Compre o acesso ao admin do bot: wa.me/${OWNER_NUMBER}`
      );
    }

    if (isJidGroup(remoteJid)) {
      const groupJidToCheck = remoteJid.split("@")[0];

      const hasValidRental = await checkGroupRentalStatus(groupJidToCheck);

      if (!hasValidRental) {
        return sendWarningReply(
          `Você não tem permissão para usar este comando. Compre o acesso ao admin do bot: wa.me/${OWNER_NUMBER}`
        );
      }
    }
  }

  try {
    await command.handle({ ...paramsHandler, type });

    const mediaType = isImage
      ? "🖼️ Imagem"
      : isVideo
      ? "🎥 Vídeo"
      : isSticker
      ? "🔖 Sticker"
      : "💬 Texto";

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧩  Comando executado: '${commandName}'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📨 Tipo: ${type}
👤 Remetente: ${webMessage?.pushName || "(desconhecido)"} | ${
      senderJid.split("@")[0] || "(desconhecido)"
    }
👥 Grupo: ${groupName ? groupName : "(privado)"}
🔖 Prefixo: ${prefix || "(nenhum)"}
💬 Argumentos: ${args?.length ? args.join(" ") : "(sem argumentos)"}
📸 Tipo de mídia: ${mediaType}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

    fileLogger.info({
      command: {
        name: commandName,
        type,
        prefix: prefix || "(nenhum)",
        args: args?.length ? args.join(" ") : "(sem argumentos)",
        mediaType: mediaType.replace(/[^a-zA-Z\s]/g, "").trim(),
      },
      user: {
        name: webMessage?.pushName || "(desconhecido)",
        id: senderJid.split("@")[0] || "(desconhecido)",
      },
      chat: {
        groupName: groupName ? groupName : "(privado)",
        isGroup: !!groupName,
      },
    });
  } catch (error) {
    fileLogger.error({
      command: commandName,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      user: senderJid,
      group: remoteJid,
      args,
    });

    if (error instanceof InvalidParameterError) {
      return sendWarningReply(`Parâmetros inválidos! ${error.message}`);
    } else if (error instanceof WarningError) {
      return sendWarningReply(error.message);
    } else if (error instanceof DangerError) {
      return sendErrorReply(error.message);
    } else {
      await sendErrorReply(
        `Ocorreu um erro ao executar o comando: ${commandName}! O Desenvolvedor foi notificado.`
      );
    }
  }
};
