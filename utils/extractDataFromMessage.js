import { downloadContentFromMessage, isJidGroup } from "baileys";
import { Buffer } from "buffer";
import fs from "fs";
import { writeFile } from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import { COMMANDS_DIR, PREFIX, TEMP_DIR } from "../config/config.js";
import { appLogger } from "../config/logs.js";

export const extractDataFromMessage = (webMessage) => {
  const {
    key: { remoteJid, fromMe, id },
    message,
  } = webMessage;

  const textMessage =
    message?.conversation ||
    message?.extendedTextMessage?.text ||
    message?.imageMessage?.caption ||
    message?.videoMessage?.caption;

  if (!textMessage) {
    return {
      remoteJid: null,
      senderJid: null,
      userJid: null,
      prefix: null,
      commandName: null,
      isReply: null,
      replyJid: null,
      args: [],
    };
  }

  const isGroup = isJidGroup(remoteJid);
  const senderJid = isGroup ? webMessage.key.participant : remoteJid;

  const isReply = !!message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const replyJid =
    message?.extendedTextMessage?.contextInfo?.participant || null;

  const [command, ...args] = textMessage.split(" ");
  const prefix = command.charAt(0);
  const commandWithoutPrefix = command.replace(new RegExp(`^[${PREFIX}]`), "");

  return {
    remoteJid,
    senderJid,
    userJid: senderJid, // Mantendo userJid por retrocompatibilidade temporária
    prefix,
    commandName: formatCommand(commandWithoutPrefix),
    isReply,
    replyJid,
    args: splitByCharacters(args.join(" "), ["\\", "|", "/"]),
  };
};

export const splitByCharacters = (str, characters) => {
  characters = characters.map((char) => (char === "\\" ? "\\\\" : char));
  const regex = new RegExp(`[${characters.join("")}]`);

  return str
    .split(regex)
    .map((str) => str.trim())
    .filter(Boolean);
};

export const formatCommand = (text) => {
  return onlyLettersAndNumbers(
    removeAccentsAndSpecialCharacters(text.toLocaleLowerCase().trim())
  );
};

export const onlyNumbers = (text) => {
  text.replace(/[^0-9]/g, "");
};

export const removeAccentsAndSpecialCharacters = (text) => {
  if (!text) return "";

  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export const onlyLettersAndNumbers = (text) => {
  return text.replace(/[^a-zA-Z0-9]/g, "");
};

export const baileysIs = (webMessage, context) => {
  return !!getContent(webMessage, context);
};

export const getContent = (webMessage, context) => {
  return (
    webMessage.message?.[`${context}Message`] ||
    webMessage.message?.extendedTextMessage?.contextInfo?.quotedMessage?.[
      `${context}Message`
    ]
  );
};

export const downloadBuffer = async (webMessage, context) => {
  const content = getContent(webMessage, context);

  if (!content) return null;

  const stream = await downloadContentFromMessage(content, context);

  let buffer = Buffer.from([]);

  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }

  return buffer;
};

export const download = async (webMessage, fileName, context, extension) => {
  const buffer = await downloadBuffer(webMessage, context);
  if (!buffer) return null;

  const filePath = path.resolve(TEMP_DIR, `${fileName}.${extension}`);
  await writeFile(filePath, buffer);

  return filePath;
};

export const findCommandImport = async (commandName) => {
  const command = await readCommandImports();
  let typeReturn = "";
  let targetCommandReturn = null;

  appLogger.debug("Finding command import for command: %s", commandName);

  for (const [type, commands] of Object.entries(command)) {
    if (!commands.length) continue;

    const targetCommand = commands.find((cmd) =>
      cmd.commands.some((name) => formatCommand(name).includes(commandName))
    );

    if (targetCommand) {
      typeReturn = type;
      targetCommandReturn = targetCommand;
      break;
    }
  }

  return {
    type: typeReturn,
    command: targetCommandReturn,
  };
};

export const readCommandImports = async () => {
  const subDirectories = fs
    .readdirSync(COMMANDS_DIR, { withFileTypes: true })
    .filter((directory) => directory.isDirectory())
    .map((directory) => directory.name);

  const commandImports = {};

  for (const subdir of subDirectories) {
    const subDirectoryPath = path.resolve(COMMANDS_DIR, subdir);

    const files = await Promise.all(
      fs
        .readdirSync(subDirectoryPath)
        .filter((file) => {
          const isValidFile =
            (!file.startsWith("_") && file.endsWith(".js")) ||
            file.endsWith(".ts");
          return isValidFile;
        })
        .map(async (file) => {
          const filePath = path.join(subDirectoryPath, file);
          const moduleURL = pathToFileURL(filePath).href;
          const module = await import(moduleURL);
          return module.default || module;
        })
    );

    commandImports[subdir] = files;
  }
  return commandImports;
};

export const verifyPrefix = (prefix) => PREFIX === prefix;
export const hasTypeOrCommand = ({ type, command }) => type && command;
