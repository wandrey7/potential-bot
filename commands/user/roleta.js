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
  }) => {
    const randomNumber = genAleatoryNumbers(0, 100);
    const userRoulette = await userRouletteToday(senderJid, remoteJid);

    if (userRoulette) {
      return await sendWarningReply(
        "você já jogou a roleta russa hoje neste grupo. Tente novamente amanhã!"
      );
    } else {
      await pointsToUser(senderJid, remoteJid, randomNumber, true);
      await incrementUserRoulette(senderJid, remoteJid);
      await sendSucessReply(
        `Você jogou a roleta russa e ganhou ${randomNumber} pontos!`
      );
    }
  },
};
