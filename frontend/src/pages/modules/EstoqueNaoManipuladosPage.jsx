import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useData } from "../../context/DataContext.jsx";
import { useUi } from "../../context/UiContext.jsx";
import KpiCard from "../../components/KpiCard.jsx";
import Modal from "../../components/Modal.jsx";
import ValidadeBadge from "../../components/ValidadeBadge.jsx";
import { fmtMoedaBR, parseMoedaBR, diasParaVencer } from "../../api.js";

const CATEGORIAS = [
  "Analgésico",
  "Antitérmico",
  "Anti-inflamatório",
  "Antialérgico",
  "Vitaminas/Suplementos",
  "Higiene/Dermocosmético",
  "Outros",
];

export default function EstoqueNaoManipuladosPage() {
  const { data, criar, remover } = useData();
  const { showSuccess } = useUi();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aba, setAba] = useState("estoque"); // 'estoque' | 'abc' | 'compra'

  const lista = data.produtosIndustrializados;

  // Se a pessoa veio da tela de Medicamentos (catálogo ANVISA/CMED) clicando
  // em "Adicionar ao estoque", já abre o formulário com nome, princípio
  // ativo, categoria, fabricante e registro preenchidos — só falta preço,
  // quantidade, lote e validade, que são específicos de cada compra.
  useEffect(() => {
    const sugerido = location.state?.produtoSugerido;
    if (sugerido) {
      setForm({ estoqueMinimo: "5", ...sugerido });
      setErro("");
      setOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  function abrir() {
    setForm({ estoqueMinimo: "5" });
    setErro("");
    setOpen(true);
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.nome || !form.fabricante || !form.preco || !form.estoque) {
      setErro("⚠️ Preencha todos os campos obrigatórios.");
      return;
    }
    setEnviando(true);
    try {
      const [a, m, d] = (form.validade || "").split("-");
      await criar("produtosIndustrializados", {
        nome: form.nome,
        principioAtivo: form.principioAtivo || "",
        categoria: form.categoria || "",
        fabricante: form.fabricante,
        registroAnvisa: form.registroAnvisa || "",
        codigoBarras: form.codigoBarras || "",
        lote: form.lote || "",
        validade: form.validade ? `${d}/${m}/${a}` : "",
        preco: parseMoedaBR(form.preco),
        estoque: parseInt(form.estoque) || 0,
        estoqueMinimo: parseInt(form.estoqueMinimo) || 5,
      });
      setOpen(false);
      showSuccess(
        "💊",
        "Produto Cadastrado!",
        "O produto foi adicionado ao estoque de não manipulados.",
      );
    } catch (err) {
      setErro("❌ " + err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function excluir(item) {
    try {
      await remover("produtosIndustrializados", item.id);
    } catch (err) {
      showSuccess("⚠️", "Não foi possível excluir", err.message);
    }
  }

  const vencendoOuVencidos = lista.filter((p) => {
    const d = diasParaVencer(p.validade);
    return d !== null && d <= 30;
  }).length;
  const estoqueBaixo = lista.filter(
    (p) => (Number(p.estoque) || 0) <= (Number(p.estoqueMinimo) || 5),
  );

  // Curva ABC: classifica produtos pela receita gerada (soma de qtd*preçoUnit
  // vendida), do maior pro menor. A = ~80% da receita acumulada, B = próximos
  // ~15%, C = os ~5% finais. É o jeito clássico de descobrir quais produtos
  // realmente sustentam o caixa da farmácia.
  const curvaABC = useMemo(() => {
    const receitaPorProduto = {};
    for (const venda of data.vendas) {
      for (const item of venda.itens || []) {
        receitaPorProduto[item.produtoId] =
          (receitaPorProduto[item.produtoId] || 0) + item.qtd * item.precoUnit;
      }
    }
    const linhas = lista
      .map((p) => ({ produto: p, receita: receitaPorProduto[p.id] || 0 }))
      .sort((a, b) => b.receita - a.receita);

    const receitaTotal = linhas.reduce((s, l) => s + l.receita, 0) || 1;
    let acumulado = 0;
    return linhas.map((l) => {
      acumulado += l.receita;
      const pctAcumulado = (acumulado / receitaTotal) * 100;
      const classe =
        l.receita === 0
          ? "-"
          : pctAcumulado <= 80
            ? "A"
            : pctAcumulado <= 95
              ? "B"
              : "C";
      return { ...l, pctAcumulado, classe };
    });
  }, [lista, data.vendas]);

  return (
    <div>
      <div className="sec-title">Estoque Não Manipulados</div>
      <div className="sec-sub">
        Produtos industrializados/OTC vendidos prontos, sem manipulação
      </div>
      <div className="gold-line"></div>

      <div className="grid g4" style={{ marginBottom: 20 }}>
        <KpiCard
          label="Produtos cadastrados"
          value={lista.length}
          icon="local_pharmacy"
          sub="Itens no catálogo"
        />
        <KpiCard
          label="Unidades em estoque"
          value={lista.reduce((s, p) => s + (Number(p.estoque) || 0), 0)}
          icon="inventory_2"
          sub="Somatório"
          variant="gold"
          delay={0.05}
        />
        <KpiCard
          label="Estoque baixo"
          value={estoqueBaixo.length}
          icon="warning"
          sub="Abaixo do mínimo"
          variant="red"
          delay={0.1}
        />
        <KpiCard
          label="Vencendo / vencidos"
          value={vencendoOuVencidos}
          icon="schedule"
          sub="Nos próximos 30 dias"
          variant="red"
          delay={0.15}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          className={"btn " + (aba === "estoque" ? "btn-p" : "btn-o")}
          onClick={() => setAba("estoque")}
        >
          <span className="material-symbols-outlined">inventory_2</span> Estoque
        </button>
        <button
          className={"btn " + (aba === "abc" ? "btn-p" : "btn-o")}
          onClick={() => setAba("abc")}
        >
          <span className="material-symbols-outlined">bar_chart</span> Curva ABC
        </button>
        <button
          className={"btn " + (aba === "compra" ? "btn-p" : "btn-o")}
          onClick={() => setAba("compra")}
        >
          <span className="material-symbols-outlined">shopping_cart</span>{" "}
          Sugestão de Compra
          {estoqueBaixo.length > 0 && (
            <span className="badge-count">{estoqueBaixo.length}</span>
          )}
        </button>
      </div>

      {aba === "estoque" && (
        <div className="tc">
          <div className="tc-hdr">
            <div>
              <div className="cc-title">Catálogo de Produtos</div>
              <div className="cc-sub">{lista.length} registro(s)</div>
            </div>
            <motion.button
              className="btn btn-p"
              onClick={abrir}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="material-symbols-outlined">add_circle</span> Novo
              Produto
            </motion.button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Código de barras</th>
                <th>Lote</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Estoque</th>
                <th>Validade</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      color: "var(--tl)",
                      padding: 24,
                    }}
                  >
                    Nenhum produto cadastrado.
                  </td>
                </tr>
              )}
              <AnimatePresence>
                {lista.map((p, i) => {
                  const baixo =
                    (Number(p.estoque) || 0) <= (Number(p.estoqueMinimo) || 5);
                  return (
                    <motion.tr
                      key={p.id ?? i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    >
                      <td>
                        <b>{p.nome}</b>
                        <div style={{ fontSize: 11, color: "var(--tl)" }}>
                          {p.principioAtivo}
                        </div>
                      </td>
                      <td>{p.codigoBarras || "-"}</td>
                      <td>{p.lote || "-"}</td>
                      <td>{p.categoria || "-"}</td>
                      <td>{fmtMoedaBR(p.preco)}</td>
                      <td>
                        {baixo ? (
                          <span
                            style={{ color: "var(--err)", fontWeight: 700 }}
                          >
                            {p.estoque}
                          </span>
                        ) : (
                          p.estoque
                        )}
                      </td>
                      <td>
                        <ValidadeBadge data={p.validade} />
                      </td>
                      <td>
                        <button
                          className="btn btn-o"
                          style={{ padding: "6px 10px", fontSize: 12 }}
                          onClick={() => excluir(p)}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 16 }}
                          >
                            delete
                          </span>
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {aba === "abc" && (
        <div className="tc">
          <div className="tc-hdr">
            <div>
              <div className="cc-title">Curva ABC de Produtos</div>
              <div className="cc-sub">
                Classifica os produtos por quanto de receita cada um gera — A =
                essenciais, C = pouco relevantes
              </div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Receita gerada</th>
                <th>% acumulado</th>
                <th>Classe</th>
              </tr>
            </thead>
            <tbody>
              {curvaABC.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      textAlign: "center",
                      color: "var(--tl)",
                      padding: 24,
                    }}
                  >
                    Nenhum produto cadastrado.
                  </td>
                </tr>
              )}
              {curvaABC.map((l) => (
                <tr key={l.produto.id}>
                  <td>
                    <b>{l.produto.nome}</b>
                  </td>
                  <td>{fmtMoedaBR(l.receita)}</td>
                  <td>
                    {l.receita > 0 ? l.pctAcumulado.toFixed(1) + "%" : "-"}
                  </td>
                  <td>
                    {l.classe !== "-" && (
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 11.5,
                          fontWeight: 800,
                          color: "#fff",
                          background:
                            l.classe === "A"
                              ? "#38a169"
                              : l.classe === "B"
                                ? "#dd6b20"
                                : "#718096",
                        }}
                      >
                        {l.classe}
                      </span>
                    )}
                    {l.classe === "-" && (
                      <span style={{ color: "var(--tl)" }}>Sem vendas</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {aba === "compra" && (
        <div className="tc">
          <div className="tc-hdr">
            <div>
              <div className="cc-title">Sugestão de Compra</div>
              <div className="cc-sub">
                Produtos no estoque mínimo ou abaixo dele
              </div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Estoque atual</th>
                <th>Estoque mínimo</th>
                <th>Sugestão de reposição</th>
              </tr>
            </thead>
            <tbody>
              {estoqueBaixo.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      textAlign: "center",
                      color: "var(--tl)",
                      padding: 24,
                    }}
                  >
                    Nenhum produto abaixo do estoque mínimo. 🎉
                  </td>
                </tr>
              )}
              {estoqueBaixo.map((p) => {
                const minimo = Number(p.estoqueMinimo) || 5;
                const sugestao = Math.max(
                  minimo * 3 - (Number(p.estoque) || 0),
                  minimo,
                );
                return (
                  <tr key={p.id}>
                    <td>
                      <b>{p.nome}</b>
                    </td>
                    <td style={{ color: "var(--err)", fontWeight: 700 }}>
                      {p.estoque}
                    </td>
                    <td>{minimo}</td>
                    <td>{sugestao} unidades</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Novo Produto Não Manipulado"
        icon="local_pharmacy"
        subtitle="Cadastre um medicamento industrializado para venda no balcão"
        actions={
          <>
            <button className="btn btn-o" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-p" disabled={enviando} onClick={salvar}>
              <span className="material-symbols-outlined">check</span>{" "}
              {enviando ? "Salvando..." : "Salvar Produto"}
            </button>
          </>
        }
      >
        {erro && (
          <div className="modal-alert-err show">
            <span className="material-symbols-outlined">warning</span> {erro}
          </div>
        )}
        <form onSubmit={salvar}>
          <div className="modal-field">
            <label>
              Nome do produto<span>*</span>
            </label>
            <input
              value={form.nome || ""}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Dipirona 500mg 20cp"
            />
          </div>
          <div className="modal-row2">
            <div className="modal-field">
              <label>Princípio ativo</label>
              <input
                value={form.principioAtivo || ""}
                onChange={(e) =>
                  setForm({ ...form, principioAtivo: e.target.value })
                }
                placeholder="Ex: Dipirona sódica"
              />
            </div>
            <div className="modal-field">
              <label>Categoria</label>
              <select
                value={form.categoria || ""}
                onChange={(e) =>
                  setForm({ ...form, categoria: e.target.value })
                }
              >
                <option value="" disabled>
                  Selecione
                </option>
                {CATEGORIAS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-row2">
            <div className="modal-field">
              <label>
                Fabricante<span>*</span>
              </label>
              <input
                value={form.fabricante || ""}
                onChange={(e) =>
                  setForm({ ...form, fabricante: e.target.value })
                }
                placeholder="Ex: EMS, Medley"
              />
            </div>
            <div className="modal-field">
              <label>Registro ANVISA</label>
              <input
                value={form.registroAnvisa || ""}
                onChange={(e) =>
                  setForm({ ...form, registroAnvisa: e.target.value })
                }
                placeholder="Opcional"
              />
            </div>
          </div>
          <div className="modal-row2">
            <div className="modal-field">
              <label>Código de barras</label>
              <input
                value={form.codigoBarras || ""}
                onChange={(e) =>
                  setForm({ ...form, codigoBarras: e.target.value })
                }
                placeholder="Escaneie ou digite o EAN"
              />
            </div>
            <div className="modal-field">
              <label>Lote</label>
              <input
                value={form.lote || ""}
                onChange={(e) => setForm({ ...form, lote: e.target.value })}
                placeholder="Ex: L2026-08"
              />
            </div>
          </div>
          <div className="modal-row2">
            <div className="modal-field">
              <label>Validade</label>
              <input
                type="date"
                value={form.validade || ""}
                onChange={(e) => setForm({ ...form, validade: e.target.value })}
              />
            </div>
            <div className="modal-field">
              <label>
                Preço de venda (R$)<span>*</span>
              </label>
              <input
                value={form.preco || ""}
                onChange={(e) => setForm({ ...form, preco: e.target.value })}
                placeholder="Ex: 12,50"
              />
            </div>
          </div>
          <div className="modal-row2">
            <div className="modal-field">
              <label>
                Quantidade em estoque<span>*</span>
              </label>
              <input
                type="number"
                min="0"
                value={form.estoque || ""}
                onChange={(e) => setForm({ ...form, estoque: e.target.value })}
                placeholder="Ex: 30"
              />
            </div>
            <div className="modal-field">
              <label>Estoque mínimo</label>
              <input
                type="number"
                min="0"
                value={form.estoqueMinimo || ""}
                onChange={(e) =>
                  setForm({ ...form, estoqueMinimo: e.target.value })
                }
                placeholder="Ex: 5"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
