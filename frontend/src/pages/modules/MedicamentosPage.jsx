import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Api } from "../../api.js";
import KpiCard from "../../components/KpiCard.jsx";

export default function MedicamentosPage() {
  const navigate = useNavigate();
  const [aba, setAba] = useState("manipulado");
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState([]);
  const [aviso, setAviso] = useState("");
  const [kpiManip, setKpiManip] = useState(0);
  const [kpiIndust, setKpiIndust] = useState(0);
  const [carregando, setCarregando] = useState(false);

  async function atualizarKpis() {
    try {
      const [m, i] = await Promise.all([
        Api.get("/medicamentos?tipo=manipulado"),
        Api.get("/medicamentos?tipo=industrializado"),
      ]);
      setKpiManip(m.length);
      setKpiIndust(i.length);
    } catch {}
  }

  async function buscar(tipoAtual = aba, termo = busca) {
    setAviso("");
    setCarregando(true);
    try {
      if (tipoAtual === "manipulado") {
        const qs = termo
          ? `?tipo=manipulado&q=${encodeURIComponent(termo)}`
          : "?tipo=manipulado";
        setResultados(await Api.get("/medicamentos" + qs));
      } else {
        if (termo.trim().length < 2) {
          setResultados(await Api.get("/medicamentos?tipo=industrializado"));
          setAviso(
            "Digite ao menos 2 letras e clique em Buscar para consultar a ANVISA/CMED.",
          );
          return;
        }
        try {
          const resp = await Api.post("/medicamentos/importar", {
            nome: termo,
          });
          setResultados(
            (resp.resultados || []).map((m) => ({
              nome: m.nome,
              principio_ativo: m.principioAtivo,
              categoria: m.categoria,
              fabricante: m.fabricante,
              registro_anvisa: m.registro,
            })),
          );
        } catch (e) {
          setAviso(e.mensagem || e.message);
          try {
            setResultados(
              await Api.get(
                `/medicamentos?tipo=industrializado&q=${encodeURIComponent(termo)}`,
              ),
            );
          } catch {
            setResultados([]);
          }
        }
      }
    } finally {
      setCarregando(false);
      atualizarKpis();
    }
  }

  useEffect(() => {
    buscar("manipulado", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function trocarAba(tipo) {
    setAba(tipo);
    setBusca("");
    setAviso("");
    buscar(tipo, "");
  }

  function usarEmFormula(produto) {
    navigate("/formulas", { state: { nomeSugerido: produto.nome } });
  }

  function usarNoEstoque(produto) {
    navigate("/estoque-nao-manipulados", {
      state: {
        produtoSugerido: {
          nome: produto.nome,
          principioAtivo: produto.principio_ativo || "",
          categoria: produto.categoria || "",
          fabricante: produto.fabricante || "",
          registroAnvisa: produto.registro_anvisa || "",
        },
      },
    });
  }

  return (
    <div>
      <div className="sec-title">Medicamentos</div>
      <div className="sec-sub">
        Catálogo de insumos de manipulação e medicamentos industrializados
        (ANVISA/CMED)
      </div>
      <div className="gold-line"></div>

      <div className="grid g3" style={{ marginBottom: 20 }}>
        <KpiCard
          label="Manipulados no catálogo"
          value={kpiManip}
          icon="biotech"
          sub="Insumos de referência"
        />
        <KpiCard
          label="Industrializados em cache"
          value={kpiIndust}
          icon="medication"
          sub="Consultados na ANVISA/CMED"
          variant="gold"
          delay={0.05}
        />
        <KpiCard
          label="Fonte dos dados"
          value="ANVISA / CMED"
          icon="public"
          sub="via medicamentos.api.br"
          variant="red"
          delay={0.1}
        />
      </div>

      <div className="tc">
        <div className="tc-hdr">
          <div>
            <div className="cc-title">Buscar Medicamentos</div>
            <div className="cc-sub">
              Manipulados: busca no catálogo interno. Industrializados: busca
              online e salva no cache.
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            paddingBottom: 16,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <motion.button
              className={"btn " + (aba === "manipulado" ? "btn-p" : "btn-o")}
              onClick={() => trocarAba("manipulado")}
              whileTap={{ scale: 0.96 }}
            >
              <span className="material-symbols-outlined">biotech</span>{" "}
              Manipulados
            </motion.button>
            <motion.button
              className={
                "btn " + (aba === "industrializado" ? "btn-p" : "btn-o")
              }
              onClick={() => trocarAba("industrializado")}
              whileTap={{ scale: 0.96 }}
            >
              <span className="material-symbols-outlined">medication</span> Não
              manipulados
            </motion.button>
          </div>
          <input
            type="text"
            className="search-input"
            style={{
              flex: 1,
              minWidth: 220,
              padding: "10px 13px",
              border: "1.5px solid var(--border)",
              borderRadius: 8,
              fontSize: 13,
            }}
            placeholder={
              aba === "manipulado"
                ? "Buscar insumo, princípio ativo ou categoria..."
                : "Digite o nome e clique em Buscar (ex: dipirona)..."
            }
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscar()}
          />
          <motion.button
            className="btn btn-p"
            onClick={() => buscar()}
            whileTap={{ scale: 0.96 }}
          >
            <span className="material-symbols-outlined">search</span> Buscar
          </motion.button>
        </div>

        {aviso && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--err)",
              background: "#fdeeee",
              border: "1px solid #f4c7c7",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 14,
              fontSize: 13.5,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18 }}
            >
              warning
            </span>{" "}
            {aviso}
          </div>
        )}

        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Princípio ativo</th>
              <th>Categoria</th>
              <th>Fabricante / Forma</th>
              <th>Registro ANVISA</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {!carregando && resultados.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    textAlign: "center",
                    color: "var(--tl)",
                    padding: 24,
                  }}
                >
                  Nenhum medicamento encontrado.
                </td>
              </tr>
            )}
            <AnimatePresence>
              {resultados.map((m, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                >
                  <td>
                    <b>{m.nome}</b>
                  </td>
                  <td>{m.principio_ativo || "-"}</td>
                  <td>{m.categoria || "-"}</td>
                  <td>{m.fabricante || m.forma_farmaceutica || "-"}</td>
                  <td>{m.registro_anvisa || "-"}</td>
                  <td>
                    {aba === "manipulado" ? (
                      <button
                        className="btn btn-o"
                        style={{ padding: "6px 10px", fontSize: 12 }}
                        onClick={() => usarEmFormula(m)}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 16 }}
                        >
                          add_circle
                        </span>{" "}
                        Nova fórmula
                      </button>
                    ) : (
                      <button
                        className="btn btn-o"
                        style={{ padding: "6px 10px", fontSize: 12 }}
                        onClick={() => usarNoEstoque(m)}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 16 }}
                        >
                          inventory_2
                        </span>{" "}
                        Adicionar ao estoque
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
