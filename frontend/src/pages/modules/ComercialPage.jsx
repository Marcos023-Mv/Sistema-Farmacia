import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useData } from "../../context/DataContext.jsx";
import { useUi } from "../../context/UiContext.jsx";
import KpiCard from "../../components/KpiCard.jsx";
import Modal from "../../components/Modal.jsx";
import { fmtMoedaBR, hoje } from "../../api.js";

function ultimosDias(n) {
  const dias = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dias.push(
      d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
    );
  }
  return dias;
}

export default function ComercialPage() {
  const { data, criar } = useData();
  const { showSuccess } = useUi();
  const [open, setOpen] = useState(false);
  const [marcados, setMarcados] = useState([]);
  const [periodo, setPeriodo] = useState("");
  const [formato, setFormato] = useState("");
  const [enviando, setEnviando] = useState(false);

  const vendasHoje = data.vendas.filter((v) => v.data === hoje());
  const totalVendasHoje = vendasHoje.reduce(
    (s, v) => s + (Number(v.total) || 0),
    0,
  );
  const receitaLancamentos = data.lancamentos
    .filter((l) => l.tipo === "rec")
    .reduce((s, l) => s + (Number(l.valor) || 0), 0);
  const receitaMensal =
    receitaLancamentos +
    data.vendas.reduce((s, v) => s + (Number(v.total) || 0), 0);
  const totalVendas = data.vendas.length;
  const ticketMedio = totalVendas
    ? data.vendas.reduce((s, v) => s + (Number(v.total) || 0), 0) / totalVendas
    : 0;
  const meta = 10000;
  const pctMeta = Math.min(100, Math.round((receitaMensal / meta) * 100));

  const chartData = useMemo(() => {
    const dias = ultimosDias(7);
    const hojeISO = new Date().toISOString().slice(0, 10);
    return dias.map((label, i) => {
      const dataAlvo = new Date();
      dataAlvo.setDate(dataAlvo.getDate() - (6 - i));
      const dd = dataAlvo.toLocaleDateString("pt-BR");
      const total = data.vendas
        .filter((v) => v.data === dd)
        .reduce((s, v) => s + (Number(v.total) || 0), 0);
      return { dia: label, total };
    });
  }, [data.vendas]);

  async function gerarRelatorio(e) {
    e.preventDefault();
    if (marcados.length === 0 || !periodo || !formato) return;
    setEnviando(true);
    try {
      for (const tipo of marcados) {
        await criar("relatorios", {
          tipo,
          periodo,
          formato,
          data: hoje(),
          status: "Concluído",
        });
      }
      setOpen(false);
      setMarcados([]);
      setPeriodo("");
      setFormato("");
      showSuccess(
        "📊",
        "Relatório Gerado!",
        "O relatório foi gerado com sucesso.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div className="sec-title">Painel Comercial</div>
          <div className="sec-sub">
            Acompanhe os principais indicadores em tempo real
          </div>
        </div>
        <motion.button
          className="btn btn-p"
          onClick={() => setOpen(true)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <span className="material-symbols-outlined">assessment</span> Gerar
          Relatório
        </motion.button>
      </div>
      <div className="gold-line"></div>

      <div className="grid g4">
        <KpiCard
          label="Vendas Hoje"
          value={fmtMoedaBR(totalVendasHoje)}
          icon="point_of_sale"
          sub={`${vendasHoje.length} venda(s)`}
        />
        <KpiCard
          label="Receita (total)"
          value={fmtMoedaBR(receitaMensal)}
          icon="payments"
          sub="Vendas + lançamentos"
          variant="gold"
          delay={0.05}
        />
        <KpiCard
          label="Ticket Médio"
          value={fmtMoedaBR(ticketMedio)}
          icon="receipt_long"
          sub="Por venda de balcão"
          variant="red"
          delay={0.1}
        />
        <motion.div
          className="card kpi r"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="kpi-top">
            <div className="kpi-lbl">Meta Mensal</div>
            <div className="kpi-icon">
              <span className="material-symbols-outlined">flag</span>
            </div>
          </div>
          <div className="kpi-val">{pctMeta}%</div>
          <div className="kpi-chg" style={{ color: "var(--tl)" }}>
            Meta: {fmtMoedaBR(meta)}
          </div>
          <div className="prog-bar">
            <motion.div
              className="prog-fill g"
              initial={{ width: 0 }}
              animate={{ width: `${pctMeta}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </motion.div>
      </div>

      <div className="row2">
        <div className="cc" style={{ marginBottom: 0 }}>
          <div className="cc-title">
            <span className="material-symbols-outlined">trending_up</span>{" "}
            Vendas (últimos 7 dias)
          </div>
          <div className="cc-sub">Total vendido por dia no balcão</div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
                <XAxis
                  dataKey="dia"
                  tick={{ fontSize: 12, fill: "#8898aa" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#8898aa" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(v) => fmtMoedaBR(v)} />
                <Bar
                  dataKey="total"
                  fill="var(--g)"
                  radius={[6, 6, 0, 0]}
                  animationDuration={700}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="cc" style={{ marginBottom: 0 }}>
          <div className="cc-title">
            <span className="material-symbols-outlined">military_tech</span>{" "}
            Resumo do Negócio
          </div>
          <div className="cc-sub">Visão geral rápida</div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              paddingTop: 10,
            }}
          >
            {[
              ["Clientes cadastrados", data.clientes.length],
              [
                "Fórmulas em produção",
                data.producoes.filter((p) => p.status === "Em Produção").length,
              ],
              [
                "Produtos não manipulados",
                data.produtosIndustrializados.length,
              ],
              [
                "Pedidos na fila de orçamento",
                data.orcamentosFila.filter((o) => o.status === "Pendente")
                  .length,
              ],
            ].map(([label, val], i) => (
              <motion.div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: 10,
                }}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <span style={{ color: "var(--tm)", fontSize: 13.5 }}>
                  {label}
                </span>
                <b>{val}</b>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="tc" style={{ marginTop: 16 }}>
        <div className="tc-hdr">
          <div>
            <div className="cc-title">
              <span className="material-symbols-outlined">description</span>{" "}
              Relatórios Gerados
            </div>
            <div className="cc-sub">Histórico de relatórios exportados</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Período</th>
              <th>Data</th>
              <th>Formato</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.relatorios.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    color: "var(--tl)",
                    padding: 24,
                  }}
                >
                  Nenhum relatório gerado ainda.
                </td>
              </tr>
            )}
            {data.relatorios.map((r, i) => (
              <tr key={r.id ?? i}>
                <td>
                  <b>{r.tipo}</b>
                </td>
                <td>{r.periodo}</td>
                <td>{r.data}</td>
                <td>{r.formato}</td>
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Gerar Relatório"
        icon="assessment"
        actions={
          <>
            <button className="btn btn-o" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button
              className="btn btn-p"
              disabled={enviando}
              onClick={gerarRelatorio}
            >
              <span className="material-symbols-outlined">check</span>{" "}
              {enviando ? "Gerando..." : "Gerar"}
            </button>
          </>
        }
      >
        <div className="modal-field">
          <label>Tipos de relatório</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {["Vendas", "Financeiro", "Estoque", "Produção"].map((tipo) => (
              <label
                key={tipo}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13.5,
                }}
              >
                <input
                  type="checkbox"
                  checked={marcados.includes(tipo)}
                  onChange={(e) =>
                    setMarcados((prev) =>
                      e.target.checked
                        ? [...prev, tipo]
                        : prev.filter((t) => t !== tipo),
                    )
                  }
                />
                {tipo}
              </label>
            ))}
          </div>
        </div>
        <div className="modal-field">
          <label>Período</label>
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
            <option value="" disabled>
              Selecione
            </option>
            <option>Últimos 7 dias</option>
            <option>Este mês</option>
            <option>Este ano</option>
          </select>
        </div>
        <div className="modal-field">
          <label>Formato</label>
          <select value={formato} onChange={(e) => setFormato(e.target.value)}>
            <option value="" disabled>
              Selecione
            </option>
            <option>PDF</option>
            <option>Excel</option>
          </select>
        </div>
      </Modal>
    </div>
  );
}
