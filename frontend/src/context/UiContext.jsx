import React, { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const UiContext = createContext(null);

const CHAVE_COLAPSO = "af_sidebar_colapsada";

export function UiProvider({ children }) {
  const [toast, setToast] = useState(null);
  // Menu lateral em telas de celular: fica escondido (fora da tela) por
  // padrão e abre como uma gaveta por cima do conteúdo ao tocar no ícone
  // de menu (hambúrguer) no cabeçalho.
  const [sidebarAberta, setSidebarAberta] = useState(false);
  // Menu lateral recolhível (desktop/tablet): fica só com os ícones quando
  // colapsado, pra sobrar mais espaço de tela. A preferência fica salva no
  // navegador, então continua do jeito que a pessoa deixou da última vez.
  const [sidebarColapsada, setSidebarColapsada] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_COLAPSO) === "1";
    } catch {
      return false;
    }
  });

  const showSuccess = useCallback((icon, title, msg) => {
    setToast({ icon, title, msg });
  }, []);
  const abrirSidebar = useCallback(() => setSidebarAberta(true), []);
  const fecharSidebar = useCallback(() => setSidebarAberta(false), []);
  const alternarColapso = useCallback(() => {
    setSidebarColapsada((atual) => {
      const novo = !atual;
      try {
        localStorage.setItem(CHAVE_COLAPSO, novo ? "1" : "0");
      } catch {
        /* localStorage indisponível (modo privado etc.) — segue só em memória */
      }
      return novo;
    });
  }, []);

  return (
    <UiContext.Provider
      value={{
        showSuccess,
        sidebarAberta,
        abrirSidebar,
        fecharSidebar,
        sidebarColapsada,
        alternarColapso,
      }}
    >
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="modal-overlay show"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setToast(null)}
          >
            <motion.div
              className="modal-box"
              style={{ textAlign: "center", maxWidth: 380 }}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
            >
              <motion.div
                style={{ fontSize: 48, marginBottom: 14 }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  delay: 0.1,
                  type: "spring",
                  stiffness: 400,
                  damping: 15,
                }}
              >
                {toast.icon}
              </motion.div>
              <div
                className="modal-title"
                style={{ textAlign: "center", marginBottom: 8 }}
              >
                {toast.title}
              </div>
              <div
                className="modal-sub"
                style={{ textAlign: "center", marginBottom: 20 }}
              >
                {toast.msg}
              </div>
              <button
                className="btn btn-p"
                style={{ width: "100%" }}
                onClick={() => setToast(null)}
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </UiContext.Provider>
  );
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useUi precisa estar dentro de <UiProvider>");
  return ctx;
}
