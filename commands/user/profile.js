import { PREFIX } from "../../config/config.js";
import { appLogger } from "../../config/logs.js";
import {
  getUserPoints,
  userRouletteToday,
  userStoleToday,
} from "../../services/userService.js";

export default {
  name: "perfil",
  description: "Envia o perfil do usuário",
  commands: ["perfil", "profile"],
  usage: `${PREFIX}perfil`,
  handle: async ({
    socket,
    remoteJid,
    senderJid,
    userName,
    webMessage,
    sendReply,
    sendWaitReact,
    sendSucessReact,
    sendErrorReply,
    getUserProfilePicUrl,
  }) => {
    try {
      await sendWaitReact();

      if (remoteJid.endsWith("@g.us") === false) {
        await sendErrorReply("Este comando só pode ser usado em grupos!");
        return;
      }

      const userPoints = await getUserPoints(senderJid, remoteJid);
      const profilePicUrl = await getUserProfilePicUrl(senderJid);
      const stoleToday = await userStoleToday(senderJid, remoteJid);
      const userRoulette = await userRouletteToday(senderJid, remoteJid);

      const menuText = `*╭─< ✨ PERFIL DO USUÁRIO ✨
*│*
*│* 🤖 Olá, *${userName}*!
*│* Aqui estão as suas informações:
*│*
*├─「 👤 DADOS 」──┤*
*│*
*│* 📛 *Nome:* ${userName}
*│* 💰 *Pontos:* ${userPoints}
*|* 👤💰 *Roubou Hoje: ${stoleToday ? "✅" : "❌"}
*|* 🎰 *Roletou Hoje: ${userRoulette ? userRoulette + " vezes" : "❌"}* 
*│*
*╰────────────────────────╯*`;

      if (profilePicUrl) {
        await socket.sendMessage(
          remoteJid,
          {
            image: { url: profilePicUrl },
            caption: menuText,
            mentions: [senderJid],
          },
          { quoted: webMessage }
        );
      } else {
        await sendReply(menuText);
      }

      await sendSucessReact();
    } catch (error) {
      appLogger.error("Error in profile command %o", {
        error: error.message,
        stack: error.stack,
        senderJid,
        remoteJid,
      });
      await sendErrorReply(
        "Ocorreu um erro ao buscar o seu perfil. Tente novamente!"
      );
    }
  },
};
