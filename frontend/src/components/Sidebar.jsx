import React from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { NAV_GROUPS } from "../navConfig.js";
import { useData } from "../context/DataContext.jsx";
import { podeAcessar, ehAdministrador } from "../permissions.js";
import { useUi } from "../context/UiContext.jsx";

export default function Sidebar() {
  const { usuario, empresa } = useData();
  const cargo = usuario?.cargo;
  const { sidebarAberta, fecharSidebar, sidebarColapsada, alternarColapso } =
    useUi();
  const nomeMarca = empresa?.nomeFantasia?.trim();

  return (
    <>
      <AnimatePresence>
        {sidebarAberta && (
          <motion.div
            className="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={fecharSidebar}
          />
        )}
      </AnimatePresence>
      <aside
        className={
          "sidebar" +
          (sidebarAberta ? " open" : "") +
          (sidebarColapsada ? " collapsed" : "")
        }
      >
        <button
          className="sidebar-collapse-btn"
          onClick={alternarColapso}
          aria-label={sidebarColapsada ? "Expandir menu" : "Recolher menu"}
          title={sidebarColapsada ? "Expandir menu" : "Recolher menu"}
        >
          <span className="material-symbols-outlined">
            keyboard_double_arrow_left
          </span>
        </button>
        <div className="logo">
          <div className="logo-box">
            <div className="logo-icon">
              {empresa?.logo ? (
                <img
                  src={empresa.logo}
                  alt={nomeMarca || "Logo"}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    borderRadius: 11,
                  }}
                />
              ) : (
                <span className="material-symbols-outlined">stethoscope</span>
              )}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div
                className="logo-title"
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {nomeMarca || "Sistema"}
              </div>
              <div className="logo-sub">
                {nomeMarca ? "Sistema de Gestão" : "Farmácia"}
              </div>
            </div>
          </div>
          <button
            className="sidebar-close-mobile"
            onClick={fecharSidebar}
            aria-label="Fechar menu"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {cargo && (
          <div className="sidebar-cargo" title={cargo}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 15 }}
            >
              badge
            </span>
            <span className="sidebar-cargo-label">{cargo}</span>
          </div>
        )}
        <nav className="nav">
          {NAV_GROUPS.map((grupo) => {
            if (grupo.adminOnly && !ehAdministrador(cargo)) return null;
            const itensVisiveis = grupo.items.filter((item) =>
              item.adminOnly
                ? ehAdministrador(cargo)
                : podeAcessar(cargo, item.recurso),
            );
            if (itensVisiveis.length === 0) return null;

            return (
              <React.Fragment key={grupo.label}>
                <div className="nav-group-label">{grupo.label}</div>
                {itensVisiveis.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/"}
                    className={({ isActive }) =>
                      "nav-item" + (isActive ? " active" : "")
                    }
                    onClick={fecharSidebar}
                    title={item.label}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.div
                            layoutId="nav-active-pill"
                            className="nav-active-pill"
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 40,
                            }}
                          />
                        )}
                        <span className="nav-icon">
                          <span className="material-symbols-outlined">
                            {item.icon}
                          </span>
                        </span>
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </React.Fragment>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <span className="sidebar-footer-label">
            {nomeMarca || "Sistema de Farmácia"} &copy; 2026
          </span>
        </div>
      </aside>
    </>
  );
}
