export const NAV_GROUPS = [
  {
    label: "Visão geral",
    items: [
      {
        path: "/",
        icon: "dashboard",
        label: "Dashboard",
        recurso: "comercial",
      },
      {
        path: "/agenda",
        icon: "event",
        label: "Agenda",
        recurso: "compromissos",
      },
    ],
  },
  {
    label: "Atendimento",
    items: [
      {
        path: "/clientes",
        icon: "group",
        label: "Clientes",
        recurso: "clientes",
      },
      {
        path: "/prescritores",
        icon: "stethoscope",
        label: "Médicos",
        recurso: "prescritores",
      },
      {
        path: "/orcamentos",
        icon: "shopping_cart",
        label: "Pedidos",
        recurso: "orcamentos",
      },
    ],
  },
  {
    label: "Manipulação",
    items: [
      {
        path: "/formulas",
        icon: "biotech",
        label: "Fórmulas",
        recurso: "formulas",
      },
      {
        path: "/biblioteca",
        icon: "menu_book",
        label: "Biblioteca",
        recurso: "biblioteca",
      },
      {
        path: "/medicamentos",
        icon: "medication",
        label: "Medicamentos",
        recurso: "medicamentos",
      },
      {
        path: "/laboratorio",
        icon: "science",
        label: "Produção",
        recurso: "producoes",
      },
    ],
  },
  {
    label: "Não Manipulados",
    items: [
      {
        path: "/vendas",
        icon: "point_of_sale",
        label: "Vendas (Balcão)",
        recurso: "vendas",
      },
      {
        path: "/promocoes",
        icon: "sell",
        label: "Promoções",
        recurso: "promocoes",
      },
      {
        path: "/estoque-nao-manipulados",
        icon: "local_pharmacy",
        label: "Estoque",
        recurso: "produtos-industrializados",
      },
    ],
  },
  {
    label: "Suprimentos (Manipulação)",
    items: [
      {
        path: "/estoque",
        icon: "inventory_2",
        label: "Insumos",
        recurso: "pedidos",
      },
      {
        path: "/produtos-prontos",
        icon: "inventory",
        label: "Produtos prontos",
        recurso: "produtos-prontos",
      },
      {
        path: "/compras",
        icon: "shopping_bag",
        label: "Compras",
        recurso: "compras",
      },
      {
        path: "/fornecedores",
        icon: "local_shipping",
        label: "Fornecedores",
        recurso: "fornecedores",
      },
    ],
  },
  {
    label: "Gestão",
    items: [
      {
        path: "/financeiro",
        icon: "payments",
        label: "Financeiro",
        recurso: "lancamentos",
      },
      {
        path: "/notificacoes",
        icon: "notifications",
        label: "Notificações",
        recurso: "notificacoes",
      },
      {
        path: "/config",
        icon: "settings",
        label: "Configurações",
        recurso: "comercial",
      },
    ],
  },
  {
    label: "Administração",
    adminOnly: true,
    items: [
      {
        path: "/usuarios",
        icon: "manage_accounts",
        label: "Usuários",
        recurso: "usuarios",
        adminOnly: true,
      },
      {
        path: "/empresa",
        icon: "storefront",
        label: "Empresa",
        recurso: "empresa",
        adminOnly: true,
      },
    ],
  },
];

export const PAGE_TITLES = {
  "/": "Painel Comercial",
  "/agenda": "Agenda",
  "/clientes": "Clientes Cadastrados",
  "/prescritores": "Gestão de Médicos",
  "/orcamentos": "Pedidos",
  "/formulas": "Fórmulas Magistrais",
  "/biblioteca": "Biblioteca de Fórmulas",
  "/medicamentos": "Medicamentos",
  "/laboratorio": "Produção",
  "/vendas": "Vendas (Balcão)",
  "/promocoes": "Promoções e Descontos",
  "/estoque-nao-manipulados": "Estoque Não Manipulados",
  "/estoque": "Estoque de Insumos",
  "/produtos-prontos": "Produtos Prontos",
  "/compras": "Compras",
  "/fornecedores": "Fornecedores",
  "/financeiro": "Financeiro",
  "/notificacoes": "Notificações",
  "/config": "Configurações do Usuário",
  "/usuarios": "Gestão de Usuários",
  "/empresa": "Cadastro da Empresa",
};

// Ícone de cada página, usado no cabeçalho ao lado do título — montado
// automaticamente a partir dos ícones já definidos em NAV_GROUPS, pra não
// precisar manter duas listas de ícones em sincronia.
export const PAGE_ICONS = Object.fromEntries(
  NAV_GROUPS.flatMap((grupo) =>
    grupo.items.map((item) => [item.path, item.icon]),
  ),
);
