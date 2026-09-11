# Backend Sistema de Farmácia

## Praticidade (pesquisa em ANVISA + sistemas de farmácia)

Levantei o que a ANVISA exige e o que sistemas de farmácia do mercado
costumam ter, e implementei o que fazia sentido pra uma farmácia só de
manipulados comuns (sem controlados):

- **Lote e validade com alerta de vencimento** — Produtos Prontos e Estoque
  Não Manipulados agora têm campo de validade com aviso visual (laranja =
  vence em até 30 dias, vermelho = já venceu). Atende à exigência da
  RDC 67/2007 de rastreabilidade de validade.
- **Bloqueio automático de venda de produto vencido** — o PDV (Vendas)
  não deixa vender um item cuja validade já passou, nem ele aparece na
  lista de produtos disponíveis.
- **Código de barras** — cada produto do Estoque Não Manipulados pode ter
  um código de barras cadastrado. No PDV, tem um campo dedicado pra ler com
  qualquer leitor USB comum (que só "digita" o código e aperta Enter) — o
  produto é adicionado ao carrinho automaticamente.
- **Curva ABC de produtos** — classifica os produtos não manipulados por
  quanto de receita cada um gera (A = essenciais, B = intermediários,
  C = pouco relevantes), pra saber onde focar o estoque.
- **Sugestão de compra** — lista automática de produtos que bateram no
  estoque mínimo, com uma sugestão de quantidade pra repor.

**O que pesquisei mas não implementei** (exige contrato/credenciamento
externo, não dá pra simular): emissão de Nota Fiscal (NFC-e) — precisa de
certificado digital e credenciamento na SEFAZ; SNGPC/SNCR — obrigatório só
para farmácias que vendem medicamentos controlados; desconto de convênio
(PBM) — depende de contrato com provedores como Funcional Card.

## Funcionalidades de mercado (comparado a outros sistemas de farmácia)

- **Pagamento dividido no PDV** — uma venda pode ser paga em mais de uma
  forma (ex: parte em dinheiro, parte no Pix). No formulário de Vendas,
  clique em "Dividir em outra forma de pagamento"; a última forma sempre
  fecha automaticamente com o que sobrou do total, então não precisa fazer
  conta de cabeça.
- **Promoções e descontos por período** — cadastre uma promoção (percentual
  ou valor fixo) num produto específico ou na loja toda, com data de início
  e fim. O desconto é aplicado automaticamente no PDV enquanto a promoção
  estiver dentro do período — o caixa não precisa lembrar de aplicar nada
  na mão. Fica no menu "Não Manipulados → Promoções".
- **DRE (Demonstrativo de Resultado)** — no Financeiro, mostra receita
  bruta, despesas agrupadas por categoria e o resultado líquido do mês
  escolhido, com a margem líquida em %.
- **Fluxo de Caixa** — também no Financeiro, um gráfico com entradas,
  saídas e saldo acumulado mês a mês, além da tabela com os mesmos números.

## Controle de acesso por cargo (RBAC)

Cada funcionário tem um cargo, e cada cargo só acessa os módulos que precisa
pro seu trabalho — o mesmo modelo usado por farmácias e redes de varejo reais
(ver `backend/src/roles.js` para a fonte e a matriz completa):

**Como cadastrar funcionários:** em **Administração → Usuários → Novo
Funcionário**, o Administrador cadastra nome, e-mail e já escolhe o cargo
(função) de cada funcionário — não precisa promover depois. O sistema gera
uma senha provisória (pode gerar outra ou digitar a que quiser), que o
Administrador repassa ao funcionário; ele já entra direto com o cargo certo
e pode trocar a senha depois em Configurações. Só o e-mail e a senha
provisória — nada de credenciais externas — são suficientes pro funcionário
acessar.

*(A tela de login também tem uma aba de autocadastro, útil pra farmácia
testar o sistema sozinha antes de ter uma equipe formada — mas quem se
cadastra por lá sempre entra com o cargo mais restrito, "Caixa", até um
Administrador ajustar. O cadastro pela tela de Usuários é o caminho
recomendado quando já existe uma equipe.)*

| Cargo | Acesso |
|---|---|
| **Administrador** | Tudo, incluindo a gestão de outros usuários |
| **Gerente** | Tudo, exceto gestão de usuários |
| **Farmacêutico(a)** | Clientes, Médicos, Pedidos, Fórmulas, Biblioteca, Produção, Produtos Prontos, Agenda |
| **Atendente de Vendas** | Clientes, Vendas, Promoções, Estoque Não Manipulados, Pedidos, Agenda |
| **Caixa** | Só Vendas (Balcão), Promoções (consulta) e Estoque Não Manipulados — o mais restrito |
| **Manipulador(a)** | Produção, Fórmulas, Biblioteca, Insumos, Agenda |
| **Financeiro** | Financeiro, Compras, Fornecedores, Relatórios, Clientes |
| **Estoquista** | Insumos, Estoque Não Manipulados, Compras, Fornecedores, Produtos Prontos |

**Como funciona:**
- O **primeiro usuário cadastrado no sistema vira Administrador automaticamente**
  (é quem está configurando a farmácia). Todo cadastro seguinte entra com o
  cargo mais restrito (**Caixa**) até um administrador liberar o acesso
  correto — ninguém consegue se auto-promover escolhendo "Administrador" na
  tela de cadastro; o backend ignora esse campo por segurança.
- Um Administrador muda o cargo de qualquer funcionário (ou bloqueia o
  acesso dele) na tela **Configurações → Usuários** (só aparece pra quem é
  Administrador). A mudança tem efeito imediato — o funcionário não precisa
  fazer login de novo.
- O bloqueio é reforçado em duas camadas: o **backend recusa a requisição**
  (a segurança de verdade) e o **frontend já esconde** os módulos e bloqueia
  o acesso direto por URL (mostra uma tela de "Acesso não permitido").
- Os dados (clientes, vendas, estoque etc.) agora são **compartilhados entre
  todos os funcionários** da farmácia — antes, cada conta via só os próprios
  dados, o que não fazia sentido para uma equipe real trabalhando junto.

## Segurança, performance e manutenção

Melhorias aplicadas em cima da versão inicial:

**Segurança**
- `helmet` — headers HTTP de segurança (CSP, anti-clickjacking, etc.)
- CORS restrito: só aceita requisições da origem definida em `FRONTEND_URL`
  (no `.env`), em vez de aceitar qualquer site.
- `JWT_SECRET` agora é **obrigatório**: se estiver ausente ou tiver menos de
  16 caracteres, o servidor recusa subir (evita rodar com uma chave fraca ou
  previsível por engano).
- Rate limiting no login e cadastro (`express-rate-limit`): 20 tentativas a
  cada 15 minutos por IP, evitando força bruta de senha.

**Performance**
- SQLite em modo `WAL` (Write-Ahead Logging): leituras e escritas simultâneas
  sem travar o banco inteiro a cada operação.
- Paginação opcional nas listagens: `GET /api/clientes?pagina=1&limite=50`
  retorna `{ itens, total, pagina, totalPaginas }`. Sem esses parâmetros, o
  comportamento continua igual a antes (devolve a lista inteira) — não quebra
  nada que já existe.
- Frontend com **code-splitting**: cada módulo do Dashboard (Clientes,
  Vendas, Financeiro...) só é baixado pelo navegador quando o usuário
  realmente abre aquela aba, em vez de carregar tudo de uma vez.
- URL da API configurável via `VITE_API_URL` no `.env` do frontend — não fica
  mais fixa em `localhost`, então dá pra apontar para um backend hospedado
  em produção.

**Manutenção**
- Logs estruturados (`src/logger.js`): cada evento vira uma linha JSON com
  timestamp, nível e contexto — fácil de filtrar depois se for redirecionado
  para um arquivo ou serviço de logs. Requisições HTTP são logadas via
  `morgan`.
- Script de backup do banco: `npm run backup` (dentro de `backend/`) copia o
  `farmacia.db` para `backend/backups/` com timestamp, mantendo os 14 mais
  recentes automaticamente. Pode ser agendado (cron / Agendador de Tarefas)
  para rodar sozinho todo dia.

## Instalação
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

API: `http://localhost:3000/api`

### Autenticação
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/me` — atualiza nome, sobrenome, cargo, telefone, e-mail
- `PUT /api/auth/senha` — troca a senha (`{ "novaSenha": "..." }`)

Envie `Authorization: Bearer SEU_TOKEN` nas demais rotas.

### Recursos CRUD
`clientes`, `pedidos`, `prescritores`, `producoes`, `lancamentos`, `orcamentos`, `compromissos`, `relatorios`, `formulas`, `biblioteca`, `produtos-prontos`, `compras`, `fornecedores`, `notificacoes`, `produtos-industrializados`, `vendas`.

Cada recurso possui `GET`, `POST`, `PUT /:id` e `DELETE /:id`.

### Módulos do Dashboard

O Dashboard cobre as duas linhas de negócio de uma farmácia de manipulação:

**🧪 Manipulados** (produção sob prescrição): Fórmulas, Biblioteca de Fórmulas,
Produção (Laboratório), Produtos Prontos, Prescritores, Insumos (matérias-primas).

**💊 Não Manipulados** (venda direta de industrializados/OTC):
- **Vendas (Balcão)** — PDV simples: adiciona produtos ao carrinho, calcula o
  total, dá baixa automática no estoque e já lança a venda como receita no
  Financeiro.
- **Estoque Não Manipulados** — catálogo de medicamentos industrializados
  (nome, princípio ativo, fabricante, preço, quantidade), separado do estoque
  de insumos usados na manipulação.
- **Medicamentos** — consulta ao catálogo de referência (ver seção abaixo),
  útil tanto para conferir insumos de manipulação quanto para pesquisar dados
  de medicamentos industrializados na ANVISA/CMED antes de cadastrar no
  estoque de não manipulados.

Além disso: Clientes, Médicos/Prescritores, Pedidos (orçamentos), Agenda,
Compras, Fornecedores, Financeiro, Notificações e Configurações — comuns às
duas linhas de negócio.

### Catálogo de Medicamentos (manipulados + não manipulados)
- `GET /api/medicamentos?tipo=manipulado|industrializado&q=termo` — busca no cache local (SQLite).
- `POST /api/medicamentos/importar` `{ "nome": "dipirona" }` — busca medicamentos
  **industrializados** (não manipulados) na API pública
  [medicamentos.api.br](https://medicamentos.api.br) (dados oficiais ANVISA + preços CMED)
  e grava o resultado no cache local.

  Para usar, gere uma chave grátis em https://medicamentos.api.br/api (100 req/dia)
  e defina `MEDICAMENTOS_API_KEY` no `.env` do backend. **Sem a chave, a busca
  de industrializados usa o catálogo local abaixo** — a API só é chamada pra
  trazer dados oficiais e mais completos além dele.

- Os **manipulados** vêm de um catálogo de referência pré-carregado no banco
  (40 insumos farmacêuticos ativos comuns em farmácias de manipulação —
  capilares, hormonais, emagrecimento, dermocosméticos, suplementos etc., ver
  `backend/src/seedManipulados.js`). Não existe API pública oficial para
  fórmulas magistrais, pois elas são produzidas sob prescrição e não são
  produtos registrados na ANVISA.
- Os **industrializados** também vêm com um catálogo local pré-carregado (~26
  medicamentos e produtos de balcão comuns — analgésicos, antialérgicos,
  vitaminas, dermocosméticos etc., ver `backend/src/seedIndustrializados.js`),
  disponível mesmo sem configurar a chave da API. Na tela de Medicamentos, aba
  "Não manipulados", cada item tem um botão **"Adicionar ao estoque"** que já
  abre o cadastro de Estoque Não Manipulados com nome, princípio ativo,
  categoria e fabricante preenchidos — só falta informar preço, quantidade,
  lote e validade da compra.

## Rodando o projeto completo (backend + frontend)

O projeto tem duas pastas independentes, uma para cada parte:

```
Sistema de Farmacia/
├── backend/     ← API (Node/Express + SQLite)
└── frontend/    ← React (Vite + React Router + Framer Motion)
```

Abra **dois terminais** no VS Code (ícone "+" no painel de terminal) e deixe os dois rodando ao mesmo tempo.

**Terminal 1 — Backend:**
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```
Sobe em `http://localhost:3000`.

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Sobe em `http://localhost:5500` (o Vite já abre com hot-reload — qualquer
alteração no código atualiza a tela na hora, sem precisar recarregar manualmente).

Depois é só abrir **http://localhost:5500** no navegador — a página já
redireciona para o login automaticamente. Crie uma conta e faça login; os
dados são salvos de verdade no backend (arquivo `backend/farmacia.db`,
criado sozinho na primeira vez).

Para gerar uma versão de produção do frontend (arquivos estáticos otimizados):
```bash
cd frontend
npm run build      # gera a pasta frontend/dist
npm run preview    # serve a build de produção em http://localhost:5500
```

## Acessando pelo celular ou tablet (mesma rede Wi-Fi)

O app já vem configurado pra ser acessado de outros aparelhos (celular,
tablet) conectados **na mesma rede Wi-Fi** do computador que está rodando o
backend e o frontend — sem precisar instalar nada nem publicar o projeto na
internet.

**1. Descubra o IP local do computador.** O jeito mais fácil é olhar o log
do backend: quando você roda `npm run dev` na pasta `backend`, aparece uma
linha assim:
```
Acessível na rede local em http://192.168.0.10:3000 (...)
```
Esse número (`192.168.0.10` no exemplo) é o IP do computador na rede.
Se preferir, também dá pra achar manualmente: no Windows, `ipconfig` (campo
"Endereço IPv4"); no Mac/Linux, `ifconfig` ou `ip addr` (procure a interface
Wi-Fi, normalmente `en0` ou `wlan0`).

**2. Libere esse IP no CORS do backend.** Abra `backend/.env` e adicione o
IP na lista de `FRONTEND_URL` (separada por vírgula), na porta do frontend
(5500):
```
FRONTEND_URL=http://localhost:5500,http://192.168.0.10:5500
```
Reinicie o backend (`npm run dev`) depois de editar o `.env`.

**3. Suba o frontend normalmente** (`npm run dev` na pasta `frontend`). O
Vite já escuta em todas as interfaces de rede, então no terminal aparecem
duas URLs — uma local e outra de rede (`Network: http://192.168.0.10:5500/`).

**4. No celular ou tablet**, abra o navegador e digite o endereço de rede do
frontend, por exemplo:
```
http://192.168.0.10:5500
```
A tela de login deve carregar e funcionar normalmente — o app detecta
sozinho que precisa falar com o backend nesse mesmo IP (na porta 3000), sem
precisar configurar mais nada no frontend.

> ⚠️ **Firewall:** se a página não carregar do celular, o firewall do
> computador pode estar bloqueando as portas 3000 e 5500 para outros
> aparelhos da rede. No Windows, isso aparece como um aviso do "Firewall do
> Windows" na primeira vez que você roda `npm run dev` — permita o acesso em
> redes privadas. Celular e computador também precisam estar na **mesma
> rede Wi-Fi** (redes de convidados costumas isolar os aparelhos entre si).
>
> **Publicando de verdade (fora da rede local):** o passo a passo acima é só
> para uso doméstico/interno, na mesma rede. Para acessar de qualquer lugar
> (internet), o backend e o `npm run build` do frontend precisam ser
> hospedados em um serviço de nuvem (ex: Railway, Render, Vercel) com HTTPS
> — isso está fora do escopo deste guia rápido.

## Interface adaptada para celular e tablet

O layout do Dashboard se adapta automaticamente ao tamanho da tela:

- **Celular** (telas estreitas): o menu lateral vira uma gaveta que desliza
  por cima do conteúdo, aberta pelo ícone de menu (☰) no canto superior
  esquerdo do cabeçalho. Tabelas longas rolam na horizontal dentro do
  próprio cartão em vez de espremer as colunas, e os formulários/modais se
  ajustam à largura da tela.
- **Tablet**: o menu lateral fica sempre visível, só que reduzido a ícones
  (sem os textos), pra sobrar mais espaço pro conteúdo.
- **Desktop**: menu lateral completo, como antes.

Isso vale tanto para o PDV (Vendas) quanto para os demais módulos — dá pra
usar o sistema completo do celular, incluindo abrir o carrinho, finalizar
vendas e cadastrar registros.

## Tema visual configurável (só Administrador)

Em **Configurações → Aparência do Sistema**, um Administrador pode trocar a
cor principal do sistema entre:

- **Coral (padrão)** — azul-marinho e coral
- **Azul e Branco**
- **Vermelho e Branco**
- **Verde e Branco**
- **Personalizada** — escolhe qualquer cor num seletor; o resto da paleta
  (sidebar escura, fundos claros, tom de destaque) é gerado automaticamente
  a partir dela, sem precisar escolher cor por cor.

O tema escolhido é salvo no backend e vale **pra todo mundo que usa o
sistema** (não é uma preferência pessoal de cada navegador) — inclusive na
tela de login, antes mesmo de entrar. Outros cargos veem a nova aparência
normalmente, mas só o Administrador tem acesso à opção de trocar (o botão
nem aparece pros demais).

## Modo claro/escuro (preferência pessoal de cada um)

Em **Configurações → Perfil**, qualquer pessoa (não só Administrador) pode
escolher entre o modo Claro e o Escuro. Diferente do tema de cor acima,
essa escolha é **pessoal**: fica salva só no navegador/aparelho de quem
escolheu, aplica na hora, e não depende do servidor nem afeta o que os
outros usuários veem. A sidebar já é escura em qualquer modo (faz parte da
identidade visual do sistema) — o que muda é o restante da tela: fundo,
cartões, textos e cabeçalho.

## Função e registro profissional em Configurações

A tela de Configurações → Perfil agora mostra a **função (cargo)** da
pessoa dentro da empresa, num destaque visual (só leitura — quem muda isso
é o Administrador, em Usuários). Se a função for **Farmacêutico(a)**,
aparece também um campo para o **registro profissional no CRF** (Conselho
Regional de Farmácia — não confundir com o CRM, que é dos médicos), que
cada farmacêutico preenche por conta própria.

## Cadastro da Empresa (só Administrador)

Em **Administração → Empresa**, um Administrador cadastra os dados da
farmácia: nome fantasia, razão social, CNPJ, inscrição estadual, telefone,
e-mail, endereço completo, responsável técnico (farmacêutico e registro no
CRF) e a logo (upload de imagem, até 500KB). Assim que salvo:

- O **nome e a logo aparecem automaticamente** no menu lateral e na tela de
  login, no lugar da marca padrão "Sistema de Farmácia" — útil se você quiser
  reaproveitar o sistema pra outra farmácia sem editar código.
- Como o tema visual, a leitura desses dados é pública (a tela de login
  precisa mostrar a marca antes do login) e só Administrador pode editar.
- Esse cadastro **não substitui** o registro oficial da empresa na Junta
  Comercial, na Receita Federal ou na ANVISA — é só o que o sistema usa pra
  se identificar nas próprias telas.

### Frontend em React

O frontend foi todo reescrito em **React 18 + Vite + React Router + Framer
Motion**, mantendo a mesma identidade visual (CSS original preservado):

- **Framer Motion** anima as transições entre páginas, os modais (com efeito
  "mola"/spring), os cartões de KPI, as linhas das tabelas (fade-in em
  cascata), o indicador de item ativo na barra lateral e a força da senha no
  cadastro.
- **Recharts** substitui o Chart.js do painel comercial, com um gráfico de
  barras animado das vendas dos últimos 7 dias.
- **React Router** cuida da navegação entre módulos (cada aba é uma rota,
  ex: `/clientes`, `/vendas`, `/financeiro`).
- Um **componente genérico de CRUD** (`CrudModule`) é reaproveitado pelos
  módulos mais simples (Clientes, Prescritores, Fornecedores, Compras,
  Produtos Prontos, Biblioteca, Fórmulas, Agenda, Produção, Insumos, Estoque
  Não Manipulados), evitando duplicação de código. Módulos com fluxos
  próprios (Painel Comercial, Financeiro, Pedidos/Orçamentos, Medicamentos,
  Vendas/PDV, Notificações, Configurações) têm suas próprias páginas.

> ⚠️ Não abra os arquivos `.html` direto clicando duas vezes (`file://`) — o
> navegador bloqueia as chamadas para a API nesse caso. Sempre use o
> `npm run dev` do frontend.
