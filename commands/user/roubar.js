import { PREFIX } from "../../config/config.js";
import {
  getUserPoints,
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
    sendErrorReply,
  }) => {
    if (remoteJid.endsWith("@g.us") === false) {
      await sendErrorReply("Este comando só pode ser usado em grupos!");
      return;
    }

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
    const groupJid = remoteJid.split("@")[0];

    const hasStolenToday = await userStoleToday(senderJid, groupJid);

    if (hasStolenToday) {
      return await sendWarningReply(
        "você já roubou pontos hoje neste grupo. Tente novamente amanhã!"
      );
    }

    const amountToSteal = genAleatoryNumbers(0, 100);
    const targetBalance = await getUserPoints(targetUserJid, remoteJid);

    if (targetBalance < amountToSteal) {
      return await sendWarningReply(
        `Esse usuário não tem pontos suficientes para roubar! Ele tem ${targetBalance} pontos e você tentou roubar ${amountToSteal} pontos.`
      );
    }

    Promise.all([
      await pointsToUser(senderJid, groupJid, amountToSteal, true),
      await pointsToUser(targetUserJid, groupJid, amountToSteal, false),
      await incrementUserStoleToday(senderJid, groupJid),
    ]);

    const userDisplayName = await getUserDisplayName(
      targetUserJid,
      webMessage,
      remoteJid
    );

    await sendMessageWithMention(
      `Você roubou com sucesso ${amountToSteal} pontos do usuário ${userDisplayName}!`,
      targetUserJid
    );
  },
};
