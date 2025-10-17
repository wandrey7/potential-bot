import { PREFIX } from "../../config/config.js";
import { appLogger } from "../../config/logs.js";
import {
  getGroupJidByName,
  setNewRentalDate,
} from "../../services/groupService.js";

export default {
  name: "Set New RentalDate",
  description:
    "Aplica uma nova data de aluguel para o grupo. Argumentos: data no formato AAAA-MM-DD e nome do grupo.",
  commands: ["setrentaldate", "srd"],
  usage: `${PREFIX}setrentaldate`,
  handle: async ({ socket, args, sendSucessReply, sendErrorReply }) => {
    appLogger.info("Executing setNewRentalDate command with args: %o", args);
    appLogger.debug("Args details: %o", {
      argsLength: args.length,
      argsRaw: args,
      argsJoined: args.join(" "),
    });

    if (args.length < 2) {
      appLogger.warn("Insufficient arguments: %o", {
        argsLength: args.length,
        expected: "at least 2",
        received: args,
      });
      return await sendErrorReply(
        "Argumentos insuficientes. Forneça a data (AAAA-MM-DD) e o nome do grupo."
      );
    }

    const newDateInput = args[0];
    const groupName = args.slice(1).join(" ");
    appLogger.debug("Parsed arguments: %o", {
      newDateInput,
      groupName,
      argsSlice: args.slice(1),
    });

    const remoteJid = await getGroupJidByName(socket, groupName);
    appLogger.debug(
      "Group JID found: %s for group name: %s",
      remoteJid,
      groupName
    );

    if (!remoteJid) {
      return await sendErrorReply(`Grupo '${groupName}' não encontrado.`);
    }

    const newDate = new Date(newDateInput);

    appLogger.debug("Date parsing: %o", {
      newDateInput,
      newDate,
      isValid: !isNaN(newDate.getTime()),
      timestamp: newDate.getTime(),
      isoString: newDate.toISOString(),
    });

    if (isNaN(newDate.getTime())) {
      appLogger.warn("Invalid date provided: %s", newDateInput);
      return await sendErrorReply(
        "Data inválida. Por favor, forneça a data no formato AAAA-MM-DD."
      );
    }

    try {
      await setNewRentalDate(remoteJid.split("@")[0], newDate);
      appLogger.info(
        "Successfully set new rental date for group %s to %s",
        remoteJid,
        newDate.toISOString()
      );
      return await sendSucessReply(
        `A nova data de aluguel para o grupo '${groupName}' foi definida para ${
          newDate.toISOString().split("T")[0]
        }.`
      );
    } catch (error) {
      appLogger.error("Error setting new rental date: %o", {
        error: error.message,
        stack: error.stack,
        remoteJid,
        newDate,
      });
      return await sendErrorReply(
        "Ocorreu um erro ao atualizar a data de aluguel. Tente novamente mais tarde."
      );
    }
  },
};
