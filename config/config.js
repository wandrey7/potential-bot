import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  TIMEOUT_IN_MILI_BY_EVENT: 700,
};

export const PREFIX = "/";
export const BOT_EMOJI = "🤖";
export const BOT_NAME = "Wanbit";
export const BOT_LINK = "https://linktr.ee/wanbit";
export const COMMANDS_DIR = path.resolve(__dirname, "..", "commands");
export const TEMP_DIR = path.resolve(__dirname, "..", "assets", "temp");
