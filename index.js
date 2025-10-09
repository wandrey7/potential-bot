import { appLogger } from "./config/logs.js";
import { loader } from "./loader.js";
import { connect } from "./socket.js";

// Captura erros não tratados
process.on("uncaughtException", (error) => {
  console.error("❌ [ERRO NÃO TRATADO]", error);
  console.error("Stack:", error.stack);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ [PROMISE REJEITADA]", reason);
  console.error("Promise:", promise);
});

async function start() {
  try {
    appLogger.info("🚀 Iniciando bot...");
    await connect(async (socket) => {
      appLogger.info("✅ Socket conectado, registrando listeners...");
      await loader(socket);
      appLogger.info("🚀 Listeners prontos");
    });
  } catch (error) {
    appLogger.error("Erro no start", {
      error: error.message,
      stack: error.stack,
    });
  }
}

start();
