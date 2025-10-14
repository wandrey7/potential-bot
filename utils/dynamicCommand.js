import { appLogger } from "../config/logs.js";
import { checkPermission } from "../middleware/checkPermission.js";
import { DangerError, InvalidParameterError, WarningError } from "./errors.js";
import {
  findCommandImport,
  hasTypeOrCommand,
  verifyPrefix,
} from "./extractDataFromMessage.js";

export const dynamicCommand = async (paramsHandler) => {
  const { commandName, prefix, sendWarningReply, sendErrorReply } =
    paramsHandler;

  const { type, command } = await findCommandImport(commandName);

  if (!verifyPrefix(prefix) || !hasTypeOrCommand({ type, command })) {
    return;
  }

  // Only check permissions for admin or owner commands
  if (type === "admin" || type === "owner") {
    if (!(await checkPermission({ type, ...paramsHandler }))) {
      return sendWarningReply("Você não tem permissão para usar este comando.");
    }
  }

  try {
    await command.handle({ ...paramsHandler, type });
  } catch (error) {
    if (error instanceof InvalidParameterError) {
      return sendWarningReply(`Parâmetros inválidos! ${error.message}`);
    } else if (error instanceof WarningError) {
      return sendWarningReply(error.message);
    } else if (error instanceof DangerError) {
      return sendErrorReply("Erro ao executar o comando!");
    } else {
      await sendErrorReply(
        `Ocorreu um erro ao executar o comando: ${commandName}! O Desenvolvedor foi notificado.`
      );
      appLogger.error(
        `Erro detalhado ao executar o comando '${commandName}':\n${
          error.stack || error
        }`
      );
    }
  }
};
