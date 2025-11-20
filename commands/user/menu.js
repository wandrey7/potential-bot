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
*│* 💡 *Sugestão*
*│* _Envia uma sugestão para o desenvolvedor._
*│* Uso: \`\`\`${PREFIX}sugestao sua sugestão\`\`\`
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
*├─「 👑 ADMINISTRAÇÃO 」──┤*
*│*
*│* 🗣️ *Hidetag*
*│* _Menciona todos os membros do grupo de forma oculta._
*│* Uso: \`\`\`${PREFIX}hidetag\`\`\`
*│*
*├─「 🎲 JOGOS 」──┤*
*│*
*│* 💰 *Roubar*
*│* _Rouba pontos de outro usuário em um grupo, use com reply na mensagem do alvo ou marcando o usuário._
*│* Uso: \`\`\`${PREFIX}roubar\`\`\`
*│*
*│* 🎰 *Roleta*
*│* _Jogue a roleta russa e teste sua sorte, você pode ganhar de 0 a 100 pontos por dia!_
*│* Uso: \`\`\`${PREFIX}roleta\`\`\`
*│*
*╰────────────────────────╯*
`;
    await sendTextWithoutEmoji(menuText);
  },
};
