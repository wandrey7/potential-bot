import { PREFIX } from "../../config/config.js";

export default {
  name: "menugrupo",
  description: "Mostra o menu de comandos para grupos",
  commands: ["menugrupo"],
  usage: `${PREFIX}menugrupo`,
  handle: async ({ sendTextWithoutEmoji }) => {
    const menuText = `
*╭─< ✨ MENU DE COMANDOS ✨ >─╮*
*│*
*│* 🤖  Aqui estão todos os comandos exclusivos para grupos!
*├─「 👑 ADMINISTRAÇÃO 」──┤*
*│*
*│* 🗣️ */hidetag* _Menciona todos os membros do grupo de forma oculta._
*│*
*├─「 🎲 JOGOS 」──┤*
*│*
*│* 💰 */roubar* _Rouba pontos de outro usuário em um grupo, use com reply na mensagem do alvo ou marcando o usuário._
*│*
*│* 🎰 */roleta* _Jogue a roleta russa e teste sua sorte, você pode ganhar de 0 a 100 pontos por dia!_
*│*
*├─「 👤 USUÁRIO 」──┤*
*|* */perfil* _Envia o perfil do usuário._
*│*
*╰────────────────────────╯*
`;
    await sendTextWithoutEmoji(menuText);
  },
};
