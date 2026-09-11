import React, { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Api } from "./api.js";
import { aplicarTema, aplicarModo, lerModoSalvo } from "./temas.js";
import { DataProvider } from "./context/DataContext.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import DashboardLayout from "./pages/DashboardLayout.jsx";

function RequireAuth({ children }) {
  if (!Api.estaLogado()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  // Busca o tema visual escolhido pelo administrador assim que o app abre —
  // roda uma vez só, antes de saber se a pessoa está logada ou não, pra
  // valer tanto na tela de login quanto no painel depois.
  useEffect(() => {
    Api.getConfig()
      .then((cfg) => aplicarTema(cfg?.tema, cfg?.corPersonalizada))
      .catch(() => {
        /* backend fora do ar ou sem config ainda — mantém o tema padrão do CSS */
      });
    // Modo claro/escuro é uma preferência pessoal salva no navegador — não
    // depende do backend, então aplica na hora, sem esperar nada.
    aplicarModo(lerModoSalvo());
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <DataProvider>
              <DashboardLayout />
            </DataProvider>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
