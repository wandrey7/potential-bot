import { appLogger } from "./config/logs.js";
import { loader } from "./loader.js";
import { connect } from "./socket.js";

// Captura erros não tratados
process.on("uncaughtException", (error) => {
  console.error("❌ [ERRO NÃO TRATADO]", error);
  console.error("Stack:", error.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ [PROMISE REJEITADA]", reason);
  console.error("Promise:", promise);
  process.exit(1);
});

async function start() {
  try {
    appLogger.info("🚀 Iniciando bot...");
    const socket = await connect();

    appLogger.info("✅ Socket conectado com sucesso");
    await loader(socket);
    appLogger.info("🚀 Bot iniciado com sucesso");
  } catch (error) {
    appLogger.error("Erro no start", {
      error: error.message,
      stack: error.stack,
    });
  }
}

start();
