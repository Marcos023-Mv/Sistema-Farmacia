import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sqlite3 from "sqlite3";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { promisify } from "util";
import os from "os";
import { MANIPULADOS_SEED } from "./seedManipulados.js";
import { INDUSTRIALIZADOS_SEED } from "./seedIndustrializados.js";
import { logger } from "./logger.js";
import { CARGOS, cargoPodeAcessar, ehAdministrador } from "./roles.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// JWT_SECRET é obrigatório: sem ele, qualquer token seria assinado com uma
// chave previsível e conhecida publicamente (já que estaria no código-fonte).
// Preferimos parar o servidor a rodar de forma insegura por engano.
const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.trim().length < 16) {
  logger.error(
    "JWT_SECRET ausente ou muito curto. Defina uma chave forte no arquivo .env (mínimo 16 caracteres).",
  );
  process.exit(1);
}

// Chave gratuita de https://medicamentos.api.br/api (ANVISA + CMED). Sem ela,
// a busca de medicamentos industrializados usa apenas o cache local.
const MEDICAMENTOS_API_KEY =
  process.env.MEDICAMENTOS_API_KEY || "af33cde3c68effc9d13f883a2d032821";
const MEDICAMENTOS_API_BASE = "https://medicamentos.api.br";

// Origem(ns) permitida(s) para o frontend. Aceita uma lista separada por
// vírgula — assim dá pra liberar ao mesmo tempo o localhost (uso no próprio
// computador) e o IP da rede local (uso pelo celular/tablet), ex:
// FRONTEND_URL=http://localhost:5500,http://192.168.0.10:5500
// Em produção, defina o domínio real (ex: https://app.suafarmacia.com.br).
const FRONTEND_URLS = (process.env.FRONTEND_URL || "http://localhost:5500")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const db = new sqlite3.Database("./farmacia.db");
// WAL (Write-Ahead Logging): permite leituras e escritas simultâneas no
// SQLite sem travar o banco inteiro a cada consulta — melhora bastante a
// performance quando há vários usuários usando o sistema ao mesmo tempo.
db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA foreign_keys = ON");

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
const get = promisify(db.get.bind(db));
const all = promisify(db.all.bind(db));

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Requisições sem cabeçalho Origin (apps nativos, curl, health check)
      // são liberadas; as demais precisam bater com uma das origens da lista.
      if (!origin || FRONTEND_URLS.includes(origin))
        return callback(null, true);
      callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Rate limiting no login/cadastro: evita força bruta de senha e abuso do
// endpoint de registro. 20 tentativas a cada 15 minutos por IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    erro: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
  },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

const resources = [
  "clientes",
  "pedidos",
  "prescritores",
  "producoes",
  "lancamentos",
  "orcamentos",
  "compromissos",
  "relatorios",
  "formulas",
  "biblioteca",
  "produtos-prontos",
  "compras",
  "fornecedores",
  "notificacoes",
  "produtos-industrializados",
  "vendas",
  "promocoes",
];

async function init() {
  await run(
    `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT,nome TEXT NOT NULL,sobrenome TEXT,cpf TEXT UNIQUE,telefone TEXT,cargo TEXT,ativo INTEGER NOT NULL DEFAULT 1,email TEXT UNIQUE NOT NULL,senha TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  );
  // Migração segura para bancos criados antes da coluna "ativo" existir.
  const colunas = await all(`PRAGMA table_info(users)`);
  if (!colunas.some((c) => c.name === "ativo")) {
    await run(`ALTER TABLE users ADD COLUMN ativo INTEGER NOT NULL DEFAULT 1`);
  }
  // Registro profissional (ex: CRF pra farmacêuticos) — cada funcionário
  // preenche o seu próprio, em Configurações. Fica em branco pra quem não
  // precisa (só faz sentido pra cargos com conselho profissional).
  if (!colunas.some((c) => c.name === "registro_profissional")) {
    await run(`ALTER TABLE users ADD COLUMN registro_profissional TEXT`);
  }
  for (const r of resources)
    await run(
      `CREATE TABLE IF NOT EXISTS "${r}" (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,dados TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
    );
  // Configurações globais do sistema (só uma linha, id fixo = 1) — hoje só
  // guarda o tema visual escolhido pelo administrador, mas serve como lugar
  // pra outras preferências do sistema todo no futuro.
  await run(
    `CREATE TABLE IF NOT EXISTS configuracoes_sistema (id INTEGER PRIMARY KEY CHECK (id = 1), tema TEXT NOT NULL DEFAULT 'coral')`,
  );
  // Migração segura pra bancos criados antes da cor personalizada existir.
  const colunasConfig = await all(`PRAGMA table_info(configuracoes_sistema)`);
  if (!colunasConfig.some((c) => c.name === "cor_personalizada")) {
    await run(
      `ALTER TABLE configuracoes_sistema ADD COLUMN cor_personalizada TEXT`,
    );
  }
  await run(
    `INSERT OR IGNORE INTO configuracoes_sistema(id, tema) VALUES(1, 'coral')`,
  );

  // Cadastro da empresa (só uma linha, id fixo = 1) — dados que identificam
  // a farmácia dentro do próprio sistema (nome, CNPJ, endereço, responsável
  // técnico, logo). Não substitui o cadastro oficial na Junta Comercial nem
  // na ANVISA — é só o que o sistema usa pra se identificar em telas,
  // recibos e no cabeçalho, então todos os campos são opcionais.
  await run(`CREATE TABLE IF NOT EXISTS empresa (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    razao_social TEXT,
    nome_fantasia TEXT,
    cnpj TEXT,
    inscricao_estadual TEXT,
    telefone TEXT,
    email TEXT,
    cep TEXT,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    uf TEXT,
    responsavel_tecnico TEXT,
    responsavel_registro TEXT,
    logo TEXT,
    atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`INSERT OR IGNORE INTO empresa(id) VALUES(1)`);
  // Catálogo público de medicamentos (compartilhado entre todos os usuários),
  // dividido em 'manipulado' (insumos de manipulação) e 'industrializado'
  // (medicamentos registrados na ANVISA, cache da medicamentos.api.br).
  await run(`CREATE TABLE IF NOT EXISTS medicamentos_catalogo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    nome TEXT NOT NULL,
    principio_ativo TEXT,
    categoria TEXT,
    fabricante TEXT,
    registro_anvisa TEXT,
    forma_farmaceutica TEXT,
    fonte TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tipo, nome, registro_anvisa)
  )`);
  const jaTemSeed = await get(
    `SELECT id FROM medicamentos_catalogo WHERE tipo='manipulado' LIMIT 1`,
  );
  if (!jaTemSeed) {
    for (const m of MANIPULADOS_SEED) {
      await run(
        `INSERT OR IGNORE INTO medicamentos_catalogo(tipo,nome,principio_ativo,categoria,forma_farmaceutica,fonte) VALUES(?,?,?,?,?,?)`,
        [
          "manipulado",
          m.nome,
          m.principio_ativo,
          m.categoria,
          m.forma_farmaceutica,
          "Catálogo de referência Sistema de Farmácia",
        ],
      );
    }
  }
  // Catálogo local de industrializados comuns — fica disponível de cara,
  // mesmo sem configurar a chave da API de medicamentos (ANVISA/CMED). Ao
  // configurar a chave, as buscas online vão complementando esse catálogo
  // com dados oficiais, sem apagar o que já está aqui.
  const jaTemSeedIndustrializado = await get(
    `SELECT id FROM medicamentos_catalogo WHERE tipo='industrializado' LIMIT 1`,
  );
  if (!jaTemSeedIndustrializado) {
    for (const m of INDUSTRIALIZADOS_SEED) {
      await run(
        `INSERT OR IGNORE INTO medicamentos_catalogo(tipo,nome,principio_ativo,categoria,fabricante,forma_farmaceutica,fonte) VALUES(?,?,?,?,?,?,?)`,
        [
          "industrializado",
          m.nome,
          m.principio_ativo,
          m.categoria,
          m.fabricante,
          m.forma_farmaceutica,
          "Catálogo de referência Sistema de Farmácia",
        ],
      );
    }
  }
}
function token(user) {
  return jwt.sign({ id: user.id, email: user.email, nome: user.nome }, SECRET, {
    expiresIn: "8h",
  });
}

// Verifica o token, e então busca cargo/status ATUALIZADOS no banco a cada
// requisição — assim, se um Administrador mudar o cargo de alguém ou
// desativar a conta, o efeito é imediato, sem esperar o token expirar.
async function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!t) return res.status(401).json({ erro: "Token não informado" });
  let payload;
  try {
    payload = jwt.verify(t, SECRET);
  } catch {
    return res.status(401).json({ erro: "Token inválido ou expirado" });
  }

  const perfil = await get(
    "SELECT id,nome,sobrenome,cargo,ativo,email FROM users WHERE id=?",
    [payload.id],
  );
  if (!perfil) return res.status(401).json({ erro: "Usuário não encontrado" });
  if (!perfil.ativo)
    return res
      .status(403)
      .json({
        erro: "Sua conta foi desativada. Fale com o administrador do sistema.",
      });

  req.user = perfil;
  next();
}

// Middleware de permissão por cargo (RBAC): bloqueia o acesso a um recurso
// se o cargo do usuário logado não estiver liberado para ele (ver roles.js).
function permitir(recurso) {
  return (req, res, next) => {
    if (!cargoPodeAcessar(req.user.cargo, recurso)) {
      return res
        .status(403)
        .json({
          erro: `Seu cargo (${req.user.cargo || "não definido"}) não tem acesso a este módulo.`,
        });
    }
    next();
  };
}

app.get("/api/health", (_, res) =>
  res.json({ ok: true, service: "Sistema de Farmácia API" }),
);
app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      nome,
      sobrenome = "",
      cpf = "",
      telefone = "",
      cargo = "",
      email,
      senha,
    } = req.body;
    if (!nome || !email || !senha)
      return res
        .status(400)
        .json({ erro: "Nome, e-mail e senha são obrigatórios" });
    if (senha.length < 8)
      return res
        .status(400)
        .json({ erro: "A senha deve ter pelo menos 8 caracteres" });
    if (await get("SELECT id FROM users WHERE email=?", [email]))
      return res.status(409).json({ erro: "E-mail já cadastrado" });
    if (cpf && (await get("SELECT id FROM users WHERE cpf=?", [cpf])))
      return res.status(409).json({ erro: "CPF já cadastrado" });

    // Segurança: o cargo NUNCA vem do que a pessoa escolheu no formulário.
    // O primeiro usuário do sistema vira Administrador automaticamente
    // (é quem está configurando a farmácia). A partir daí, todo cadastro
    // novo entra com o cargo mais restrito (Caixa) até um Administrador
    // promover o funcionário para o cargo correto pela tela de Usuários.
    // Sem essa regra, qualquer pessoa poderia se auto-cadastrar como
    // "Administrador" direto na tela de login e ter acesso total.
    const { total } = await get("SELECT COUNT(*) as total FROM users");
    const cargoFinal = total === 0 ? "Administrador" : "Caixa";

    const hash = await bcrypt.hash(senha, 10);
    const r = await run(
      "INSERT INTO users(nome,sobrenome,cpf,telefone,cargo,email,senha) VALUES(?,?,?,?,?,?,?)",
      [nome, sobrenome, cpf || null, telefone, cargoFinal, email, hash],
    );
    const user = { id: r.lastID, nome, email, cargo: cargoFinal };
    res.status(201).json({
      usuario: user,
      token: token(user),
      aviso:
        total === 0
          ? null
          : 'Sua conta foi criada com o cargo "Caixa" por padrão. Peça a um administrador do sistema para ajustar seu cargo em Configurações → Usuários.',
    });
  } catch (e) {
    logger.error("Erro ao cadastrar usuário", { erro: e.message });
    res.status(500).json({ erro: "Erro ao cadastrar usuário" });
  }
});
app.post("/api/auth/login", async (req, res) => {
  const { email, senha } = req.body;
  const user = await get("SELECT * FROM users WHERE email=?", [email]);
  if (!user || !(await bcrypt.compare(senha || "", user.senha)))
    return res.status(401).json({ erro: "E-mail ou senha incorretos" });
  if (!user.ativo)
    return res
      .status(403)
      .json({
        erro: "Sua conta foi desativada. Fale com o administrador do sistema.",
      });
  res.json({
    usuario: {
      id: user.id,
      nome: user.nome,
      sobrenome: user.sobrenome,
      email: user.email,
      cargo: user.cargo,
    },
    token: token(user),
  });
});
app.get("/api/auth/me", auth, async (req, res) => {
  const u = await get(
    "SELECT id,nome,sobrenome,cpf,telefone,cargo,email,registro_profissional AS registroProfissional,created_at FROM users WHERE id=?",
    [req.user.id],
  );
  res.json(u);
});
app.put("/api/auth/me", auth, async (req, res) => {
  const {
    nome,
    sobrenome = "",
    telefone = "",
    email,
    registroProfissional = "",
  } = req.body;
  if (!nome) return res.status(400).json({ erro: "Nome é obrigatório" });
  try {
    if (email) {
      const existente = await get(
        "SELECT id FROM users WHERE email=? AND id!=?",
        [email, req.user.id],
      );
      if (existente)
        return res
          .status(409)
          .json({ erro: "E-mail já está em uso por outro usuário" });
    }
    // Repare que "cargo" propositalmente NÃO é aceito aqui — mudar o próprio
    // cargo teria que passar pela rota /api/usuarios, restrita a Administradores.
    await run(
      "UPDATE users SET nome=?,sobrenome=?,telefone=?,email=COALESCE(?,email),registro_profissional=? WHERE id=?",
      [
        nome,
        sobrenome,
        telefone,
        email || null,
        registroProfissional,
        req.user.id,
      ],
    );
    const u = await get(
      "SELECT id,nome,sobrenome,cpf,telefone,cargo,email,registro_profissional AS registroProfissional,created_at FROM users WHERE id=?",
      [req.user.id],
    );
    res.json(u);
  } catch (e) {
    logger.error("Erro ao atualizar perfil", {
      erro: e.message,
      userId: req.user?.id,
    });
    res.status(500).json({ erro: "Erro ao atualizar perfil" });
  }
});
app.put("/api/auth/senha", auth, async (req, res) => {
  const { novaSenha } = req.body;
  if (!novaSenha || novaSenha.length < 6)
    return res
      .status(400)
      .json({ erro: "A senha deve ter pelo menos 6 caracteres" });
  try {
    const hash = await bcrypt.hash(novaSenha, 10);
    await run("UPDATE users SET senha=? WHERE id=?", [hash, req.user.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: "Erro ao alterar senha" });
  }
});

// ─── GESTÃO DE USUÁRIOS (somente Administrador) ───
// Único lugar onde o cargo de alguém pode ser alterado — nenhum usuário
// consegue mudar o próprio cargo por conta própria (ver PUT /api/auth/me).
function exigirAdmin(req, res, next) {
  if (!ehAdministrador(req.user.cargo)) {
    return res
      .status(403)
      .json({ erro: "Apenas administradores podem gerenciar usuários." });
  }
  next();
}

app.get("/api/usuarios", auth, exigirAdmin, async (req, res) => {
  const usuarios = await all(
    "SELECT id,nome,sobrenome,email,cargo,ativo,created_at FROM users ORDER BY nome ASC",
  );
  res.json(usuarios);
});

// Cadastro de funcionário feito DIRETO pelo Administrador — diferente do
// /api/auth/register (autocadastro público, que sempre entra como "Caixa"
// por segurança). Aqui é o próprio admin quem define o cargo de cada
// funcionário já no cadastro, sem precisar promover depois.
app.post("/api/usuarios", auth, exigirAdmin, async (req, res) => {
  const { nome, sobrenome = "", email, cargo, senha, telefone = "" } = req.body;
  if (!nome || !email || !cargo || !senha) {
    return res
      .status(400)
      .json({
        erro: "Nome, e-mail, cargo e senha provisória são obrigatórios.",
      });
  }
  if (!CARGOS.includes(cargo)) {
    return res.status(400).json({ erro: "Cargo inválido." });
  }
  if (senha.length < 8) {
    return res
      .status(400)
      .json({ erro: "A senha provisória deve ter pelo menos 8 caracteres." });
  }
  if (await get("SELECT id FROM users WHERE email=?", [email])) {
    return res
      .status(409)
      .json({ erro: "Já existe um funcionário cadastrado com esse e-mail." });
  }
  const hash = await bcrypt.hash(senha, 10);
  const r = await run(
    "INSERT INTO users(nome,sobrenome,telefone,cargo,email,senha) VALUES(?,?,?,?,?,?)",
    [nome, sobrenome, telefone, cargo, email, hash],
  );
  const criado = await get(
    "SELECT id,nome,sobrenome,email,cargo,ativo,created_at FROM users WHERE id=?",
    [r.lastID],
  );
  res.status(201).json(criado);
});

app.put("/api/usuarios/:id", auth, exigirAdmin, async (req, res) => {
  const { cargo, ativo } = req.body;
  const alvo = await get("SELECT id FROM users WHERE id=?", [req.params.id]);
  if (!alvo) return res.status(404).json({ erro: "Usuário não encontrado" });

  if (cargo && !CARGOS.includes(cargo)) {
    return res.status(400).json({ erro: "Cargo inválido" });
  }
  if (Number(req.params.id) === req.user.id && ativo === false) {
    return res
      .status(400)
      .json({ erro: "Você não pode desativar a própria conta." });
  }
  if (
    Number(req.params.id) === req.user.id &&
    cargo &&
    cargo !== "Administrador"
  ) {
    return res
      .status(400)
      .json({
        erro: "Você não pode remover seu próprio acesso de administrador.",
      });
  }

  const updates = [];
  const params = [];
  if (cargo) {
    updates.push("cargo=?");
    params.push(cargo);
  }
  if (ativo !== undefined) {
    updates.push("ativo=?");
    params.push(ativo ? 1 : 0);
  }
  if (updates.length === 0)
    return res.status(400).json({ erro: "Nada para atualizar" });

  params.push(req.params.id);
  await run(`UPDATE users SET ${updates.join(",")} WHERE id=?`, params);
  const atualizado = await get(
    "SELECT id,nome,sobrenome,email,cargo,ativo,created_at FROM users WHERE id=?",
    [req.params.id],
  );
  res.json(atualizado);
});

// ─── CONFIGURAÇÕES DO SISTEMA (tema visual) ───
// Leitura é pública (sem exigir login) porque a tela de login também
// precisa saber qual tema aplicar antes da pessoa entrar no sistema — é só
// o nome de uma cor, não é informação sensível. Só quem é Administrador
// pode alterar (ver exigirAdmin), valendo pra todo mundo que usa o sistema.
const TEMAS_VALIDOS = ["coral", "azul", "vermelho", "verde", "personalizado"];
const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

app.get("/api/config", async (req, res) => {
  const config = await get(
    "SELECT tema, cor_personalizada AS corPersonalizada FROM configuracoes_sistema WHERE id=1",
  );
  res.json(config || { tema: "coral", corPersonalizada: null });
});

app.put("/api/config", auth, exigirAdmin, async (req, res) => {
  const { tema, corPersonalizada } = req.body;
  if (!TEMAS_VALIDOS.includes(tema)) {
    return res
      .status(400)
      .json({ erro: "Tema inválido. Use: " + TEMAS_VALIDOS.join(", ") });
  }
  if (tema === "personalizado" && !HEX_REGEX.test(corPersonalizada || "")) {
    return res
      .status(400)
      .json({ erro: "Informe uma cor personalizada válida (ex: #2b5ba8)." });
  }
  await run(
    "UPDATE configuracoes_sistema SET tema=?, cor_personalizada=? WHERE id=1",
    [tema, tema === "personalizado" ? corPersonalizada : null],
  );
  res.json({
    tema,
    corPersonalizada: tema === "personalizado" ? corPersonalizada : null,
  });
});

// ─── CADASTRO DA EMPRESA ───
// Leitura pública pelo mesmo motivo do tema: a tela de login mostra o nome
// e a logo da farmácia antes mesmo da pessoa entrar. Só Administrador pode
// editar. A logo é salva como texto (data URL base64) direto no banco —
// simples e suficiente pro tamanho de imagem que um logo precisa ter.
const TAMANHO_MAX_LOGO = 800 * 1024; // ~800KB em base64, dá uma imagem bem leve

app.get("/api/empresa", async (req, res) => {
  const e = await get("SELECT * FROM empresa WHERE id=1");
  if (!e) return res.json({});
  res.json({
    razaoSocial: e.razao_social,
    nomeFantasia: e.nome_fantasia,
    cnpj: e.cnpj,
    inscricaoEstadual: e.inscricao_estadual,
    telefone: e.telefone,
    email: e.email,
    cep: e.cep,
    logradouro: e.logradouro,
    numero: e.numero,
    complemento: e.complemento,
    bairro: e.bairro,
    cidade: e.cidade,
    uf: e.uf,
    responsavelTecnico: e.responsavel_tecnico,
    responsavelRegistro: e.responsavel_registro,
    logo: e.logo,
    atualizadoEm: e.atualizado_em,
  });
});

app.put("/api/empresa", auth, exigirAdmin, async (req, res) => {
  const dados = req.body || {};
  if (dados.cnpj) {
    const digitos = String(dados.cnpj).replace(/\D/g, "");
    if (digitos.length !== 14) {
      return res
        .status(400)
        .json({ erro: "CNPJ inválido — deve ter 14 dígitos." });
    }
  }
  if (dados.logo && dados.logo.length > TAMANHO_MAX_LOGO) {
    return res
      .status(400)
      .json({ erro: "Logo muito grande. Use uma imagem menor (até ~500KB)." });
  }
  const campos = [
    "razao_social",
    "nome_fantasia",
    "cnpj",
    "inscricao_estadual",
    "telefone",
    "email",
    "cep",
    "logradouro",
    "numero",
    "complemento",
    "bairro",
    "cidade",
    "uf",
    "responsavel_tecnico",
    "responsavel_registro",
    "logo",
  ];
  const mapaCamelParaSnake = {
    razaoSocial: "razao_social",
    nomeFantasia: "nome_fantasia",
    inscricaoEstadual: "inscricao_estadual",
    responsavelTecnico: "responsavel_tecnico",
    responsavelRegistro: "responsavel_registro",
  };
  const valores = campos.map((snake) => {
    const camel = Object.keys(mapaCamelParaSnake).find(
      (k) => mapaCamelParaSnake[k] === snake,
    );
    const valor = dados[snake] ?? (camel ? dados[camel] : undefined);
    return valor === undefined ? null : valor;
  });
  await run(
    `UPDATE empresa SET ${campos.map((c) => c + "=?").join(",")}, atualizado_em=CURRENT_TIMESTAMP WHERE id=1`,
    valores,
  );
  const atualizado = await get("SELECT * FROM empresa WHERE id=1");
  res.json(atualizado);
});

for (const resource of resources) {
  // Os dados de cada recurso são COMPARTILHADOS entre todos os funcionários
  // da farmácia (não é mais isolado por quem criou o registro) — afinal,
  // um caixa e um atendente precisam ver o mesmo estoque e os mesmos
  // clientes. O controle de quem pode fazer o quê é feito por CARGO
  // (middleware "permitir"), não por "dono do registro". A coluna user_id
  // é mantida só como registro de auditoria (quem criou cada item).
  app.get(`/api/${resource}`, auth, permitir(resource), async (req, res) => {
    const { pagina, limite } = req.query;
    if (!pagina && !limite) {
      const rows = await all(`SELECT * FROM "${resource}" ORDER BY id DESC`);
      return res.json(
        rows.map((x) => ({
          ...JSON.parse(x.dados),
          id: x.id,
          created_at: x.created_at,
          updated_at: x.updated_at,
        })),
      );
    }
    const p = Math.max(1, parseInt(pagina) || 1);
    const l = Math.min(200, Math.max(1, parseInt(limite) || 50));
    const offset = (p - 1) * l;
    const { total } = await get(`SELECT COUNT(*) as total FROM "${resource}"`);
    const rows = await all(
      `SELECT * FROM "${resource}" ORDER BY id DESC LIMIT ? OFFSET ?`,
      [l, offset],
    );
    res.json({
      itens: rows.map((x) => ({
        ...JSON.parse(x.dados),
        id: x.id,
        created_at: x.created_at,
        updated_at: x.updated_at,
      })),
      total,
      pagina: p,
      totalPaginas: Math.max(1, Math.ceil(total / l)),
    });
  });
  // "vendas" tem uma rota de POST própria logo abaixo (precisa criar o
  // lançamento financeiro junto, de forma atômica) — as demais operações
  // (listar, editar, excluir) continuam usando a rota genérica normalmente.
  if (resource !== "vendas") {
    app.post(`/api/${resource}`, auth, permitir(resource), async (req, res) => {
      const r = await run(
        `INSERT INTO "${resource}"(user_id,dados) VALUES(?,?)`,
        [req.user.id, JSON.stringify(req.body)],
      );
      const row = await get(`SELECT * FROM "${resource}" WHERE id=?`, [
        r.lastID,
      ]);
      res
        .status(201)
        .json({
          ...JSON.parse(row.dados),
          id: row.id,
          created_at: row.created_at,
        });
    });
  }
  app.put(
    `/api/${resource}/:id`,
    auth,
    permitir(resource),
    async (req, res) => {
      const exists = await get(`SELECT id FROM "${resource}" WHERE id=?`, [
        req.params.id,
      ]);
      if (!exists)
        return res.status(404).json({ erro: "Registro não encontrado" });
      await run(
        `UPDATE "${resource}" SET dados=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        [JSON.stringify(req.body), req.params.id],
      );
      res.json({ id: Number(req.params.id), ...req.body });
    },
  );
  app.delete(
    `/api/${resource}/:id`,
    auth,
    permitir(resource),
    async (req, res) => {
      const r = await run(`DELETE FROM "${resource}" WHERE id=?`, [
        req.params.id,
      ]);
      if (!r.changes)
        return res.status(404).json({ erro: "Registro não encontrado" });
      res.status(204).end();
    },
  );
}

// ─── VENDAS (rota própria): cria a venda e já lança a receita no Financeiro
// automaticamente, numa única operação no servidor. Isso é importante pro
// RBAC: quem opera o caixa (Caixa, Atendente de Vendas) tem permissão pra
// registrar vendas, mas NÃO tem permissão pra mexer no módulo Financeiro —
// se o lançamento fosse criado pelo frontend chamando /api/lancamentos
// direto, essas pessoas precisariam de acesso ao Financeiro só pra poder
// vender, o que quebraria o princípio de menor privilégio. Fazendo o
// lançamento aqui, no servidor, o Caixa nunca precisa dessa permissão.
app.post("/api/vendas", auth, permitir("vendas"), async (req, res) => {
  const dadosVenda = req.body;
  const r = await run(`INSERT INTO "vendas"(user_id,dados) VALUES(?,?)`, [
    req.user.id,
    JSON.stringify(dadosVenda),
  ]);
  const row = await get(`SELECT * FROM "vendas" WHERE id=?`, [r.lastID]);

  const totalVenda = Number(dadosVenda.total) || 0;
  let lancamentoCriado = null;
  if (totalVenda > 0) {
    const lancamento = {
      tipo: "rec",
      fornecedor: dadosVenda.cliente || "Cliente balcão",
      categoria: "Venda balcão",
      descricao: `Venda de balcão (${(dadosVenda.itens || []).length} item(ns))`,
      valor: totalVenda,
      vencimento: dadosVenda.data,
      _novo: true,
      _vendaId: row.id,
    };
    const rLanc = await run(
      `INSERT INTO "lancamentos"(user_id,dados) VALUES(?,?)`,
      [req.user.id, JSON.stringify(lancamento)],
    );
    const rowLanc = await get(`SELECT * FROM "lancamentos" WHERE id=?`, [
      rLanc.lastID,
    ]);
    lancamentoCriado = {
      ...JSON.parse(rowLanc.dados),
      id: rowLanc.id,
      created_at: rowLanc.created_at,
    };
  }

  res
    .status(201)
    .json({
      ...JSON.parse(row.dados),
      id: row.id,
      created_at: row.created_at,
      _lancamentoCriado: lancamentoCriado,
    });
});

// ─── CATÁLOGO DE MEDICAMENTOS (manipulados + industrializados) ───
// Busca no cache local (SQLite). tipo=manipulado|industrializado (opcional), q=termo de busca.
app.get("/api/medicamentos", auth, async (req, res) => {
  const { tipo, q = "" } = req.query;
  const termo = `%${q.trim()}%`;
  const params = [];
  let sql = `SELECT * FROM medicamentos_catalogo WHERE 1=1`;
  if (tipo) {
    sql += " AND tipo=?";
    params.push(tipo);
  }
  if (q.trim()) {
    sql += " AND (nome LIKE ? OR principio_ativo LIKE ? OR categoria LIKE ?)";
    params.push(termo, termo, termo);
  }
  sql += " ORDER BY nome ASC LIMIT 100";
  const rows = await all(sql, params);
  res.json(rows);
});

// Busca medicamentos industrializados na API pública medicamentos.api.br
// (ANVISA + CMED) e grava o resultado no cache local para consultas futuras.
app.post("/api/medicamentos/importar", auth, async (req, res) => {
  const nome = (req.body?.nome || "").trim();
  if (nome.length < 2)
    return res
      .status(400)
      .json({ erro: "Informe ao menos 2 caracteres para buscar" });
  if (!MEDICAMENTOS_API_KEY) {
    return res.status(400).json({
      erro: "api_key_ausente",
      mensagem:
        "Configure MEDICAMENTOS_API_KEY no .env do backend (chave grátis em https://medicamentos.api.br/api).",
    });
  }
  try {
    const resp = await fetch(
      `${MEDICAMENTOS_API_BASE}/v1/medicamentos?nome=${encodeURIComponent(nome)}`,
      {
        headers: { "X-API-Key": MEDICAMENTOS_API_KEY },
      },
    );
    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json(data);

    const salvos = [];
    for (const m of data.resultados || []) {
      await run(
        `INSERT INTO medicamentos_catalogo(tipo,nome,principio_ativo,categoria,fabricante,registro_anvisa,fonte)
         VALUES('industrializado',?,?,?,?,?,'ANVISA/CMED via medicamentos.api.br')
         ON CONFLICT(tipo,nome,registro_anvisa) DO UPDATE SET
           principio_ativo=excluded.principio_ativo, categoria=excluded.categoria,
           fabricante=excluded.fabricante`,
        [
          m.nome,
          m.principioAtivo || "",
          m.categoria || "",
          m.fabricante || "",
          m.registro || null,
        ],
      );
      salvos.push(m);
    }
    res.json({ total: data.total ?? salvos.length, resultados: salvos });
  } catch (e) {
    res
      .status(502)
      .json({ erro: "Falha ao consultar a API de medicamentos externa" });
  }
});

// IP da máquina na rede local (Wi-Fi/cabo) — usado só pra mostrar no log
// uma URL pronta pra abrir do celular/tablet na mesma rede.
function ipDaRedeLocal() {
  const redes = os.networkInterfaces();
  for (const nome of Object.keys(redes)) {
    for (const rede of redes[nome] || []) {
      if (rede.family === "IPv4" && !rede.internal) return rede.address;
    }
  }
  return null;
}

init().then(() =>
  app.listen(PORT, "0.0.0.0", () => {
    const ipLocal = ipDaRedeLocal();
    logger.info(`API rodando em http://localhost:${PORT}`, {
      port: PORT,
      frontend: FRONTEND_URLS.join(", "),
    });
    if (ipLocal) {
      logger.info(
        `Acessível na rede local em http://${ipLocal}:${PORT} (use esse IP no VITE_API_URL do frontend pra acessar do celular/tablet)`,
      );
    }
  }),
);
