import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useUi } from "../../context/UiContext.jsx";
import { Api, mCnpj, mCep, mTel } from "../../api.js";

const ESTADOS_BR = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

const VAZIO = {
  nomeFantasia: "",
  razaoSocial: "",
  cnpj: "",
  inscricaoEstadual: "",
  telefone: "",
  email: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  responsavelTecnico: "",
  responsavelRegistro: "",
  logo: "",
};

export default function EmpresaPage() {
  const { showSuccess } = useUi();
  const [form, setForm] = useState(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    Api.getEmpresa()
      .then((e) => setForm({ ...VAZIO, ...e }))
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, []);

  function campo(nome) {
    return {
      value: form[nome] || "",
      onChange: (e) => setForm((f) => ({ ...f, [nome]: e.target.value })),
    };
  }

  function handleLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showSuccess(
        "⚠️",
        "Arquivo inválido",
        "Escolha um arquivo de imagem (PNG, JPG, SVG...).",
      );
      return;
    }
    if (file.size > 500 * 1024) {
      showSuccess(
        "⚠️",
        "Imagem muito grande",
        "Escolha uma logo com até 500KB — imagens menores carregam mais rápido.",
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, logo: reader.result }));
    reader.readAsDataURL(file);
  }

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    if (form.cnpj && form.cnpj.replace(/\D/g, "").length !== 14) {
      setErro("O CNPJ precisa ter 14 dígitos.");
      return;
    }
    setSalvando(true);
    try {
      const atualizado = await Api.atualizarEmpresa(form);
      setForm({ ...VAZIO, ...atualizado });
      showSuccess(
        "🏢",
        "Cadastro Salvo!",
        "Os dados da empresa foram atualizados com sucesso.",
      );
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return null;

  return (
    <div>
      <div className="sec-title">Cadastro da Empresa</div>
      <div className="sec-sub">
        Dados que identificam a farmácia no sistema, em telas e recibos
      </div>
      <div className="gold-line"></div>

      {erro && (
        <div className="modal-alert-err show">
          <span className="material-symbols-outlined">warning</span> {erro}
        </div>
      )}

      <form onSubmit={salvar}>
        <div className="grid g2">
          <motion.div
            className="tc"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="tc-hdr">
              <div>
                <div className="cc-title">Identidade</div>
                <div className="cc-sub">Nome e logo exibidos no sistema</div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 14,
                  background: form.logo ? "var(--w)" : "var(--bg)",
                  border: "1.5px dashed var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {form.logo ? (
                  <img
                    src={form.logo}
                    alt="Logo da empresa"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 30, color: "var(--tl)" }}
                  >
                    storefront
                  </span>
                )}
              </div>
              <div>
                <label
                  className="btn btn-o"
                  style={{ cursor: "pointer", display: "inline-flex" }}
                >
                  <span className="material-symbols-outlined">upload</span>{" "}
                  Enviar Logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogo}
                    style={{ display: "none" }}
                  />
                </label>
                {form.logo && (
                  <button
                    type="button"
                    className="btn btn-o"
                    style={{ marginLeft: 8 }}
                    onClick={() => setForm((f) => ({ ...f, logo: "" }))}
                  >
                    Remover
                  </button>
                )}
                <div style={{ fontSize: 11, color: "var(--tl)", marginTop: 6 }}>
                  PNG, JPG ou SVG, até 500KB.
                </div>
              </div>
            </div>
            <div className="modal-field">
              <label>Nome Fantasia</label>
              <input
                {...campo("nomeFantasia")}
                placeholder="Ex: Farmácia Central"
              />
            </div>
            <div className="modal-field">
              <label>Razão Social</label>
              <input
                {...campo("razaoSocial")}
                placeholder="Ex: Farmácia Central Comércio de Medicamentos Ltda"
              />
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
                <div className="cc-title">Documentos e Contato</div>
                <div className="cc-sub">CNPJ e canais de contato</div>
              </div>
            </div>
            <div className="modal-row2">
              <div className="modal-field">
                <label>CNPJ</label>
                <input
                  value={form.cnpj || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cnpj: mCnpj(e.target.value) }))
                  }
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="modal-field">
                <label>Inscrição Estadual</label>
                <input {...campo("inscricaoEstadual")} placeholder="Opcional" />
              </div>
            </div>
            <div className="modal-row2">
              <div className="modal-field">
                <label>Telefone</label>
                <input
                  value={form.telefone || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, telefone: mTel(e.target.value) }))
                  }
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="modal-field">
                <label>E-mail</label>
                <input
                  type="email"
                  {...campo("email")}
                  placeholder="contato@suafarmacia.com.br"
                />
              </div>
            </div>
            <div className="modal-field">
              <label>Responsável Técnico</label>
              <input
                {...campo("responsavelTecnico")}
                placeholder="Nome do farmacêutico responsável"
              />
            </div>
            <div className="modal-field">
              <label>Registro Profissional (CRF)</label>
              <input
                {...campo("responsavelRegistro")}
                placeholder="Ex: CRF-CE 12345"
              />
            </div>
          </motion.div>
        </div>

        <motion.div
          className="tc"
          style={{ marginTop: 20 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="tc-hdr">
            <div>
              <div className="cc-title">Endereço</div>
              <div className="cc-sub">Endereço da loja física</div>
            </div>
          </div>
          <div className="modal-row2">
            <div className="modal-field">
              <label>CEP</label>
              <input
                value={form.cep || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cep: mCep(e.target.value) }))
                }
                placeholder="00000-000"
              />
            </div>
            <div className="modal-field">
              <label>Bairro</label>
              <input {...campo("bairro")} />
            </div>
          </div>
          <div className="modal-row2">
            <div className="modal-field">
              <label>Logradouro</label>
              <input {...campo("logradouro")} placeholder="Rua, avenida..." />
            </div>
            <div className="modal-field">
              <label>Número</label>
              <input {...campo("numero")} />
            </div>
          </div>
          <div className="modal-row2">
            <div className="modal-field">
              <label>Complemento</label>
              <input {...campo("complemento")} placeholder="Opcional" />
            </div>
            <div className="modal-field">
              <label>Cidade</label>
              <input {...campo("cidade")} />
            </div>
          </div>
          <div className="modal-field" style={{ maxWidth: 140 }}>
            <label>UF</label>
            <select
              value={form.uf || ""}
              onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value }))}
            >
              <option value="">Selecione</option>
              {ESTADOS_BR.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        <motion.button
          type="submit"
          className="btn btn-p"
          style={{ marginTop: 20, width: "100%" }}
          disabled={salvando}
          whileHover={{ scale: 1.005 }}
          whileTap={{ scale: 0.99 }}
        >
          {salvando ? "Salvando..." : "Salvar Cadastro da Empresa"}
        </motion.button>
      </form>
    </div>
  );
}
