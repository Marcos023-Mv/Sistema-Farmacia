import React, { lazy, Suspense } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Sidebar from "../components/Sidebar.jsx";
import PageTransition from "../components/PageTransition.jsx";
import RouteGuard from "../components/RouteGuard.jsx";
import { UiProvider, useUi } from "../context/UiContext.jsx";
import { useData } from "../context/DataContext.jsx";
import { Api } from "../api.js";
import { PAGE_TITLES, PAGE_ICONS } from "../navConfig.js";
import "../styles/dashboard.css";

// Cada módulo é carregado sob demanda (code-splitting): o navegador só baixa
// o código de "Vendas" quando o usuário clica em Vendas, por exemplo — em vez
// de baixar o app inteiro (todos os 18 módulos) já na primeira tela.
const ComercialPage = lazy(() => import("./modules/ComercialPage.jsx"));
const OrcamentosPage = lazy(() => import("./modules/OrcamentosPage.jsx"));
const FinanceiroPage = lazy(() => import("./modules/FinanceiroPage.jsx"));
const MedicamentosPage = lazy(() => import("./modules/MedicamentosPage.jsx"));
const VendasPage = lazy(() => import("./modules/VendasPage.jsx"));
const NotificacoesPage = lazy(() => import("./modules/NotificacoesPage.jsx"));
const ConfigPage = lazy(() => import("./modules/ConfigPage.jsx"));
const UsuariosPage = lazy(() => import("./modules/UsuariosPage.jsx"));
const EmpresaPage = lazy(() => import("./modules/EmpresaPage.jsx"));
const EstoqueNaoManipuladosPage = lazy(
  () => import("./modules/EstoqueNaoManipuladosPage.jsx"),
);

const ClientesPage = lazy(() =>
  import("./modules/SimpleModules.jsx").then((m) => ({
    default: m.ClientesPage,
  })),
);
const PrescritoresPage = lazy(() =>
  import("./modules/SimpleModules.jsx").then((m) => ({
    default: m.PrescritoresPage,
  })),
);
const FornecedoresPage = lazy(() =>
  import("./modules/SimpleModules.jsx").then((m) => ({
    default: m.FornecedoresPage,
  })),
);
const ComprasPage = lazy(() =>
  import("./modules/SimpleModules.jsx").then((m) => ({
    default: m.ComprasPage,
  })),
);
const ProdutosProntosPage = lazy(() =>
  import("./modules/SimpleModules.jsx").then((m) => ({
    default: m.ProdutosProntosPage,
  })),
);
const BibliotecaPage = lazy(() =>
  import("./modules/SimpleModules.jsx").then((m) => ({
    default: m.BibliotecaPage,
  })),
);
const FormulasPage = lazy(() =>
  import("./modules/SimpleModules.jsx").then((m) => ({
    default: m.FormulasPage,
  })),
);
const AgendaPage = lazy(() =>
  import("./modules/SimpleModules.jsx").then((m) => ({
    default: m.AgendaPage,
  })),
);
const ProducaoPage = lazy(() =>
  import("./modules/SimpleModules.jsx").then((m) => ({
    default: m.ProducaoPage,
  })),
);
const EstoquePage = lazy(() =>
  import("./modules/SimpleModules.jsx").then((m) => ({
    default: m.EstoquePage,
  })),
);
const PromocoesPage = lazy(() =>
  import("./modules/SimpleModules.jsx").then((m) => ({
    default: m.PromocoesPage,
  })),
);

function CarregandoModulo() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: 60,
        color: "var(--tl)",
        fontSize: 13.5,
      }}
    >
      Carregando módulo...
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<CarregandoModulo />}>
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PageTransition>
                <ComercialPage />
              </PageTransition>
            }
          />
          <Route
            path="/agenda"
            element={
              <PageTransition>
                <RouteGuard recurso="compromissos">
                  <AgendaPage />
                </RouteGuard>
              </PageTransition>
            }
          />
          <Route
            path="/clientes"
            element={
              <PageTransition>
                <RouteGuard recurso="clientes">
                  <ClientesPage />
                </RouteGuard>
              </PageTransition>
            }
          />
          <Route
            path="/prescritores"
            element={
              <PageTransition>
                <RouteGuard recurso="prescritores">
                  <PrescritoresPage />
                </RouteGuard>
              </PageTransition>
            }
          />
          <Route
            path="/orcamentos"
            element={
              <PageTransition>
                <RouteGuard recurso="orcamentos">
                  <OrcamentosPage />
                </RouteGuard>
              </PageTransition>
            }
          />
          <Route
            path="/formulas"
            element={
              <PageTransition>
                <RouteGuard recurso="formulas">
                  <FormulasPage />
                </RouteGuard>
              </PageTransition>
            }
          />
          <Route
            path="/biblioteca"
            element={
              <PageTransition>
                <RouteGuard recurso="biblioteca">
                  <BibliotecaPage />
                </RouteGuard>
              </PageTransition>
            }
          />
          <Route
            path="/medicamentos"
            element={
              <PageTransition>
                <MedicamentosPage />
              </PageTransition>
            }
          />
          <Route
            path="/laboratorio"
            element={
              <PageTransition>
                <RouteGuard recurso="producoes">
                  <ProducaoPage />
                </RouteGuard>
              </PageTransition>
            }
          />
          <Route
            path="/vendas"
            element={
              <PageTransition>
                <RouteGuard recurso="vendas">
                  <VendasPage />
                </RouteGuard>
              </PageTransition>
            }
          />
          <Route
            path="/promocoes"
            element={
              <PageTransition>
                <RouteGuard recurso="promocoes">
                  <PromocoesPage />
                </RouteGuard>
              </PageTransition>
            }
          />
          <Route
            path="/estoque-nao-manipulados"
            element={
              <PageTransition>
                <RouteGuard recurso="produtos-industrializados">
                  <EstoqueNaoManipuladosPage />
                </RouteGuard>
              </PageTransition>
            }
          />
          <Route
            path="/estoque"
            element={
              <PageTransition>
                <RouteGuard recurso="pedidos">
                  <EstoquePage />
                </RouteGuard>
              </PageTransition>
            }
          />
          <Route
            path="/produtos-prontos"
            element={
              <PageTransition>
                <RouteGuard recurso="produtos-prontos">
                  <ProdutosProntosPage />
                </RouteGuard>
              </PageTransition>
            }
          />
          <Route
            path="/compras"
            element={
              <PageTransition>
                <RouteGuard recurso="compras">
                  <ComprasPage />
                </RouteGuard>
              </PageTransition>
            }
          />
          <Route
            path="/fornecedores"
            element={
              <PageTransition>
                <RouteGuard recurso="fornecedores">
                  <FornecedoresPage />
                </RouteGuard>
              </PageTransition>
            }
          />
          <Route
            path="/financeiro"
            element={
              <PageTransition>
                <RouteGuard recurso="lancamentos">
                  <FinanceiroPage />
                </RouteGuard>
              </PageTransition>
            }
          />
          <Route
            path="/notificacoes"
            element={
              <PageTransition>
                <NotificacoesPage />
              </PageTransition>
            }
          />
          <Route
            path="/config"
            element={
              <PageTransition>
                <ConfigPage />
              </PageTransition>
            }
          />
          <Route
            path="/usuarios"
            element={
              <PageTransition>
                <RouteGuard adminOnly>
                  <UsuariosPage />
                </RouteGuard>
              </PageTransition>
            }
          />
          <Route
            path="/empresa"
            element={
              <PageTransition>
                <RouteGuard adminOnly>
                  <EmpresaPage />
                </RouteGuard>
              </PageTransition>
            }
          />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data, usuario } = useData();
  const { abrirSidebar } = useUi();
  const titulo = PAGE_TITLES[location.pathname] || "Sistema de Farmácia";
  const icone = PAGE_ICONS[location.pathname] || "storefront";
  const naoLidas = data.notificacoes.filter((n) => !n.lida).length;
  const iniciais = usuario
    ? (usuario.nome?.[0] || "") + (usuario.sobrenome?.[0] || "")
    : "MP";

  function sair() {
    Api.encerrarSessao();
    navigate("/login", { replace: true });
  }

  return (
    <header className="hdr">
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          className="hamburger-btn"
          onClick={abrirSidebar}
          aria-label="Abrir menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <span className="hdr-icon material-symbols-outlined">{icone}</span>
        <h1>{titulo}</h1>
      </div>
      <div className="hdr-right">
        <div className="search">
          <span className="material-symbols-outlined">search</span>
          <input type="text" placeholder="Buscar produto, cliente..." />
        </div>
        <div
          className="notif"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/notificacoes")}
          title="Notificações"
        >
          <span className="material-symbols-outlined">notifications</span>
          <div className="notif-badge">{naoLidas}</div>
        </div>
        <div
          className="avatar"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/config")}
          title="Configurações"
        >
          {iniciais.toUpperCase() || "MP"}
        </div>
        <button className="btn-sair" onClick={sair}>
          <span className="material-symbols-outlined">logout</span>
          <span className="btn-sair-label">Sair</span>
        </button>
      </div>
    </header>
  );
}

function LoadingScreen() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        width: "100%",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        className="material-symbols-outlined"
        style={{ fontSize: 40, color: "var(--g, #e34d3f)" }}
      >
        stethoscope
      </div>
      <div style={{ color: "var(--tl, #8898aa)", fontSize: 14 }}>
        Carregando Sistema de Farmácia...
      </div>
    </div>
  );
}

function DashboardShell() {
  const { loading } = useData();
  const { sidebarColapsada } = useUi();
  return (
    <div
      className={
        "dashboard-shell" + (sidebarColapsada ? " sidebar-colapsada" : "")
      }
    >
      <Sidebar />
      <div className="main">
        <Header />
        <div className="content">
          {loading ? <LoadingScreen /> : <AnimatedRoutes />}
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  return (
    <UiProvider>
      <DashboardShell />
    </UiProvider>
  );
}
