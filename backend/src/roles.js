// Matriz de permissões por cargo (RBAC — Role-Based Access Control).
//
// Baseado em como farmácias e redes de varejo reais estruturam acesso por
// função (fonte: guias de RBAC para farmácias e RBAC "least privilege" da
// IBM/Netwrix/Zluri — cada papel só recebe acesso ao que precisa pro seu
// trabalho, e o acesso é dado por CARGO, nunca configurado pessoa a pessoa):
//
//   - Farmacêutico responsável / Farmacêutico   → manipulação e clínico
//   - Balconista / Atendente                    → vendas e atendimento
//   - Caixa                                     → só operação de venda
//   - Técnico de manipulação                    → produção
//   - Financeiro                                → contas e fornecedores
//   - Estoquista / Recebimento                  → estoque e compras
//   - Gerente / Administrador                   → acesso completo
//
// Cada cargo aqui é mapeado para os "recursos" (rotas /api/<recurso>) que
// ele pode acessar. Isso é aplicado nas rotas do backend (fonte real de
// verdade) e espelhado no frontend só para já esconder o que a pessoa nem
// pode usar.

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

// '*' = acesso a todos os recursos.
export const PERMISSOES = {
  Administrador: "*",
  // Gerente vê e mexe em tudo do operacional, mas não gerencia usuários
  // (isso fica restrito ao Administrador — ver rota /api/usuarios).
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

// 'medicamentos' (catálogo de referência) é liberado para todo mundo
// autenticado: é informação de consulta, sem risco em ser lida por qualquer
// cargo, e várias funções (farmacêutico, atendente, estoquista) precisam
// consultá-lo no dia a dia.
const SEMPRE_LIBERADOS = ["medicamentos"];

export function cargoPodeAcessar(cargo, recurso) {
  if (SEMPRE_LIBERADOS.includes(recurso)) return true;
  const permissao = PERMISSOES[cargo];
  if (!permissao) return false;
  if (permissao === "*") return true;
  return permissao.includes(recurso);
}

// Só o próprio Administrador pode promover/despromover outros usuários e
// ativar/desativar contas — nenhum outro cargo, nem Gerente, tem essa rota.
export function ehAdministrador(cargo) {
  return cargo === "Administrador";
}
