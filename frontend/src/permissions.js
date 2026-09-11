// Espelho do backend/src/roles.js — usado só para já esconder no frontend
// o que a pessoa nem pode usar (melhora a experiência). A segurança de
// verdade é sempre aplicada no backend; mesmo que alguém burle isso aqui,
// a API vai recusar a requisição.

export const CARGOS = [
  "Administrador",
  "Gerente",
  "Farmacêutico(a)",
  "Atendente de Vendas",
  "Caixa",
  "Manipulador(a)",
  "Financeiro",
  "Estoquista",
];

export const PERMISSOES = {
  Administrador: "*",
  Gerente: "*",
  "Farmacêutico(a)": [
    "clientes",
    "prescritores",
    "orcamentos",
    "formulas",
    "biblioteca",
    "producoes",
    "produtos-prontos",
    "compromissos",
    "notificacoes",
    "relatorios",
  ],
  "Atendente de Vendas": [
    "clientes",
    "vendas",
    "produtos-industrializados",
    "orcamentos",
    "compromissos",
    "notificacoes",
    "promocoes",
  ],
  Caixa: ["vendas", "produtos-industrializados", "notificacoes", "promocoes"],
  "Manipulador(a)": [
    "producoes",
    "formulas",
    "biblioteca",
    "pedidos",
    "compromissos",
    "notificacoes",
  ],
  Financeiro: [
    "lancamentos",
    "compras",
    "fornecedores",
    "relatorios",
    "clientes",
    "notificacoes",
  ],
  Estoquista: [
    "pedidos",
    "produtos-industrializados",
    "compras",
    "fornecedores",
    "produtos-prontos",
    "notificacoes",
  ],
};

const SEMPRE_LIBERADOS = ["medicamentos", "comercial"];

export function podeAcessar(cargo, recurso) {
  if (SEMPRE_LIBERADOS.includes(recurso)) return true;
  const permissao = PERMISSOES[cargo];
  if (!permissao) return false;
  if (permissao === "*") return true;
  return permissao.includes(recurso);
}

export function ehAdministrador(cargo) {
  return cargo === "Administrador";
}
