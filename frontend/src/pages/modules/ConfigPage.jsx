import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useData } from "../../context/DataContext.jsx";
import { useUi } from "../../context/UiContext.jsx";
import { ehAdministrador } from "../../permissions.js";
import { Api, mTel } from "../../api.js";
import { TEMAS, aplicarTema, aplicarModo, lerModoSalvo } from "../../temas.js";

export default function ConfigPage() {
  const { usuario, setUsuario } = useData();
  const { showSuccess } = useUi();
  const [form, setForm] = useState({
    nome: "",
    cargo: "",
    email: "",
    telefone: "",
    registroProfissional: "",
  });
  const [senha, setSenha] = useState({ nova: "", confirma: "" });
  const [erroSenha, setErroSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [modo, setModo] = useState(lerModoSalvo());
  const [temaAtual, setTemaAtual] = useState("coral");
  const [corPersonalizada, setCorPersonalizada] = useState("#2b5ba8");
  const [salvandoTema, setSalvandoTema] = useState("");

  useEffect(() => {
    Api.getConfig()
      .then((cfg) => {
        setTemaAtual(cfg?.tema || "coral");
        if (cfg?.corPersonalizada) setCorPersonalizada(cfg.corPersonalizada);
      })
      .catch(() => {});
  }, []);

  async function escolherTema(id) {
    if (salvandoTema) return;
    if (id === temaAtual && id !== "personalizado") return;
    setSalvandoTema(id);
    const temaAnterior = temaAtual;
    setTemaAtual(id);
    aplicarTema(id, corPersonalizada); // aplica na hora, sem esperar a resposta do servidor
    try {
      await Api.atualizarConfig({
        tema: id,
        corPersonalizada: id === "personalizado" ? corPersonalizada : undefined,
      });
      showSuccess(
        "🎨",
        "Tema Atualizado!",
        "A nova aparência já vale pra todo mundo que usa o sistema.",
      );
    } catch (err) {
      setTemaAtual(temaAnterior);
      aplicarTema(temaAnterior, corPersonalizada);
      showSuccess("⚠️", "Não foi possível salvar", err.message);
    } finally {
      setSalvandoTema("");
    }
  }

  // Enquanto a pessoa mexe no seletor de cor, já mostra o resultado na hora
  // (só salva de fato quando solta o seletor, no onChange final "escolherTema").
  function preteviewCorPersonalizada(cor) {
    setCorPersonalizada(cor);
    if (temaAtual === "personalizado") aplicarTema("personalizado", cor);
  }

  useEffect(() => {
    if (usuario) {
      setForm({
        nome: [usuario.nome, usuario.sobrenome].filter(Boolean).join(" "),
        cargo: usuario.cargo || "",
        email: usuario.email || "",
        telefone: usuario.telefone || "",
        registroProfissional: usuario.registroProfissional || "",
      });
    }
  }, [usuario]);

  function trocarModo(novo) {
    if (novo === modo) return;
    setModo(novo);
    aplicarModo(novo);
  }

  async function salvarPerfil(e) {
    e.preventDefault();
    if (!form.nome.trim()) {
      showSuccess(
        "⚠️",
        "Nome obrigatório",
        "Informe seu nome completo antes de salvar.",
      );
      return;
    }
    setSalvando(true);
    try {
      // O campo "Nome completo" é um único texto na tela, mas o backend
      // guarda nome e sobrenome separados — divide aqui antes de enviar,
      // senão o sobrenome fica de fora do envio e acaba sendo apagado.
      const partes = form.nome.trim().split(/\s+/);
      const nome = partes[0];
      const sobrenome = partes.slice(1).join(" ");
      const atualizado = await Api.atualizarPerfil({
        ...form,
        nome,
        sobrenome,
      });
      setUsuario(atualizado);
      showSuccess(
        "⚙️",
        "Configurações Salvas!",
        "Seus dados de perfil foram atualizados com sucesso.",
      );
    } catch (err) {
      showSuccess("⚠️", "Não foi possível salvar", err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function alterarSenha(e) {
    e.preventDefault();
    setErroSenha("");
    if (!senha.nova || senha.nova.length < 6 || senha.nova !== senha.confirma) {
      setErroSenha(
        "⚠️ As senhas devem ter ao menos 6 caracteres e serem iguais.",
      );
      return;
    }
    setTrocandoSenha(true);
    try {
      await Api.alterarSenha(senha.nova);
      setSenha({ nova: "", confirma: "" });
      showSuccess(
        "🔑",
        "Senha Alterada!",
        "Sua senha de acesso foi atualizada com sucesso.",
      );
    } catch (err) {
      setErroSenha("❌ " + err.message);
    } finally {
      setTrocandoSenha(false);
    }
  }

  return (
    <div>
      <div className="sec-title">Configurações do Usuário</div>
      <div className="sec-sub">
        Gerencie seu perfil, função na empresa, senha de acesso e aparência
        pessoal
      </div>
      <div className="gold-line"></div>

      <div className="grid g2">
        <motion.div
          className="tc"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="tc-hdr">
            <div>
              <div className="cc-title">Perfil</div>
              <div className="cc-sub">
                Seus dados pessoais e função na empresa
              </div>
            </div>
          </div>
          <form onSubmit={salvarPerfil}>
            <div className="modal-field">
              <label>Nome completo</label>
              <input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div className="modal-field">
              <label>Função na empresa</label>
              <div className="cargo-badge">
                <span className="material-symbols-outlined">badge</span>
                {form.cargo || "—"}
              </div>
              <div style={{ fontSize: 11, color: "var(--tl)", marginTop: 4 }}>
                Só um administrador pode alterar sua função (em Usuários).
              </div>
            </div>
            {form.cargo === "Farmacêutico(a)" && (
              <div className="modal-field">
                <label>Registro Profissional (CRF)</label>
                <input
                  value={form.registroProfissional}
                  onChange={(e) =>
                    setForm({ ...form, registroProfissional: e.target.value })
                  }
                  placeholder="Ex: CRF-CE 12345"
                />
                <div style={{ fontSize: 11, color: "var(--tl)", marginTop: 4 }}>
                  O registro é no Conselho Regional de Farmácia (CRF) — não
                  confundir com o CRM, que é dos médicos.
                </div>
              </div>
            )}
            <div className="modal-field">
              <label>E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="modal-field">
              <label>Telefone</label>
              <input
                value={form.telefone}
                onChange={(e) =>
                  setForm({ ...form, telefone: mTel(e.target.value) })
                }
              />
            </div>
            <motion.button
              type="submit"
              className="btn btn-p"
              style={{ width: "100%" }}
              disabled={salvando}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {salvando ? "Salvando..." : "Salvar Alterações"}
            </motion.button>
          </form>

          <div className="modo-divisor"></div>

          <div className="modal-field" style={{ marginBottom: 0 }}>
            <label>Aparência (só no seu navegador)</label>
            <div className="modo-toggle">
              <button
                type="button"
                className={"modo-opcao" + (modo === "claro" ? " active" : "")}
                onClick={() => trocarModo("claro")}
              >
                <span className="material-symbols-outlined">light_mode</span>{" "}
                Claro
              </button>
              <button
                type="button"
                className={"modo-opcao" + (modo === "escuro" ? " active" : "")}
                onClick={() => trocarModo("escuro")}
              >
                <span className="material-symbols-outlined">dark_mode</span>{" "}
                Escuro
              </button>
            </div>
            <div style={{ fontSize: 11, color: "var(--tl)", marginTop: 6 }}>
              Essa escolha é só sua — aplica na hora e fica salva neste
              navegador/aparelho. A cor do tema (abaixo) é diferente: essa é
              definida pelo Administrador e vale pra todo mundo.
            </div>
          </div>
        </motion.div>

        <motion.div
          className="tc"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="tc-hdr">
            <div>
              <div className="cc-title">Segurança</div>
              <div className="cc-sub">Alterar senha de acesso</div>
            </div>
          </div>
          {erroSenha && (
            <div className="modal-alert-err show">
              <span className="material-symbols-outlined">warning</span>{" "}
              {erroSenha}
            </div>
          )}
          <form onSubmit={alterarSenha}>
            <div className="modal-field">
              <label>Nova senha</label>
              <input
                type="password"
                value={senha.nova}
                onChange={(e) => setSenha({ ...senha, nova: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="modal-field">
              <label>Confirmar nova senha</label>
              <input
                type="password"
                value={senha.confirma}
                onChange={(e) =>
                  setSenha({ ...senha, confirma: e.target.value })
                }
                placeholder="Repita a senha"
              />
            </div>
            <motion.button
              type="submit"
              className="btn btn-p"
              style={{ width: "100%" }}
              disabled={trocandoSenha}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {trocandoSenha ? "Alterando..." : "Alterar Senha"}
            </motion.button>
          </form>
        </motion.div>
      </div>

      {ehAdministrador(usuario?.cargo) && (
        <motion.div
          className="tc"
          style={{ marginTop: 20 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="tc-hdr">
            <div>
              <div className="cc-title">Aparência do Sistema</div>
              <div className="cc-sub">
                O tema escolhido vale pra todo mundo que usa o sistema — só
                administradores podem alterar
              </div>
            </div>
          </div>
          <div className="tema-grid">
            {TEMAS.map((t) =>
              t.id === "personalizado" ? (
                <label
                  key={t.id}
                  className={
                    "tema-card" + (temaAtual === t.id ? " active" : "")
                  }
                  style={{ cursor: salvandoTema ? "default" : "pointer" }}
                >
                  <span className="tema-preview">
                    <span
                      style={{
                        background: corPersonalizada,
                        width: 26,
                        marginLeft: 0,
                      }}
                    />
                  </span>
                  <span className="tema-nome">{t.nome}</span>
                  <input
                    type="color"
                    value={corPersonalizada}
                    disabled={!!salvandoTema}
                    onInput={(e) => preteviewCorPersonalizada(e.target.value)}
                    onChange={() => escolherTema("personalizado")}
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: 0,
                      cursor: "pointer",
                    }}
                  />
                  {temaAtual === t.id && (
                    <span className="material-symbols-outlined tema-check">
                      check_circle
                    </span>
                  )}
                </label>
              ) : (
                <button
                  key={t.id}
                  type="button"
                  className={
                    "tema-card" + (temaAtual === t.id ? " active" : "")
                  }
                  onClick={() => escolherTema(t.id)}
                  disabled={!!salvandoTema}
                >
                  <span className="tema-preview">
                    <span style={{ background: t.preview }} />
                    <span style={{ background: t.preview2 }} />
                  </span>
                  <span className="tema-nome">{t.nome}</span>
                  {temaAtual === t.id && (
                    <span className="material-symbols-outlined tema-check">
                      check_circle
                    </span>
                  )}
                </button>
              ),
            )}
          </div>
          {temaAtual === "personalizado" && (
            <div style={{ fontSize: 12, color: "var(--tl)", marginTop: 10 }}>
              Clique na bolinha "Personalizada" pra escolher qualquer cor — o
              restante da paleta (sidebar, fundos, destaques) é gerado
              automaticamente a partir dela.
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
