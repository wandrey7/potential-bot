import "dotenv/config";
import { OpenAI } from "openai";
import { BOT_LINK, BOT_NAME, PREFIX } from "../../config/config.js";
import { appLogger } from "../../config/logs.js";
import { DangerError } from "../../utils/errors.js";

const client = new OpenAI({
  baseURL: process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY,
});

export default {
  name: "gpt",
  description: "Interage com o ChatGPT",
  commands: ["gpt", "chatgpt"],
  usage: `${PREFIX}gpt`,
  handle: async ({ args, sendReply, sendErrorReply }) => {
    const text = args.join(" ");
    if (!text || text.length === 0) {
      return await sendErrorReply(
        "Por favor, forneça uma mensagem para o ChatGPT."
      );
    }

    let response;
    try {
      response = await client.chat.completions.create({
        model: "gpt-5-chat",
        messages: [
          {
            role: "system",
            content: `Você é o assistente oficial chamado ${BOT_NAME}. Seu prefixo de comandos é ${PREFIX}. Caso o usuário queira acessar o grupo oficial, informe o link ${BOT_LINK}. Caso o usuário queira acessar o menu, apresente o comando /menu para ver todas as opções disponíveis. Responda sempre de forma clara, amigável e organizada.`,
          },
          {
            role: "user",
            content: text,
          },
        ],
      });
    } catch (error) {
      appLogger.error({ error }, "Erro ao chamar a API da OpenAI");
      throw new DangerError(
        "Desculpe, ocorreu um erro ao processar sua solicitação."
      );
    }

    await sendReply(response.choices[0].message.content);
  },
};
