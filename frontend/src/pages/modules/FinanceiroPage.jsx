import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useData } from "../../context/DataContext.jsx";
import { useUi } from "../../context/UiContext.jsx";
import KpiCard from "../../components/KpiCard.jsx";
import Modal from "../../components/Modal.jsx";
import { fmtMoedaBR, parseMoedaBR, parseDataBR, hoje } from "../../api.js";

const CATEGORIAS = [
  "Matérias-primas",
  "Embalagens",
  "Equipamentos",
  "Serviços",
  "Salários",
  "Aluguel",
  "Vendas",
  "Outros",
];
const MESES_PT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

// Extrai {ano, mes, chave} de uma data "dd/mm/aaaa" (formato usado em todo
// o sistema). "chave" serve pra agrupar/ordenar (ex: "2026-09").
function anoMes(dataBR) {
  const d = parseDataBR(dataBR);
  if (!d) return null;
  const ano = d.getFullYear();
  const mes = d.getMonth() + 1;
  return {
    ano,
    mes,
    chave: `${ano}-${String(mes).padStart(2, "0")}`,
    label: `${MESES_PT[mes - 1]}/${ano}`,
  };
}

export default function FinanceiroPage() {
  const { data, criar } = useData();
  const { showSuccess } = useUi();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("rec");
  const [form, setForm] = useState({
    fornecedor: "",
    categoria: "",
    descricao: "",
    valor: "",
    vencimento: "",
  });
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aba, setAba] = useState("lancamentos");

  const receitas = data.lancamentos.filter((l) => l.tipo === "rec");
  const despesas = data.lancamentos.filter((l) => l.tipo === "des");
  const totalReceitas = receitas.reduce(
    (s, l) => s + (Number(l.valor) || 0),
    0,
  );
  const totalDespesas = despesas.reduce(
    (s, l) => s + (Number(l.valor) || 0),
    0,
  );
  const saldo = totalReceitas - totalDespesas;

  // Lista de meses com pelo menos um lançamento, do mais recente pro mais
  // antigo — usada tanto pro seletor da DRE quanto como eixo do fluxo de caixa.
  const mesesComLancamento = useMemo(() => {
    const porChave = new Map();
    for (const l of data.lancamentos) {
      const am = anoMes(l.vencimento);
      if (am && !porChave.has(am.chave)) porChave.set(am.chave, am);
    }
    return [...porChave.values()].sort((a, b) => (a.chave < b.chave ? 1 : -1));
  }, [data.lancamentos]);

  const [mesDre, setMesDre] = useState("");
  const mesDreAtual = mesDre || mesesComLancamento[0]?.chave || "";

  const dre = useMemo(() => {
    const lancsDoMes = data.lancamentos.filter(
      (l) => anoMes(l.vencimento)?.chave === mesDreAtual,
    );
    const receitaBruta = lancsDoMes
      .filter((l) => l.tipo === "rec")
      .reduce((s, l) => s + (Number(l.valor) || 0), 0);
    const despesasDoMes = lancsDoMes.filter((l) => l.tipo === "des");
    const porCategoria = new Map();
    for (const d of despesasDoMes) {
      porCategoria.set(
        d.categoria || "Outros",
        (porCategoria.get(d.categoria || "Outros") || 0) +
          (Number(d.valor) || 0),
      );
    }
    const totalDespesasMes = despesasDoMes.reduce(
      (s, l) => s + (Number(l.valor) || 0),
      0,
    );
    const resultado = receitaBruta - totalDespesasMes;
    const margem = receitaBruta > 0 ? (resultado / receitaBruta) * 100 : 0;
    return {
      receitaBruta,
      categorias: [...porCategoria.entries()].sort((a, b) => b[1] - a[1]),
      totalDespesasMes,
      resultado,
      margem,
    };
  }, [data.lancamentos, mesDreAtual]);

  // Fluxo de caixa: entradas, saídas e saldo acumulado mês a mês, do mais
  // antigo pro mais recente (ordem natural de leitura de um gráfico de linha).
  const fluxoCaixa = useMemo(() => {
    const meses = [...mesesComLancamento].sort((a, b) =>
      a.chave > b.chave ? 1 : -1,
    );
    let acumulado = 0;
    return meses.map((m) => {
      const doMes = data.lancamentos.filter(
        (l) => anoMes(l.vencimento)?.chave === m.chave,
      );
      const entradas = doMes
        .filter((l) => l.tipo === "rec")
        .reduce((s, l) => s + (Number(l.valor) || 0), 0);
      const saidas = doMes
        .filter((l) => l.tipo === "des")
        .reduce((s, l) => s + (Number(l.valor) || 0), 0);
      acumulado += entradas - saidas;
      return {
        mes: m.label,
        entradas,
        saidas,
        saldoMes: entradas - saidas,
        saldoAcumulado: acumulado,
      };
    });
  }, [data.lancamentos, mesesComLancamento]);

  function abrir() {
    setForm({
      fornecedor: "",
      categoria: "",
      descricao: "",
      valor: "",
      vencimento: "",
    });
    setTipo("rec");
    setErro("");
    setOpen(true);
  }

  async function salvar(e) {
    e.preventDefault();
    if (
      !form.fornecedor ||
      !form.categoria ||
      !form.descricao ||
      !form.valor ||
      !form.vencimento
    ) {
      setErro("⚠️ Preencha todos os campos obrigatórios.");
      return;
    }
    setEnviando(true);
    try {
      const [a, m, d] = form.vencimento.split("-");
      await criar("lancamentos", {
        tipo,
        fornecedor: form.fornecedor,
        categoria: form.categoria,
        descricao: form.descricao,
        valor: parseMoedaBR(form.valor),
        vencimento: `${d}/${m}/${a}`,
        _novo: true,
      });
      setOpen(false);
      showSuccess(
        "💰",
        "Lançamento Registrado!",
        "O lançamento financeiro foi salvo.",
      );
    } catch (err) {
      setErro("❌ " + err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <div className="sec-title">Financeiro</div>
      <div className="sec-sub">Controle de receitas e despesas</div>
      <div className="gold-line"></div>

      <div className="grid g3" style={{ marginBottom: 20 }}>
        <KpiCard
          label="Receitas"
          value={fmtMoedaBR(totalReceitas)}
          icon="trending_up"
          sub={`${receitas.length} lançamento(s)`}
        />
        <KpiCard
          label="Despesas"
          value={fmtMoedaBR(totalDespesas)}
          icon="trending_down"
          sub={`${despesas.length} lançamento(s)`}
          variant="red"
          delay={0.05}
        />
        <KpiCard
          label="Saldo"
          value={fmtMoedaBR(saldo)}
          icon="account_balance_wallet"
          sub={saldo >= 0 ? "Positivo" : "Negativo"}
          variant="gold"
          delay={0.1}
        />
      </div>

      <div className="fin-tabs">
        <button
          className={"fin-tab" + (aba === "lancamentos" ? " active" : "")}
          onClick={() => setAba("lancamentos")}
        >
          <span className="material-symbols-outlined">receipt_long</span>{" "}
          Lançamentos
        </button>
        <button
          className={"fin-tab" + (aba === "dre" ? " active" : "")}
          onClick={() => setAba("dre")}
        >
          <span className="material-symbols-outlined">summarize</span> DRE
        </button>
        <button
          className={"fin-tab" + (aba === "fluxo" ? " active" : "")}
          onClick={() => setAba("fluxo")}
        >
          <span className="material-symbols-outlined">show_chart</span> Fluxo de
          Caixa
        </button>
      </div>

      {aba === "lancamentos" && (
        <div className="tc">
          <div className="tc-hdr">
            <div>
              <div className="cc-title">Lançamentos</div>
              <div className="cc-sub">
                {data.lancamentos.length} registro(s)
              </div>
            </div>
            <motion.button
              className="btn btn-p"
              onClick={abrir}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="material-symbols-outlined">add_circle</span> Novo
              Lançamento
            </motion.button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Fornecedor/Origem</th>
                <th>Categoria</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Vencimento</th>
              </tr>
            </thead>
            <tbody>
              {data.lancamentos.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      color: "var(--tl)",
                      padding: 24,
                    }}
                  >
                    Nenhum lançamento registrado.
                  </td>
                </tr>
              )}
              <AnimatePresence>
                {data.lancamentos.map((l, i) => (
                  <motion.tr
                    key={l.id ?? i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  >
                    <td>
                      <span
                        style={{
                          color: l.tipo === "rec" ? "#38a169" : "#e53e3e",
                          fontWeight: 700,
                        }}
                      >
                        {l.tipo === "rec" ? "Receita" : "Despesa"}
                      </span>
                    </td>
                    <td>{l.fornecedor}</td>
                    <td>{l.categoria}</td>
                    <td>{l.descricao}</td>
                    <td>
                      <b>{fmtMoedaBR(l.valor)}</b>
                    </td>
                    <td>{l.vencimento}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {aba === "dre" && (
        <div className="tc">
          <div className="tc-hdr">
            <div>
              <div className="cc-title">Demonstrativo de Resultado (DRE)</div>
              <div className="cc-sub">
                Receitas menos despesas por categoria, mês a mês
              </div>
            </div>
            {mesesComLancamento.length > 0 && (
              <select
                value={mesDreAtual}
                onChange={(e) => setMesDre(e.target.value)}
                style={{ maxWidth: 180 }}
              >
                {mesesComLancamento.map((m) => (
                  <option key={m.chave} value={m.chave}>
                    {m.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          {mesesComLancamento.length === 0 ? (
            <div
              style={{ textAlign: "center", color: "var(--tl)", padding: 24 }}
            >
              Nenhum lançamento registrado ainda para calcular a DRE.
            </div>
          ) : (
            <table>
              <tbody>
                <tr>
                  <td>Receita Bruta</td>
                  <td style={{ textAlign: "right" }}>
                    <b style={{ color: "var(--ok)" }}>
                      {fmtMoedaBR(dre.receitaBruta)}
                    </b>
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan={2}
                    style={{
                      paddingTop: 14,
                      fontWeight: 700,
                      color: "var(--tl)",
                      fontSize: 12,
                      letterSpacing: 0.4,
                      textTransform: "uppercase",
                    }}
                  >
                    Despesas por categoria
                  </td>
                </tr>
                {dre.categorias.length === 0 && (
                  <tr>
                    <td colSpan={2} style={{ color: "var(--tl)" }}>
                      Nenhuma despesa neste mês.
                    </td>
                  </tr>
                )}
                {dre.categorias.map(([categoria, valor]) => (
                  <tr key={categoria}>
                    <td>{categoria}</td>
                    <td style={{ textAlign: "right", color: "var(--err)" }}>
                      -{fmtMoedaBR(valor)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ paddingTop: 10 }}>Total de Despesas</td>
                  <td style={{ textAlign: "right", paddingTop: 10 }}>
                    <b style={{ color: "var(--err)" }}>
                      -{fmtMoedaBR(dre.totalDespesasMes)}
                    </b>
                  </td>
                </tr>
                <tr style={{ borderTop: "2px solid var(--border)" }}>
                  <td style={{ paddingTop: 14, fontWeight: 800, fontSize: 15 }}>
                    Resultado Líquido
                  </td>
                  <td style={{ textAlign: "right", paddingTop: 14 }}>
                    <b
                      style={{
                        fontSize: 17,
                        color: dre.resultado >= 0 ? "var(--ok)" : "var(--err)",
                      }}
                    >
                      {fmtMoedaBR(dre.resultado)}
                    </b>
                  </td>
                </tr>
                <tr>
                  <td style={{ color: "var(--tl)", fontSize: 12.5 }}>
                    Margem líquida
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      color: "var(--tl)",
                      fontSize: 12.5,
                    }}
                  >
                    {dre.margem.toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}

      {aba === "fluxo" && (
        <div className="tc">
          <div className="tc-hdr">
            <div>
              <div className="cc-title">Fluxo de Caixa</div>
              <div className="cc-sub">
                Entradas, saídas e saldo acumulado mês a mês
              </div>
            </div>
          </div>
          {fluxoCaixa.length === 0 ? (
            <div
              style={{ textAlign: "center", color: "var(--tl)", padding: 24 }}
            >
              Nenhum lançamento registrado ainda para montar o fluxo de caixa.
            </div>
          ) : (
            <>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <ComposedChart
                    data={fluxoCaixa}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => fmtMoedaBR(v)} />
                    <Legend />
                    <Bar
                      dataKey="entradas"
                      name="Entradas"
                      fill="var(--ok)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="saidas"
                      name="Saídas"
                      fill="var(--err)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      type="monotone"
                      dataKey="saldoAcumulado"
                      name="Saldo acumulado"
                      stroke="var(--g)"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <table style={{ marginTop: 20 }}>
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>Entradas</th>
                    <th>Saídas</th>
                    <th>Saldo do mês</th>
                    <th>Saldo acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {fluxoCaixa.map((m) => (
                    <tr key={m.mes}>
                      <td>{m.mes}</td>
                      <td style={{ color: "var(--ok)" }}>
                        {fmtMoedaBR(m.entradas)}
                      </td>
                      <td style={{ color: "var(--err)" }}>
                        {fmtMoedaBR(m.saidas)}
                      </td>
                      <td>{fmtMoedaBR(m.saldoMes)}</td>
                      <td>
                        <b
                          style={{
                            color:
                              m.saldoAcumulado >= 0
                                ? "var(--ok)"
                                : "var(--err)",
                          }}
                        >
                          {fmtMoedaBR(m.saldoAcumulado)}
                        </b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Novo Lançamento"
        icon="payments"
        actions={
          <>
            <button className="btn btn-o" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-p" disabled={enviando} onClick={salvar}>
              <span className="material-symbols-outlined">check</span>{" "}
              {enviando ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        {erro && (
          <div className="modal-alert-err show">
            <span className="material-symbols-outlined">warning</span> {erro}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <motion.button
            type="button"
            className={"btn " + (tipo === "rec" ? "btn-p" : "btn-o")}
            style={{ flex: 1 }}
            onClick={() => setTipo("rec")}
            whileTap={{ scale: 0.97 }}
          >
            Receita
          </motion.button>
          <motion.button
            type="button"
            className={"btn " + (tipo === "des" ? "btn-p" : "btn-o")}
            style={{ flex: 1 }}
            onClick={() => setTipo("des")}
            whileTap={{ scale: 0.97 }}
          >
            Despesa
          </motion.button>
        </div>
        <form onSubmit={salvar}>
          <div className="modal-field">
            <label>
              Fornecedor/Origem<span>*</span>
            </label>
            <input
              value={form.fornecedor}
              onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
              placeholder="Ex: Fornecedor A"
            />
          </div>
          <div className="modal-field">
            <label>
              Categoria<span>*</span>
            </label>
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            >
              <option value="" disabled>
                Selecione
              </option>
              {CATEGORIAS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="modal-field">
            <label>
              Descrição<span>*</span>
            </label>
            <input
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex: Compra de insumos"
            />
          </div>
          <div className="modal-row2">
            <div className="modal-field">
              <label>
                Valor (R$)<span>*</span>
              </label>
              <input
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                placeholder="Ex: 150,00"
              />
            </div>
            <div className="modal-field">
              <label>
                Vencimento<span>*</span>
              </label>
              <input
                type="date"
                value={form.vencimento}
                onChange={(e) =>
                  setForm({ ...form, vencimento: e.target.value })
                }
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
