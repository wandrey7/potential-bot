import { PREFIX } from "../../config/config.js";
import {
  incrementUserStoleToday,
  pointsToUser,
  userStoleToday,
} from "../../services/userService.js";
import { getUserDisplayName } from "../../utils/baileysHelpers.js";
import { genAleatoryNumbers } from "../../utils/helpers.js";

export default {
  name: "roubar",
  description:
    "Rouba pontos de outro usuário em um grupo, use com reply na mensagem do alvo ou marcando o usuário.",
  commands: ["roubar"],
  usage: `${PREFIX}roubar`,
  handle: async ({
    sendWarningReply,
    sendMessageWithMention,
    replyJid,
    senderJid,
    remoteJid,
    webMessage,
  }) => {
    const randomNumber = genAleatoryNumbers(0, 100);
    const groupJid = remoteJid.split("@")[0];
    const userStoleTd = await userStoleToday(senderJid, groupJid);

    let targetUserJid = replyJid;

    if (!targetUserJid) {
      const mentions =
        webMessage?.message?.extendedTextMessage?.contextInfo?.mentionedJid;
      if (mentions && mentions.length > 0) {
        targetUserJid = mentions[0];
      }
    }

    if (!targetUserJid) {
      return await sendWarningReply(
        "Você precisa responder a uma mensagem ou marcar (@) o usuário para roubar!"
      );
    }

    if (userStoleTd) {
      return await sendWarningReply(
        "você já roubou pontos hoje neste grupo. Tente novamente amanhã!"
      );
    } else {
      await pointsToUser(senderJid, groupJid, randomNumber, true);
      await pointsToUser(targetUserJid, groupJid, randomNumber, false);
      await incrementUserStoleToday(senderJid, groupJid);

      const userDisplayName = await getUserDisplayName(
        targetUserJid,
        webMessage,
        remoteJid
      );

      await sendMessageWithMention(
        `Você roubou com sucesso ${randomNumber} pontos do usuário ${userDisplayName}!`,
        targetUserJid
      );
    }
  },
};
