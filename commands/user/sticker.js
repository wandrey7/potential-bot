import { PREFIX } from "../../config/config.js";
import { appLogger } from "../../config/logs.js";
import {
  convertVideoToWebp,
  ensureStickerSize,
  buildStickerWithExif,
  processImageToSticker,
} from "../../utils/stickerHelpers.js";

export default {
  name: "sticker",
  description: "Cria um sticker a partir de uma imagem ou vídeo.",
  commands: ["sticker", "s"],
  usage: `${PREFIX}sticker`,
  handle: async ({
    webMessage,
    downloadImageBuffer,
    downloadVideoBuffer,
    sendErrorReply,
    sendStickerFromBuffer,
    sendWaitReact,
    sendSucessReact,
  }) => {
    try {
      await sendWaitReact();

      const imageBuffer = await downloadImageBuffer(webMessage);
      const videoBuffer = !imageBuffer
        ? await downloadVideoBuffer(webMessage)
        : null;

      if (!imageBuffer && !videoBuffer) {
        await sendErrorReply(
          "Por favor, envie uma imagem ou vídeo para criar um sticker."
        );
        return;
      }

      let stickerWebpBuffer;

      if (imageBuffer) {
        stickerWebpBuffer = await processImageToSticker(imageBuffer);
        stickerWebpBuffer = await ensureStickerSize(stickerWebpBuffer, false);
      } else if (videoBuffer) {
        try {
          stickerWebpBuffer = await convertVideoToWebp(videoBuffer);
          stickerWebpBuffer = await ensureStickerSize(stickerWebpBuffer, true);
        } catch (error) {
          await sendErrorReply(
            "Houve um erro ao converter o vídeo para sticker."
          );
          return;
        }
      }

      const finalStickerBuffer = await buildStickerWithExif(
        stickerWebpBuffer,
        webMessage.pushName
      );

      await sendStickerFromBuffer(finalStickerBuffer);
      await sendSucessReact();
    } catch (error) {
      appLogger.error("Error creating sticker: %o", {
        error: error.message,
        stack: error.stack,
      });
      await sendErrorReply("Tente novamente.");
    }
  },
};
