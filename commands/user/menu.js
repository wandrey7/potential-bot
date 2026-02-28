import { PREFIX } from "../../config/config.js";

export default {
  name: "menu",
  description: "Mostra o menu de comandos geral",
  commands: ["menu"],
  usage: `${PREFIX}menu`,
  handle: async ({ sendTextWithoutEmoji }) => {
    const menuText = `
*╭─< ✨ MENU DE COMANDOS ✨ >─╮*
*│*
*│* 🤖  Aqui estão todos os comandos!
*│* Para comandos exclusivos para grupos, use \`\`\`${PREFIX}menugrupo\`\`\`
*│*
*├─「 ⚙️ UTILIDADES 」──┤*
*│*
*│* 💥 */ping* _Verifica a velocidade de resposta._
*│*
*│* 💡 */sugestão <sua sugestão>* _Envia uma sugestão para o desenvolvedor._
*│*
*├─「 🎨 FIGURINHAS 」──┤*
*│*
*│* 🖼️ */sticker* _Converte imagem, vídeo ou gif para sticker._ Uso: Marque uma mídia
*│*
*│* ✂️ */semfundo* _Remove o fundo de uma imagem e cria um sticker com transparência._ Uso: Marque uma imagem
*│*
*│* 📝 */attp <seu texto aqui>* _Cria uma figurinha de texto animado._
*│*
*├─「 👑 ADMINISTRAÇÃO 」──┤*
*│*
*│* 🗣️ */hidetag* _Menciona todos os membros do grupo de forma oculta._
*│*
*╰────────────────────────╯*
`;
    await sendTextWithoutEmoji(menuText);
  },
};
