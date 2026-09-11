import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "../../context/DataContext.jsx";

export default function NotificacoesPage() {
  const { data, atualizar } = useData();
  const lista = data.notificacoes;

  async function marcarLida(n) {
    if (n.lida) return;
    await atualizar("notificacoes", n.id, { ...n, lida: true });
  }

  return (
    <div>
      <div className="sec-title">Notificações</div>
      <div className="sec-sub">Avisos e alertas do sistema</div>
      <div className="gold-line"></div>

      <div className="tc">
        <div className="tc-hdr">
          <div>
            <div className="cc-title">Central de Notificações</div>
            <div className="cc-sub">
              {lista.filter((n) => !n.lida).length} não lida(s)
            </div>
          </div>
        </div>
        {lista.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--tl)", padding: 32 }}>
            Nenhuma notificação por aqui.
          </div>
        ) : (
          <AnimatePresence>
            {lista.map((n, i) => (
              <motion.div
                key={n.id ?? i}
                onClick={() => marcarLida(n)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  padding: "14px 4px",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  background: n.lida ? "transparent" : "rgba(201,168,76,0.06)",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ color: n.lida ? "var(--tl)" : "var(--g)" }}
                >
                  {n.lida ? "notifications" : "notifications_active"}
                </span>
                <div>
                  <div
                    style={{ fontWeight: n.lida ? 500 : 700, fontSize: 13.5 }}
                  >
                    {n.titulo || n.mensagem || "Notificação"}
                  </div>
                  {n.detalhe && (
                    <div style={{ fontSize: 12, color: "var(--tl)" }}>
                      {n.detalhe}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
