import { PREFIX } from "../../config/config.js";
import {
  incrementUserRoulette,
  pointsToUser,
  userRouletteToday,
} from "../../services/userService.js";
import { genAleatoryNumbers } from "../../utils/helpers.js";

export default {
  name: "roleta",
  description:
    "Jogue a roleta russa e teste sua sorte, você pode ganhar de 0 a 100 pontos por dia!",
  commands: ["roleta"],
  usage: `${PREFIX}roleta`,
  handle: async ({
    sendWarningReply,
    sendSucessReply,
    senderJid,
    remoteJid,
    sendErrorReply,
  }) => {
    if (remoteJid.endsWith("@g.us") === false) {
      await sendErrorReply("Este comando só pode ser usado em grupos!");
      return;
    }
    const randomNumber = genAleatoryNumbers(0, 100);
    const groupJid = remoteJid.split("@")[0];
    const userRoulette = await userRouletteToday(senderJid, groupJid);

    if (userRoulette) {
      return await sendWarningReply(
        "você já jogou a roleta russa hoje neste grupo. Tente novamente amanhã!"
      );
    } else {
      await pointsToUser(senderJid, groupJid, randomNumber, true);
      await incrementUserRoulette(senderJid, groupJid);
      await sendSucessReply(
        `Você jogou a roleta russa e ganhou ${randomNumber} pontos!`
      );
    }
  },
};
