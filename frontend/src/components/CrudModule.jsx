import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "../context/DataContext.jsx";
import { useUi } from "../context/UiContext.jsx";
import Modal from "./Modal.jsx";

/**
 * Módulo de CRUD simples e genérico, usado por Clientes, Prescritores,
 * Fornecedores, Compras, Produtos Prontos, Biblioteca, Fórmulas, Agenda,
 * Produção e Insumos — todos seguem o mesmo padrão de lista + formulário.
 *
 * fields: [{ name, label, type: 'text'|'select'|'date'|'time'|'number', options, required }]
 * columns: [{ key, label, render?(item) }]
 */
export default function CrudModule({
  dataKey,
  title,
  subtitle,
  icon,
  createLabel,
  fields,
  columns,
  buildPayload,
  successMsg,
  kpis,
  emptyMsg = "Nenhum registro cadastrado.",
}) {
  const { data, criar, remover } = useData();
  const { showSuccess } = useUi();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const lista = data[dataKey] || [];

  function abrir() {
    setForm(Object.fromEntries(fields.map((f) => [f.name, f.default ?? ""])));
    setErro("");
    setOpen(true);
  }

  async function salvar(e) {
    e.preventDefault();
    const faltando = fields.filter((f) => f.required && !form[f.name]);
    if (faltando.length) {
      setErro("⚠️ Preencha todos os campos obrigatórios.");
      return;
    }
    setEnviando(true);
    setErro("");
    try {
      const payload = buildPayload ? buildPayload(form) : form;
      await criar(dataKey, payload);
      setOpen(false);
      showSuccess(
        "✅",
        "Cadastrado com sucesso!",
        successMsg || "O registro foi salvo.",
      );
    } catch (err) {
      setErro("❌ " + err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function excluir(item) {
    try {
      await remover(dataKey, item.id);
    } catch (err) {
      showSuccess("⚠️", "Não foi possível excluir", err.message);
    }
  }

  return (
    <div>
      <div className="sec-title">{title}</div>
      {subtitle && <div className="sec-sub">{subtitle}</div>}
      <div className="gold-line"></div>

      {kpis && (
        <div className="grid g3" style={{ marginBottom: 20 }}>
          {kpis(lista)}
        </div>
      )}

      <div className="tc">
        <div className="tc-hdr">
          <div>
            <div className="cc-title">Lista</div>
            <div className="cc-sub">{lista.length} registro(s)</div>
          </div>
          <motion.button
            className="btn btn-p"
            onClick={abrir}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="material-symbols-outlined">add_circle</span>{" "}
            {createLabel}
          </motion.button>
        </div>
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  style={{
                    textAlign: "center",
                    color: "var(--tl)",
                    padding: 24,
                  }}
                >
                  {emptyMsg}
                </td>
              </tr>
            )}
            <AnimatePresence>
              {lista.map((item, i) => (
                <motion.tr
                  key={item.id ?? i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                >
                  {columns.map((c) => (
                    <td key={c.key}>
                      {c.render ? c.render(item) : item[c.key]}
                    </td>
                  ))}
                  <td>
                    <button
                      className="btn btn-o"
                      style={{ padding: "6px 10px", fontSize: 12 }}
                      onClick={() => excluir(item)}
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
        title={createLabel}
        icon={icon}
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
          {fields.map((f) => (
            <div className="modal-field" key={f.name}>
              <label>
                {f.label}
                {f.required && <span>*</span>}
              </label>
              {f.type === "select" ? (
                <select
                  value={form[f.name] ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, [f.name]: e.target.value })
                  }
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {(typeof f.options === "function"
                    ? f.options(data)
                    : f.options
                  ).map((o) => {
                    const opt =
                      typeof o === "object" && o !== null
                        ? o
                        : { value: o, label: o };
                    return (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <input
                  type={f.type || "text"}
                  placeholder={f.placeholder || ""}
                  value={form[f.name] ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [f.name]: f.mask
                        ? f.mask(e.target.value)
                        : e.target.value,
                    })
                  }
                />
              )}
            </div>
          ))}
        </form>
      </Modal>
    </div>
  );
}
