import { execFile } from "child_process";
import { PREFIX } from "../../config/config.js";
import { appLogger } from "../../config/logs.js";
import prisma from "../../prisma/client.js";

const TIKTOK_REGEX = /^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)/;
const COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_SIZE_MB = 100;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export default {
  name: "tiktok",
  description: "Download a TikTok video by URL",
  commands: ["tiktok"],
  usage: `${PREFIX}tiktok <url>`,
  handle: async ({
    socket,
    remoteJid,
    senderJid,
    args,
    webMessage,
    sendErrorReply,
    sendWaitReact,
    sendSucessReact,
  }) => {
    try {
      if (!args || args.length === 0) {
        await sendErrorReply(
          `Por favor, forneça uma URL de TikTok.\nUso: ${PREFIX}tiktok <url>`
        );
        return;
      }

      const url = args.join("/").replace(/\s+/g, "").replace(/\/+/g, "/").replace(":/", "://")

      if (!TIKTOK_REGEX.test(url)) {
        await sendErrorReply(
          "URL inválida. Por favor, forneça uma URL válida do TikTok (tiktok.com ou vm.tiktok.com)"
        );
        return;
      }

      // Create user if doesn't exist
      const user = await prisma.user.findUnique({
        where: { senderJid },
      });

      if (user.lastDownload) {
        const timeSinceLastDownload = Date.now() - user.lastDownload.getTime();
        if (timeSinceLastDownload < COOLDOWN_MS) {
          const remainingSeconds = Math.ceil(
            (COOLDOWN_MS - timeSinceLastDownload) / 1000
          );
          await sendErrorReply(
            `Você precisa aguardar ${remainingSeconds} segundos antes de fazer outro download.`
          );
          return;
        }
      }

      await sendWaitReact();

      const metadata = await getVideoMetadata(url);
      if (!metadata) {
        await sendErrorReply(
          "Não foi possível obter informações do vídeo. Verifique se a URL é válida ou se o vídeo não é privado."
        );
        return;
      }

      const filesize = metadata.filesize || 0;
      if (filesize > MAX_SIZE_BYTES) {
        await sendErrorReply(
          `Desculpe, o vídeo é muito grande (${(filesize / 1024 / 1024).toFixed(2)}MB). O limite é ${MAX_SIZE_MB}MB.`
        );
        return;
      }

      const videoBuffer = await downloadVideo(url);
      if (!videoBuffer) {
        await sendErrorReply(
          "Erro ao baixar o vídeo. Tente novamente mais tarde."
        );
        return;
      }

      const caption = `🎵 *TikTok Video*\n📱 *Duração:* ${Math.floor(metadata.duration || 0)}s`;
      await socket.sendMessage(
        remoteJid,
        {
          video: videoBuffer,
          caption,
        },
        { quoted: webMessage }
      );

      await prisma.user.update({
        where: { senderJid },
        data: { lastDownload: new Date() },
      });

      await sendSucessReact();
    } catch (error) {
      appLogger.error("Error in tiktok command %o", {
        error: error.message,
        stack: error.stack,
        senderJid,
        remoteJid,
      });
      await sendErrorReply(
        "Ocorreu um erro ao processar seu pedido. Tente novamente!"
      );
    }
  },
};

/**
 * Query video metadata using yt-dlp --dump-json
 */
async function getVideoMetadata(url) {
  return new Promise((resolve) => {
    const proc = execFile("yt-dlp", ["--dump-json", url], (error, stdout) => {
      if (error) {
        appLogger.error("Metadata query error: %s", error.message);
        resolve(null);
        return;
      }

      try {
        const metadata = JSON.parse(stdout);
        resolve(metadata);
      } catch (parseError) {
        appLogger.error("Failed to parse yt-dlp metadata: %s", parseError.message);
        resolve(null);
      }
    });

    proc.stderr.on("data", (data) => {
      appLogger.warn("yt-dlp stderr: %s", data.toString());
    });
  });
}

/**
 * Download video from URL using yt-dlp
 */
async function downloadVideo(url) {
  return new Promise((resolve) => {
    const chunks = [];

    const proc = execFile(
      "yt-dlp",
      ["-f", "best[filesize<100M]/best", "-o", "-", url],
      { maxBuffer: 200 * 1024 * 1024, encoding: 'buffer' }, // 200MB buffer for large files
      (error) => {
        if (error) {
          appLogger.error("Video download error: %s", error.message);
          resolve(null);
          return;
        }
        resolve(Buffer.concat(chunks));
      }
    );

    // Collect data from stdout
    proc.stdout.on("data", (chunk) => {
      chunks.push(chunk);
    });

    proc.stderr.on("data", (data) => {
      appLogger.warn("yt-dlp stderr: %s", data.toString());
    });
  });
}
