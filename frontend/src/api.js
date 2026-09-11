// Em produção, defina VITE_API_URL no .env do frontend apontando para o
// domínio real do backend (ex: https://api.suafarmacia.com.br/api).
//
// Sem essa variável, o endereço do backend é montado a partir do mesmo host
// que foi usado pra abrir o frontend no navegador (window.location.hostname).
// Isso é o que faz o acesso pelo celular/tablet funcionar sem configuração:
// se você abriu o app em http://192.168.0.10:5500, a API é chamada em
// http://192.168.0.10:3000/api automaticamente — sem isso, cairia em
// "localhost", que no celular aponta pro próprio celular, não pro computador.
const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3000/api`;
const TOKEN_KEY = "mp_token";
const USUARIO_KEY = "mp_usuario";

export const Api = {
  baseUrl: API_BASE_URL,

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  getUsuario() {
    try {
      return JSON.parse(localStorage.getItem(USUARIO_KEY) || "null");
    } catch {
      return null;
    }
  },
  salvarSessao(usuario, token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
  },
  encerrarSessao() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
  },
  estaLogado() {
    return !!this.getToken();
  },

  async request(path, opts = {}) {
    const { method = "GET", body, auth = true } = opts;
    const headers = { "Content-Type": "application/json" };
    if (auth) {
      const token = this.getToken();
      if (token) headers["Authorization"] = "Bearer " + token;
    }

    let res;
    try {
      res = await fetch(this.baseUrl + path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new Error(
        "Não foi possível conectar ao servidor. Verifique se o backend está rodando em " + this.baseUrl,
      );
    }

    if (res.status === 204) return null;
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      if (res.status === 401 && auth) {
        this.encerrarSessao();
        // Deixa o componente que chamou decidir o redirecionamento (via <SessionExpired/>
        // ou checagem de rota); aqui só sinalizamos com um erro específico.
        const err = new Error((data && data.erro) || "Sessão expirada");
        err.sessionExpired = true;
        throw err;
      }
      throw new Error((data && data.erro) || "Erro na requisição (" + res.status + ")");
    }
    return data;
  },

  get(path) {
    return this.request(path, { method: "GET" });
  },
  post(path, body, opts = {}) {
    return this.request(path, { method: "POST", body, ...opts });
  },
  put(path, body) {
    return this.request(path, { method: "PUT", body });
  },
  del(path) {
    return this.request(path, { method: "DELETE" });
  },

  login(email, senha) {
    return this.post("/auth/login", { email, senha }, { auth: false });
  },
  registrar(dados) {
    return this.post("/auth/register", dados, { auth: false });
  },
  me() {
    return this.get("/auth/me");
  },
  atualizarPerfil(dados) {
    return this.put("/auth/me", dados);
  },
  alterarSenha(novaSenha) {
    return this.put("/auth/senha", { novaSenha });
  },

  listar(recurso) {
    return this.get("/" + recurso);
  },
  criar(recurso, dados) {
    return this.post("/" + recurso, dados);
  },
  atualizar(recurso, id, dados) {
    return this.put("/" + recurso + "/" + id, dados);
  },
  remover(recurso, id) {
    return this.del("/" + recurso + "/" + id);
  },

  // ─── Gestão de usuários (somente Administrador) ───
  listarUsuarios() {
    return this.get("/usuarios");
  },
  criarUsuario(dados) {
    return this.post("/usuarios", dados);
  },
  atualizarUsuario(id, dados) {
    return this.put("/usuarios/" + id, dados);
  },

  // ─── Configurações do sistema (tema visual) ───
  // Leitura é pública (funciona até na tela de login, sem estar logado);
  // só Administrador pode alterar (ver exigirAdmin no backend).
  getConfig() {
    return this.get("/config");
  },
  atualizarConfig(dados) {
    return this.put("/config", dados);
  },

  // ─── Cadastro da empresa (dados, endereço, logo) ───
  // Leitura pública (a tela de login mostra nome e logo da farmácia);
  // só Administrador pode editar.
  getEmpresa() {
    return this.get("/empresa");
  },
  atualizarEmpresa(dados) {
    return this.put("/empresa", dados);
  },
};

export function hoje() {
  return new Date().toLocaleDateString("pt-BR");
}

export function fmtMoedaBR(valor) {
  return (Number(valor) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parseMoedaBR(str) {
  return parseFloat(String(str || "0").replace(/\./g, "").replace(",", ".")) || 0;
}

export function mTel(valor) {
  const v = String(valor || "").replace(/\D/g, "").slice(0, 11);
  if (v.length <= 10) {
    return v.replace(/(\d{2})(\d{4})(\d{0,4})/, (_, a, b, c) => (c ? `(${a}) ${b}-${c}` : b ? `(${a}) ${b}` : `(${a}`));
  }
  return v.replace(/(\d{2})(\d{5})(\d{0,4})/, (_, a, b, c) => (c ? `(${a}) ${b}-${c}` : b ? `(${a}) ${b}` : `(${a}`));
}

export function mCpf(valor) {
  return String(valor || "")
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function mCnpj(valor) {
  return String(valor || "")
    .replace(/\D/g, "")
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function mCep(valor) {
  return String(valor || "")
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/(\d{5})(\d{1,3})$/, "$1-$2");
}

// Converte "DD/MM/AAAA" (formato usado nas telas) para Date. Retorna null se inválido.
export function parseDataBR(str) {
  if (!str) return null;
  const partes = String(str).split("/");
  if (partes.length !== 3) return null;
  const [d, m, a] = partes.map(Number);
  if (!d || !m || !a) return null;
  const data = new Date(a, m - 1, d);
  return isNaN(data.getTime()) ? null : data;
}

// Dias até o vencimento (negativo = já venceu). null se não há data de validade.
export function diasParaVencer(dataValidadeBR) {
  const data = parseDataBR(dataValidadeBR);
  if (!data) return null;
  const hoje0h = new Date();
  hoje0h.setHours(0, 0, 0, 0);
  data.setHours(0, 0, 0, 0);
  return Math.round((data - hoje0h) / (1000 * 60 * 60 * 24));
}
