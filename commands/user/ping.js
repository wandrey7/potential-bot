import { PREFIX } from "../../config/config.js";

export default {
  name: "ping",
  description: "retorna um emoji de pong",
  commands: ["ping"],
  usage: `${PREFIX}ping`,
  handle: async ({ message, args, sendReact }) => {
    // Comand code
    await sendReact("🏓");
  },
};
