import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Api } from "../api.js";
import "../styles/login.css";

function forcaSenha(senha) {
  let pontos = 0;
  if (senha.length >= 8) pontos++;
  if (/[A-Z]/.test(senha)) pontos++;
  if (/[0-9]/.test(senha)) pontos++;
  if (/[^A-Za-z0-9]/.test(senha)) pontos++;
  return pontos;
}

function maskCPF(v) {
  return v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskTel(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, (_, a, b, c) =>
      c ? `(${a}) ${b}-${c}` : b ? `(${a}) ${b}` : a ? `(${a}` : "",
    );
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, (_, a, b, c) =>
    c ? `(${a}) ${b}-${c}` : b ? `(${a}) ${b}` : a ? `(${a}` : "",
  );
}

export default function LoginPage() {
  const navigate = useNavigate();

  // Se o navegador abrir na tela de login (ex: o "npm run dev" abre aqui
  // automaticamente) mas a pessoa já tem uma sessão salva de antes, manda
  // direto pro painel em vez de pedir login de novo à toa.
  useEffect(() => {
    if (Api.estaLogado()) navigate("/", { replace: true });
  }, [navigate]);

  // Nome e logo da farmácia (cadastrados em Empresa, por um Administrador).
  // Enquanto isso não for preenchido, mantém a marca padrão do sistema.
  const [empresa, setEmpresa] = useState(null);
  useEffect(() => {
    Api.getEmpresa()
      .then(setEmpresa)
      .catch(() => {});
  }, []);
  const nomeMarca = empresa?.nomeFantasia?.trim();

  const [painel, setPainel] = useState("login"); // "login" | "cadastro"
  const [erroLogin, setErroLogin] = useState("");
  const [enviandoLogin, setEnviandoLogin] = useState(false);
  const [modalOk, setModalOk] = useState(false);
  const [avisoCadastro, setAvisoCadastro] = useState("");
  const [modalRec, setModalRec] = useState(false);
  const [modalRecOk, setModalRecOk] = useState(false);
  const [erroCad, setErroCad] = useState("");
  const [enviandoCad, setEnviandoCad] = useState(false);

  const [login, setLogin] = useState({ email: "", senha: "" });
  const [cad, setCad] = useState({
    nome: "",
    sobrenome: "",
    cpf: "",
    tel: "",
    email: "",
    cargo: "",
    setor: "",
    senha: "",
    senha2: "",
  });

  async function fazerLogin(e) {
    e.preventDefault();
    if (!login.email || !login.senha) {
      setErroLogin("⚠️ Preencha todos os campos corretamente.");
      return;
    }
    setEnviandoLogin(true);
    setErroLogin("");
    try {
      const { usuario, token } = await Api.login(login.email, login.senha);
      Api.salvarSessao(usuario, token);
      navigate("/", { replace: true });
    } catch (err) {
      setErroLogin("❌ " + err.message);
    } finally {
      setEnviandoLogin(false);
    }
  }

  async function cadastrar(e) {
    e.preventDefault();
    const obrig = [
      "nome",
      "sobrenome",
      "cpf",
      "tel",
      "email",
      "cargo",
      "senha",
      "senha2",
    ];
    if (obrig.some((k) => !cad[k])) {
      setErroCad("⚠️ Preencha todos os campos obrigatórios.");
      return;
    }
    if (cad.senha !== cad.senha2) {
      setErroCad("❌ As senhas não conferem.");
      return;
    }
    if (cad.senha.length < 8) {
      setErroCad("❌ A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    setEnviandoCad(true);
    setErroCad("");
    try {
      const resp = await Api.registrar({
        nome: cad.nome,
        sobrenome: cad.sobrenome,
        cpf: cad.cpf,
        telefone: cad.tel,
        cargo: cad.cargo,
        email: cad.email,
        senha: cad.senha,
      });
      setAvisoCadastro(resp.aviso || "");
      setModalOk(true);
    } catch (err) {
      setErroCad("❌ " + err.message);
    } finally {
      setEnviandoCad(false);
    }
  }

  const forca = forcaSenha(cad.senha);
  const forcaLabel = ["Insira uma senha", "Fraca", "Razoável", "Boa", "Forte"][
    forca
  ];

  return (
    <div className="login-page">
      <div className="left">
        <div>
          <div className="brand">
            <div className="brand-icon">
              {empresa?.logo ? (
                <img
                  src={empresa.logo}
                  alt={nomeMarca || "Logo"}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    borderRadius: 13,
                  }}
                />
              ) : (
                <span className="material-symbols-outlined">stethoscope</span>
              )}
            </div>
            <div className="brand-title">
              {nomeMarca || (
                <>
                  Sistema de
                  <br />
                  Farmácia
                </>
              )}
            </div>
            <div className="brand-sub">Sistema de Gestão</div>
            <div className="brand-desc">
              Acesse o painel completo de gestão da farmácia com segurança e
              praticidade.
            </div>
          </div>
          <div className="feats">
            {[
              [
                "🔐",
                "Acesso seguro",
                "Autenticação protegida para cada colaborador",
              ],
              [
                "📊",
                "Dashboard completo",
                "Vendas, estoque, laboratório e financeiro",
              ],
              [
                "🧪",
                "Gestão farmacêutica",
                "Prescrições, fórmulas e produção em tempo real",
              ],
            ].map(([icon, titulo, desc], i) => (
              <motion.div
                className="feat"
                key={titulo}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.1, duration: 0.4 }}
              >
                <div className="feat-icon">{icon}</div>
                <div>
                  <div className="feat-title">{titulo}</div>
                  <div className="feat-desc">{desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="left-footer">
          {nomeMarca || "Sistema de Farmácia"} &copy; 2026
        </div>
      </div>

      <div className="right">
        <div className="card-wrap">
          <AnimatePresence mode="wait">
            {painel === "login" ? (
              <motion.form
                key="login"
                className="panel visible"
                onSubmit={fazerLogin}
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <div className="form-title">Bem-vindo de volta 👋</div>
                <div className="form-sub">
                  Faça login para acessar o sistema
                </div>
                <div className="gold-line"></div>

                {erroLogin && <div className="alert-err show">{erroLogin}</div>}

                <div className="field">
                  <label>E-mail</label>
                  <input
                    type="email"
                    placeholder="seu@gmail.com.br"
                    value={login.email}
                    onChange={(e) =>
                      setLogin({ ...login, email: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label>Senha</label>
                  <div className="pwd-wrap">
                    <input
                      type="password"
                      placeholder="Digite sua senha"
                      value={login.senha}
                      onChange={(e) =>
                        setLogin({ ...login, senha: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="row-opt">
                  <label className="remember">
                    <input type="checkbox" /> Lembrar de mim
                  </label>
                  <span className="forgot" onClick={() => setModalRec(true)}>
                    Esqueci minha senha
                  </span>
                </div>
                <motion.button
                  type="submit"
                  className="btn btn-p"
                  disabled={enviandoLogin}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {enviandoLogin ? "Entrando..." : "Entrar no Sistema"}
                </motion.button>
                <div>
                  <div className="divider">ou</div>
                  <div className="first-access">
                    Primeiro acesso?&nbsp;
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => setPainel("cadastro")}
                    >
                      Criar sua conta →
                    </button>
                  </div>
                </div>
              </motion.form>
            ) : (
              <motion.form
                key="cadastro"
                className="panel visible"
                onSubmit={cadastrar}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <div className="form-title">Criar conta</div>
                <div className="form-sub">
                  Preencha seus dados para acessar o sistema
                </div>
                <div className="gold-line"></div>

                <div className="sec-lbl">Dados Pessoais</div>
                <div className="row2" style={{ marginBottom: 13 }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label>
                      Nome<span>*</span>
                    </label>
                    <input
                      value={cad.nome}
                      onChange={(e) => setCad({ ...cad, nome: e.target.value })}
                      placeholder="Ex: Maria"
                    />
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label>
                      Sobrenome<span>*</span>
                    </label>
                    <input
                      value={cad.sobrenome}
                      onChange={(e) =>
                        setCad({ ...cad, sobrenome: e.target.value })
                      }
                      placeholder="Ex: Oliveira"
                    />
                  </div>
                </div>
                <div className="row2" style={{ marginBottom: 13 }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label>
                      CPF<span>*</span>
                    </label>
                    <input
                      value={cad.cpf}
                      maxLength={14}
                      onChange={(e) =>
                        setCad({ ...cad, cpf: maskCPF(e.target.value) })
                      }
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label>
                      Telefone<span>*</span>
                    </label>
                    <input
                      value={cad.tel}
                      maxLength={15}
                      onChange={(e) =>
                        setCad({ ...cad, tel: maskTel(e.target.value) })
                      }
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                <div className="field">
                  <label>
                    E-mail<span>*</span>
                  </label>
                  <input
                    type="email"
                    value={cad.email}
                    onChange={(e) => setCad({ ...cad, email: e.target.value })}
                    placeholder="seu@suafarmacia.com.br"
                  />
                </div>

                <div className="sec-lbl">Dados do Sistema</div>
                <div className="row2" style={{ marginBottom: 4 }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label>
                      Função pretendida<span>*</span>
                    </label>
                    <select
                      value={cad.cargo}
                      onChange={(e) =>
                        setCad({ ...cad, cargo: e.target.value })
                      }
                    >
                      <option value="" disabled>
                        Selecione
                      </option>
                      {[
                        "Farmacêutico(a)",
                        "Atendente de Vendas",
                        "Caixa",
                        "Manipulador(a)",
                        "Financeiro",
                        "Estoquista",
                        "Gerente",
                      ].map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label>Setor</label>
                    <select
                      value={cad.setor}
                      onChange={(e) =>
                        setCad({ ...cad, setor: e.target.value })
                      }
                    >
                      <option value="" disabled>
                        Selecione
                      </option>
                      {[
                        "Atendimento ao Cliente",
                        "Laboratório / Manipulação",
                        "Estoque e Compras",
                        "Financeiro",
                        "Gestão Geral",
                      ].map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--tm)",
                    marginBottom: 13,
                    marginTop: -6,
                  }}
                >
                  ℹ️ Por segurança, o acesso ao sistema começa restrito (Caixa)
                  e é liberado por um administrador depois — a função acima é só
                  uma referência para ele.
                </div>

                <div className="sec-lbl">Segurança</div>
                <div className="row2" style={{ marginBottom: 4 }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label>
                      Senha<span>*</span>
                    </label>
                    <div className="pwd-wrap">
                      <input
                        type="password"
                        placeholder="Mínimo 8 caracteres"
                        value={cad.senha}
                        onChange={(e) =>
                          setCad({ ...cad, senha: e.target.value })
                        }
                      />
                    </div>
                    <div className="pwd-strength">
                      <div className="bars">
                        {[1, 2, 3, 4].map((n) => (
                          <motion.div
                            key={n}
                            className="bar"
                            animate={{
                              backgroundColor:
                                n <= forca
                                  ? forca <= 1
                                    ? "#e53e3e"
                                    : forca === 2
                                      ? "#dd6b20"
                                      : forca === 3
                                        ? "#d69e2e"
                                        : "#38a169"
                                  : "#e2e8f0",
                            }}
                            transition={{ duration: 0.25 }}
                          />
                        ))}
                      </div>
                      <div className="s-lbl">{forcaLabel}</div>
                    </div>
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label>
                      Confirmar Senha<span>*</span>
                    </label>
                    <div className="pwd-wrap">
                      <input
                        type="password"
                        placeholder="Repita a senha"
                        value={cad.senha2}
                        onChange={(e) =>
                          setCad({ ...cad, senha2: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                {erroCad && (
                  <div className="alert-err show" style={{ marginTop: 12 }}>
                    {erroCad}
                  </div>
                )}
                <div className="req" style={{ marginBottom: 16 }}>
                  <span>*</span> Campos obrigatórios
                </div>

                <motion.button
                  type="submit"
                  className="btn btn-p"
                  disabled={enviandoCad}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {enviandoCad ? "Criando..." : "✓ Criar Conta"}
                </motion.button>
                <button
                  type="button"
                  className="btn btn-o"
                  onClick={() => setPainel("login")}
                >
                  ← Voltar ao login
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {modalOk && (
          <motion.div
            className="overlay show"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
            >
              <div className="modal-icon">✅</div>
              <div className="modal-title">Conta criada com sucesso!</div>
              <div className="modal-sub">
                Seu acesso ao <b>Sistema de Farmácia</b> foi configurado. Agora
                você pode fazer login normalmente.
              </div>
              {avisoCadastro && (
                <div
                  style={{
                    background: "#fff8e6",
                    border: "1px solid #f0dca0",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontSize: 12.5,
                    color: "#8a6d1f",
                    textAlign: "left",
                    marginBottom: 16,
                  }}
                >
                  ℹ️ {avisoCadastro}
                </div>
              )}
              <button
                className="modal-btn"
                onClick={() => {
                  setModalOk(false);
                  setPainel("login");
                }}
              >
                Ir para o Login
              </button>
            </motion.div>
          </motion.div>
        )}

        {modalRec && (
          <motion.div
            className="overlay show"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
            >
              <div className="modal-icon">🔑</div>
              <div className="modal-title">Recuperar senha</div>
              <div className="modal-sub">
                Informe seu e-mail e enviaremos um link para redefinir sua
                senha.
              </div>
              <div
                className="field"
                style={{ textAlign: "left", marginBottom: 18 }}
              >
                <label>E-mail cadastrado</label>
                <input type="email" placeholder="seu@suafarmacia.com.br" />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="modal-btn"
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "1.5px solid #e2e8f0",
                    color: "var(--tm)",
                  }}
                  onClick={() => setModalRec(false)}
                >
                  Cancelar
                </button>
                <button
                  className="modal-btn"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setModalRec(false);
                    setModalRecOk(true);
                  }}
                >
                  Enviar link
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {modalRecOk && (
          <motion.div
            className="overlay show"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
            >
              <div className="modal-icon">📧</div>
              <div className="modal-title">E-mail enviado!</div>
              <div className="modal-sub">
                Um link de redefinição foi enviado para o seu e-mail. Verifique
                sua caixa de entrada.
              </div>
              <button
                className="modal-btn"
                onClick={() => setModalRecOk(false)}
              >
                Voltar ao login
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
