import React from "react";
import { motion } from "framer-motion";
import { useData } from "../context/DataContext.jsx";
import { podeAcessar, ehAdministrador } from "../permissions.js";

function AcessoNegado() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ textAlign: "center", padding: "80px 20px", color: "var(--tl)" }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 52, color: "var(--err)" }}
      >
        block
      </span>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "var(--td)",
          marginTop: 12,
        }}
      >
        Acesso não permitido
      </div>
      <div style={{ fontSize: 13.5, marginTop: 6 }}>
        Seu cargo não tem acesso a este módulo. Fale com um administrador se
        precisar dele.
      </div>
    </motion.div>
  );
}

/**
 * Envolve uma página e só a renderiza se o cargo do usuário logado tiver
 * permissão para o recurso indicado. Isso é só uma camada de UX — a
 * segurança de verdade é sempre aplicada pelo backend em cada requisição.
 */
export default function RouteGuard({ recurso, adminOnly = false, children }) {
  const { usuario } = useData();
  const cargo = usuario?.cargo;

  const permitido = adminOnly
    ? ehAdministrador(cargo)
    : podeAcessar(cargo, recurso);
  if (!permitido) return <AcessoNegado />;
  return children;
}
