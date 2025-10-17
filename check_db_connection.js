import dotenv from "dotenv";
import { PrismaClient } from "./prisma/client/index.js";

dotenv.config();

console.log("Tentando conectar ao banco de dados...");
console.log(
  `Usando DATABASE_URL: ${
    process.env.DATABASE_URL ? "encontrada" : "NÃO ENCONTRADA!"
  }`
);

const connectionUrl = process.env.DATABASE_URL;
if (!connectionUrl) {
  console.error(
    "ERRO: A variável de ambiente DATABASE_URL não foi encontrada no seu arquivo .env."
  );
  process.exit(1);
}

if (!connectionUrl.includes("?pgbouncer=true")) {
  console.error(
    'ERRO: A DATABASE_URL no seu .env precisa terminar com "?pgbouncer=true" para este teste.'
  );
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionUrl,
    },
  },
});

async function main() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log(
      "\nSUCESSO: A conexão com o banco de dados foi estabelecida corretamente!"
    );
  } catch (e) {
    console.error("\nFALHA: Não foi possível conectar ao banco de dados.");
    console.error("--- Detalhes do Erro ---");
    console.error(e);
    console.error("------------------------");
    console.log("\nPossíveis causas:");
    console.log("1. A senha na DATABASE_URL está incorreta.");
    console.log(
      "2. A senha contém caracteres especiais que precisam ser codificados (ex: @, #, $)."
    );
    console.log("3. O hostname do Supabase está digitado incorretamente.");
  } finally {
    await prisma.$disconnect();
  }
}

main();
