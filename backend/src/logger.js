// Logger simples e estruturado. Sem dependências externas: escreve em JSON de
// uma linha por evento (fácil de filtrar/agregar depois, ex: com um serviço
// de logs). Em desenvolvimento também imprime uma versão legível no console.

const NIVEL_COR = { info: "\x1b[36m", warn: "\x1b[33m", error: "\x1b[31m" };
const RESET = "\x1b[0m";

function registrar(nivel, mensagem, contexto = {}) {
  const linha = {
    timestamp: new Date().toISOString(),
    nivel,
    mensagem,
    ...contexto,
  };

  // JSON estruturado (útil se algum dia isso for redirecionado para um arquivo
  // ou serviço de agregação de logs, ex: `node src/server.js >> app.log`)
  const saida = JSON.stringify(linha);

  if (nivel === "error") console.error(saida);
  else console.log(saida);

  // Versão legível para acompanhar no terminal durante o desenvolvimento
  if (process.env.NODE_ENV !== "production") {
    const cor = NIVEL_COR[nivel] || "";
    console.log(
      `${cor}[${nivel.toUpperCase()}]${RESET} ${mensagem}`,
      Object.keys(contexto).length ? contexto : "",
    );
  }
}

export const logger = {
  info: (msg, ctx) => registrar("info", msg, ctx),
  warn: (msg, ctx) => registrar("warn", msg, ctx),
  error: (msg, ctx) => registrar("error", msg, ctx),
};
