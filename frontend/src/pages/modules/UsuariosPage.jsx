import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Api, mTel } from "../../api.js";
import { useData } from "../../context/DataContext.jsx";
import { useUi } from "../../context/UiContext.jsx";
import { CARGOS } from "../../permissions.js";
import Modal from "../../components/Modal.jsx";

// Gera uma senha provisória fácil de digitar/ler em voz alta (sem 0/O nem
// 1/l/I, que se confundem), pra o admin poder passar pro funcionário sem
// erro de transcrição. O funcionário pode trocar depois em Configurações.
function gerarSenhaProvisoria() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const FORM_VAZIO = {
  nome: "",
  sobrenome: "",
  email: "",
  telefone: "",
  cargo: "Caixa",
  senha: "",
};

export default function UsuariosPage() {
  const { usuario } = useData();
  const { showSuccess } = useUi();
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvandoId, setSalvandoId] = useState(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    ...FORM_VAZIO,
    senha: gerarSenhaProvisoria(),
  });
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [criado, setCriado] = useState(null); // último funcionário cadastrado, pra mostrar as credenciais

  async function carregar() {
    setCarregando(true);
    try {
      setLista(await Api.listarUsuarios());
    } catch (e) {
      showSuccess("⚠️", "Não foi possível carregar", e.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirNovo() {
    setForm({ ...FORM_VAZIO, senha: gerarSenhaProvisoria() });
    setErro("");
    setCriado(null);
    setOpen(true);
  }

  async function cadastrarFuncionario(e) {
    e.preventDefault();
    setErro("");
    if (!form.nome.trim() || !form.email.trim() || !form.senha) {
      setErro("Nome, e-mail e senha provisória são obrigatórios.");
      return;
    }
    if (form.senha.length < 8) {
      setErro("A senha provisória deve ter pelo menos 8 caracteres.");
      return;
    }
    setEnviando(true);
    try {
      const novo = await Api.criarUsuario(form);
      setLista((prev) =>
        [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)),
      );
      setCriado({ ...novo, email: form.email, senha: form.senha });
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  function copiarCredenciais() {
    const texto = `Acesso ao Sistema de Farmácia\nE-mail: ${criado.email}\nSenha provisória: ${criado.senha}`;
    navigator.clipboard?.writeText(texto);
    showSuccess(
      "📋",
      "Copiado!",
      "Credenciais copiadas — já pode colar numa mensagem pro funcionário.",
    );
  }

  async function mudarCargo(u, cargo) {
    setSalvandoId(u.id);
    try {
      const atualizado = await Api.atualizarUsuario(u.id, { cargo });
      setLista((prev) => prev.map((x) => (x.id === u.id ? atualizado : x)));
      showSuccess("✅", "Cargo atualizado", `${u.nome} agora é ${cargo}.`);
    } catch (e) {
      showSuccess("⚠️", "Não foi possível alterar", e.message);
    } finally {
      setSalvandoId(null);
    }
  }

  async function alternarAtivo(u) {
    setSalvandoId(u.id);
    try {
      const atualizado = await Api.atualizarUsuario(u.id, { ativo: !u.ativo });
      setLista((prev) => prev.map((x) => (x.id === u.id ? atualizado : x)));
      showSuccess(
        atualizado.ativo ? "🔓" : "🔒",
        atualizado.ativo ? "Acesso reativado" : "Acesso bloqueado",
        `${u.nome} ${atualizado.ativo ? "voltou a ter acesso ao sistema." : "não consegue mais acessar o sistema."}`,
      );
    } catch (e) {
      showSuccess("⚠️", "Não foi possível alterar", e.message);
    } finally {
      setSalvandoId(null);
    }
  }

  return (
    <div>
      <div className="sec-title">Gestão de Usuários</div>
      <div className="sec-sub">
        Cadastre os funcionários que vão usar o sistema e defina a função de
        cada um
      </div>
      <div className="gold-line"></div>

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          background: "rgba(var(--g-rgb),0.08)",
          border: "1px solid rgba(var(--g-rgb),0.25)",
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 20,
          fontSize: 13,
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ color: "var(--g)" }}
        >
          info
        </span>
        <div style={{ color: "var(--tm)" }}>
          Cada cargo tem acesso só aos módulos que precisa (princípio de menor
          privilégio). Ao cadastrar um funcionário aqui, você já escolhe a
          função dele — não precisa promover depois.
        </div>
      </div>

      <div className="tc">
        <div className="tc-hdr">
          <div>
            <div className="cc-title">Funcionários</div>
            <div className="cc-sub">{lista.length} conta(s) cadastrada(s)</div>
          </div>
          <motion.button
            className="btn btn-p"
            onClick={abrirNovo}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="material-symbols-outlined">person_add</span> Novo
            Funcionário
          </motion.button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Cargo</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    color: "var(--tl)",
                    padding: 24,
                  }}
                >
                  Carregando...
                </td>
              </tr>
            )}
            {!carregando && lista.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    color: "var(--tl)",
                    padding: 24,
                  }}
                >
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
            <AnimatePresence>
              {lista.map((u, i) => {
                const souEu = u.id === usuario?.id;
                return (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    style={{ opacity: u.ativo ? 1 : 0.55 }}
                  >
                    <td>
                      <b>
                        {u.nome} {u.sobrenome}
                      </b>
                      {souEu && (
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: 11,
                            color: "var(--g)",
                          }}
                        >
                          (você)
                        </span>
                      )}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        value={u.cargo || ""}
                        disabled={salvandoId === u.id || souEu}
                        onChange={(e) => mudarCargo(u, e.target.value)}
                        style={{
                          border: "1.5px solid var(--border)",
                          borderRadius: 8,
                          padding: "6px 10px",
                          fontSize: 12.5,
                        }}
                        title={
                          souEu ? "Você não pode alterar seu próprio cargo" : ""
                        }
                      >
                        {CARGOS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span
                        style={{
                          color: u.ativo ? "#38a169" : "var(--err)",
                          fontWeight: 700,
                          fontSize: 12.5,
                        }}
                      >
                        {u.ativo ? "● Ativo" : "● Bloqueado"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-o"
                        style={{ padding: "6px 10px", fontSize: 12 }}
                        disabled={salvandoId === u.id || souEu}
                        onClick={() => alternarAtivo(u)}
                        title={
                          souEu ? "Você não pode bloquear a própria conta" : ""
                        }
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 15 }}
                        >
                          {u.ativo ? "lock" : "lock_open"}
                        </span>
                        {u.ativo ? "Bloquear" : "Reativar"}
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={criado ? "Funcionário Cadastrado" : "Novo Funcionário"}
        icon="person_add"
      >
        {criado ? (
          <div>
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                background: "var(--ok-bg)",
                border: "1px solid var(--ok-border)",
                borderRadius: 12,
                padding: "14px 16px",
                marginBottom: 16,
                fontSize: 13,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ color: "var(--ok)" }}
              >
                check_circle
              </span>
              <div style={{ color: "var(--tm)" }}>
                <b>{criado.nome}</b> foi cadastrado(a) como{" "}
                <b>{criado.cargo}</b>. Repasse as credenciais abaixo — ele(a)
                pode trocar a senha depois em Configurações.
              </div>
            </div>
            <div className="modal-field">
              <label>E-mail de acesso</label>
              <input
                readOnly
                value={criado.email}
                style={{ background: "var(--bg)" }}
              />
            </div>
            <div className="modal-field">
              <label>Senha provisória</label>
              <input
                readOnly
                value={criado.senha}
                style={{
                  background: "var(--bg)",
                  fontFamily: "monospace",
                  letterSpacing: 1,
                }}
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-o"
                onClick={copiarCredenciais}
              >
                <span className="material-symbols-outlined">content_copy</span>{" "}
                Copiar Credenciais
              </button>
              <button
                type="button"
                className="btn btn-p"
                onClick={() => setOpen(false)}
              >
                Concluir
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={cadastrarFuncionario}>
            {erro && (
              <div className="modal-alert-err show">
                <span className="material-symbols-outlined">warning</span>{" "}
                {erro}
              </div>
            )}
            <div className="modal-row2">
              <div className="modal-field">
                <label>Nome</label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="modal-field">
                <label>Sobrenome</label>
                <input
                  value={form.sobrenome}
                  onChange={(e) =>
                    setForm({ ...form, sobrenome: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="modal-field">
              <label>E-mail de acesso</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="funcionario@suafarmacia.com.br"
              />
            </div>
            <div className="modal-row2">
              <div className="modal-field">
                <label>Telefone (opcional)</label>
                <input
                  value={form.telefone}
                  onChange={(e) =>
                    setForm({ ...form, telefone: mTel(e.target.value) })
                  }
                />
              </div>
              <div className="modal-field">
                <label>Função (cargo)</label>
                <select
                  value={form.cargo}
                  onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                >
                  {CARGOS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-field">
              <label>Senha provisória</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  style={{ fontFamily: "monospace", letterSpacing: 1, flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-o"
                  onClick={() =>
                    setForm({ ...form, senha: gerarSenhaProvisoria() })
                  }
                  title="Gerar outra senha"
                >
                  <span className="material-symbols-outlined">refresh</span>
                </button>
              </div>
              <div style={{ fontSize: 11, color: "var(--tl)", marginTop: 4 }}>
                Já vem uma sugerida — passe pro funcionário junto com o e-mail.
                Ele pode trocar depois.
              </div>
            </div>
            <motion.button
              type="submit"
              className="btn btn-p"
              style={{ width: "100%" }}
              disabled={enviando}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {enviando ? "Cadastrando..." : "Cadastrar Funcionário"}
            </motion.button>
          </form>
        )}
      </Modal>
    </div>
  );
}
