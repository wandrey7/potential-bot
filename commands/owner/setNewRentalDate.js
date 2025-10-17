import { PREFIX } from "../../config/config.js";
import { appLogger } from "../../config/logs.js";
import {
  getGroupJidByName,
  setNewRentalDate,
} from "../../services/groupService.js";

export default {
  name: "Set New RentalDate",
  description:
    "Aplica uma nova data de aluguel para o grupo. Argumentos: data no formato AAAA-MM-DD e nome do grupo entre aspas.",
  commands: ["setrentaldate", "srd"],
  usage: `${PREFIX}setrentaldate`,
  handle: async ({ socket, args, sendSucessReply, sendErrorReply }) => {
    if (args.length < 1) {
      return await sendErrorReply(
        "Argumentos insuficientes. Forneça a data (AAAA-MM-DD) e o nome do grupo entre aspas."
      );
    }

    const fullArgs = args.join(" ");
    const match = fullArgs.match(/^(\S+)\s+"([^"]+)"$/);

    let newDateInput, groupName;
    if (match) {
      newDateInput = match[1];
      groupName = match[2];
    } else {
      return await sendErrorReply(
        'Formato inválido. Use: data "nome do grupo" (com aspas no nome).'
      );
    }

    const remoteJid = await getGroupJidByName(socket, groupName);

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
      return await sendErrorReply(
        "Data inválida. Por favor, forneça a data no formato AAAA-MM-DD."
      );
    }

    try {
      await setNewRentalDate(remoteJid.split("@")[0], newDate);
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
