// Faz uma cópia do banco de dados com timestamp em backend/backups/.
// Uso: npm run backup
//
// Para automatizar (rodar todo dia sozinho), agende esse comando com:
// - Linux/Mac: cron (`crontab -e`, ex: `0 3 * * * cd /caminho/backend && npm run backup`)
// - Windows: Agendador de Tarefas do Windows, apontando para `npm run backup`

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "farmacia.db");
const BACKUP_DIR = path.join(__dirname, "..", "backups");
const MANTER_ULTIMOS = 14; // mantém os 14 backups mais recentes, apaga o resto

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(
      "❌ Banco de dados não encontrado em",
      DB_PATH,
      "— nada para copiar ainda.",
    );
    process.exit(1);
  }

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const destino = path.join(BACKUP_DIR, `farmacia-${timestamp()}.db`);
  fs.copyFileSync(DB_PATH, destino);
  console.log("✅ Backup criado em", destino);

  // Remove backups antigos além do limite configurado
  const arquivos = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".db"))
    .map((f) => ({
      nome: f,
      caminho: path.join(BACKUP_DIR, f),
      mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  const antigos = arquivos.slice(MANTER_ULTIMOS);
  for (const a of antigos) {
    fs.unlinkSync(a.caminho);
    console.log("🗑️  Backup antigo removido:", a.nome);
  }
}

main();
