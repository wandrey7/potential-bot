import { PREFIX } from "../../config/config.js";

export default {
  name: "menu",
  description: "Mostra o menu de comandos",
  commands: ["menu", "ajuda"],
  usage: `${PREFIX}menu`,
  handle: async ({ sendTextWithoutEmoji }) => {
    const menuText = `
*╭─< ✨ MENU DE COMANDOS ✨ >─╮*
*│*
*│* 🤖  Aqui estão todos os comandos!
*│*
*├─「 ⚙️ UTILIDADES 」──┤*
*│*
*│* 💥 *Ping*
*│* _Verifica a velocidade de resposta._
*│* Uso: \`\`\`${PREFIX}ping\`\`\`
*│*
*├─「 🎨 FIGURINHAS 」──┤*
*│*
*│* 🖼️ *Sticker*
*│* _Converte imagem, vídeo ou gif._
*│* Uso: Marque uma mídia e digite
*│* \`\`\`${PREFIX}sticker\`\`\`
*│*
*│* 📝 *Attp*
*│* _Cria uma figurinha de texto animado._
*│* Uso: \`\`\`${PREFIX}attp seu texto aqui\`\`\`
*│*
*╰────────────────────────╯*
`;
    await sendTextWithoutEmoji(menuText);
  },
};
