import { removeBackground } from "@imgly/background-removal-node";
import { PREFIX } from "../../config/config.js";
import { appLogger } from "../../config/logs.js";
import {
  ensureStickerSize,
  buildStickerWithExif,
  processImageToSticker,
} from "../../utils/stickerHelpers.js";

export default {
  name: "Sem Fundo",
  description: "Remove o fundo de uma imagem e cria um sticker com transparência.",
  commands: ["semfundo", "sf", "removebg"],
  usage: `${PREFIX}semfundo`,
  handle: async ({
    webMessage,
    isImage,
    downloadImageBuffer,
    sendErrorReply,
    sendStickerFromBuffer,
    sendWaitReact,
    sendSucessReact,
  }) => {
    try {
      // Validar que é uma imagem
      if (!isImage) {
        await sendErrorReply(
          "Envie ou responda uma imagem para remover o fundo. Este comando não funciona com vídeos ou outros tipos de arquivo."
        );
        return;
      }

      await sendWaitReact();

      // Baixar buffer da imagem
      const imageBuffer = await downloadImageBuffer(webMessage);

      if (!imageBuffer) {
        await sendErrorReply(
          "Não foi possível baixar a imagem. Tente novamente."
        );
        return;
      }

      appLogger.info("Starting background removal...");

      // Converter Buffer para Blob (a biblioteca precisa de um Blob com MIME type)
      const imageBlob = new Blob([imageBuffer], { type: "image/png" });

      // Remover fundo usando IA
      const resultBlob = await removeBackground(imageBlob, {
        model: "medium", // "small" (~40MB) or "medium" (~80MB)
        output: {
          format: "image/png", // PNG com transparência
          type: "foreground", // Retorna apenas a figura sem o fundo
          quality: 0.8,
        },
      });

      appLogger.info("Background removed successfully");

      // Converter Blob para Buffer
      const arrayBuffer = await resultBlob.arrayBuffer();
      const pngBuffer = Buffer.from(arrayBuffer);

      // Converter para WebP sticker 512x512
      let webpBuffer = await processImageToSticker(pngBuffer);

      // Garantir que o sticker fica abaixo de 1MB
      webpBuffer = await ensureStickerSize(webpBuffer, false);

      // Adicionar EXIF metadata (pack name, author)
      const finalBuffer = await buildStickerWithExif(
        webpBuffer,
        webMessage.pushName
      );

      // Enviar sticker
      await sendStickerFromBuffer(finalBuffer);
      await sendSucessReact();

      appLogger.info("Sticker with removed background sent successfully");
    } catch (error) {
      appLogger.error("Error removing background: %o", {
        error: error.message,
        stack: error.stack,
      });

      // Mensagem de erro detalhada
      if (error.message.includes("model")) {
        await sendErrorReply(
          "Erro ao carregar o modelo de IA. Por favor, tente novamente em alguns instantes."
        );
      } else if (error.message.includes("format")) {
        await sendErrorReply(
          "Formato de imagem não suportado. Tente com uma imagem JPG ou PNG."
        );
      } else {
        await sendErrorReply(
          "Não foi possível remover o fundo desta imagem. Tente com outra imagem."
        );
      }
    }
  },
};
