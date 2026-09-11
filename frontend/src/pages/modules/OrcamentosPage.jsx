import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "../../context/DataContext.jsx";
import { useUi } from "../../context/UiContext.jsx";
import KpiCard from "../../components/KpiCard.jsx";
import Modal from "../../components/Modal.jsx";
import { fmtMoedaBR, parseMoedaBR, hoje, mTel } from "../../api.js";

const STATUS = [
  "Pendente",
  "Em análise",
  "Aprovado",
  "Reprovado",
  "Finalizado",
];
const CORES = {
  Pendente: "#dd6b20",
  "Em análise": "#3182ce",
  Aprovado: "#38a169",
  Reprovado: "#e53e3e",
  Finalizado: "#718096",
};

export default function OrcamentosPage() {
  const { data, criar, atualizar, remover } = useData();
  const { showSuccess } = useUi();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const lista = data.orcamentosFila;

  function abrir() {
    setForm({
      nome: "",
      empresa: "",
      telefone: "",
      email: "",
      servico: "",
      descricao: "",
      valorEstimado: "",
    });
    setErro("");
    setOpen(true);
  }

  async function salvar(e) {
    e.preventDefault();
    const obrig = ["nome", "telefone", "email", "servico", "descricao"];
    if (obrig.some((k) => !form[k])) {
      setErro("⚠️ Preencha todos os campos obrigatórios.");
      return;
    }
    setEnviando(true);
    try {
      await criar("orcamentosFila", {
        nome: form.nome,
        empresa: form.empresa || "-",
        telefone: form.telefone,
        email: form.email,
        servico: form.servico,
        descricao: form.descricao,
        valorEstimado: parseMoedaBR(form.valorEstimado || "0"),
        data: hoje(),
        status: "Pendente",
      });
      setOpen(false);
      showSuccess(
        "📋",
        "Orçamento Solicitado!",
        "A solicitação foi adicionada à fila.",
      );
    } catch (err) {
      setErro("❌ " + err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function mudarStatus(item, novo) {
    await atualizar("orcamentosFila", item.id, { ...item, status: novo });
  }

  return (
    <div>
      <div className="sec-title">Pedidos</div>
      <div className="sec-sub">Fila de solicitações de orçamento</div>
      <div className="gold-line"></div>

      <div className="grid g3" style={{ marginBottom: 20 }}>
        <KpiCard
          label="Total"
          value={lista.length}
          icon="shopping_cart"
          sub="Solicitações"
        />
        <KpiCard
          label="Pendentes"
          value={lista.filter((o) => o.status === "Pendente").length}
          icon="hourglass_empty"
          sub="Aguardando análise"
          variant="gold"
          delay={0.05}
        />
        <KpiCard
          label="Aprovados"
          value={lista.filter((o) => o.status === "Aprovado").length}
          icon="check_circle"
          sub="Prontos p/ produção"
          variant="red"
          delay={0.1}
        />
      </div>

      <div className="tc">
        <div className="tc-hdr">
          <div>
            <div className="cc-title">Fila de Orçamentos</div>
            <div className="cc-sub">{lista.length} solicitação(ões)</div>
          </div>
          <motion.button
            className="btn btn-p"
            onClick={abrir}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="material-symbols-outlined">add_circle</span> Nova
            Solicitação
          </motion.button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Serviço</th>
              <th>Valor Est.</th>
              <th>Data</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    textAlign: "center",
                    color: "var(--tl)",
                    padding: 24,
                  }}
                >
                  Nenhuma solicitação na fila.
                </td>
              </tr>
            )}
            <AnimatePresence>
              {lista.map((o, i) => (
                <motion.tr
                  key={o.id ?? i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                >
                  <td>
                    <b>{o.nome}</b>
                    <div style={{ fontSize: 11.5, color: "var(--tl)" }}>
                      {o.empresa}
                    </div>
                  </td>
                  <td>{o.servico}</td>
                  <td>{fmtMoedaBR(o.valorEstimado)}</td>
                  <td>{o.data}</td>
                  <td>
                    <select
                      value={o.status}
                      onChange={(e) => mudarStatus(o, e.target.value)}
                      style={{
                        border: "none",
                        borderRadius: 20,
                        padding: "5px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#fff",
                        background: CORES[o.status] || "#718096",
                        cursor: "pointer",
                      }}
                    >
                      {STATUS.map((s) => (
                        <option key={s} value={s} style={{ color: "#000" }}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      className="btn btn-o"
                      style={{ padding: "6px 10px", fontSize: 12 }}
                      onClick={() => remover("orcamentosFila", o.id)}
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
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nova Solicitação de Orçamento"
        icon="request_quote"
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
        <form onSubmit={salvar}>
          <div className="modal-row2">
            <div className="modal-field">
              <label>
                Nome<span>*</span>
              </label>
              <input
                value={form.nome || ""}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Ana Paula"
              />
            </div>
            <div className="modal-field">
              <label>Empresa</label>
              <input
                value={form.empresa || ""}
                onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                placeholder="Opcional"
              />
            </div>
          </div>
          <div className="modal-row2">
            <div className="modal-field">
              <label>
                Telefone<span>*</span>
              </label>
              <input
                value={form.telefone || ""}
                onChange={(e) =>
                  setForm({ ...form, telefone: mTel(e.target.value) })
                }
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="modal-field">
              <label>
                E-mail<span>*</span>
              </label>
              <input
                type="email"
                value={form.email || ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="cliente@email.com"
              />
            </div>
          </div>
          <div className="modal-field">
            <label>
              Serviço<span>*</span>
            </label>
            <select
              value={form.servico || ""}
              onChange={(e) => setForm({ ...form, servico: e.target.value })}
            >
              <option value="" disabled>
                Selecione
              </option>
              {[
                "Cápsulas",
                "Cremes Dermatológicos",
                "Florais de Bach",
                "Géis",
                "Manipulados Líquidos",
                "Outros",
              ].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="modal-field">
            <label>
              Descrição<span>*</span>
            </label>
            <input
              value={form.descricao || ""}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Descreva a necessidade"
            />
          </div>
          <div className="modal-field">
            <label>Valor Estimado (R$)</label>
            <input
              value={form.valorEstimado || ""}
              onChange={(e) =>
                setForm({ ...form, valorEstimado: e.target.value })
              }
              placeholder="Opcional"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
