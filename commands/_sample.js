import { PREFIX } from "../config/config.js";

export default {
  name: "comando",
  description: "Descricao do comando",
  commands: [command1, command2],
  usage: `${PREFIX}comand`,
  handle: async ({ message, args }) => {
    // Comand code
  },
};
