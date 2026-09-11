import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Api } from "../api.js";

const RECURSOS = {
  clientes: "clientes",
  pedidos: "pedidos",
  prescritores: "prescritores",
  producoes: "producoes",
  lancamentos: "lancamentos",
  orcamentosFila: "orcamentos",
  compromissos: "compromissos",
  relatorios: "relatorios",
  formulas: "formulas",
  biblioteca: "biblioteca",
  produtosProntos: "produtos-prontos",
  compras: "compras",
  fornecedores: "fornecedores",
  notificacoes: "notificacoes",
  produtosIndustrializados: "produtos-industrializados",
  vendas: "vendas",
  promocoes: "promocoes",
};

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [data, setData] = useState(() =>
    Object.fromEntries(Object.keys(RECURSOS).map((k) => [k, []])),
  );
  const [usuario, setUsuario] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  const carregarTudo = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const perfil = await Api.me();
      setUsuario(perfil);
    } catch (e) {
      // se não conseguir carregar o perfil, os componentes de rota tratam o redirecionamento
    }
    try {
      const dadosEmpresa = await Api.getEmpresa();
      setEmpresa(dadosEmpresa);
    } catch (e) {
      // sem cadastro de empresa ainda — as telas usam o nome padrão do sistema
    }

    const entradas = await Promise.all(
      Object.entries(RECURSOS).map(async ([chave, recurso]) => {
        try {
          const lista = await Api.listar(recurso);
          return [chave, lista];
        } catch (e) {
          return [chave, []];
        }
      }),
    );
    setData(Object.fromEntries(entradas));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (Api.estaLogado()) carregarTudo();
    else setLoading(false);
  }, [carregarTudo]);

  const criar = useCallback(async (chave, payload) => {
    const recurso = RECURSOS[chave];
    const criado = await Api.criar(recurso, payload);
    setData((prev) => ({ ...prev, [chave]: [criado, ...prev[chave]] }));
    return criado;
  }, []);

  const atualizar = useCallback(async (chave, id, payload) => {
    const recurso = RECURSOS[chave];
    await Api.atualizar(recurso, id, payload);
    setData((prev) => ({
      ...prev,
      [chave]: prev[chave].map((item) =>
        item.id === id ? { ...item, ...payload, id } : item,
      ),
    }));
  }, []);

  const remover = useCallback(async (chave, id) => {
    const recurso = RECURSOS[chave];
    await Api.remover(recurso, id);
    setData((prev) => ({
      ...prev,
      [chave]: prev[chave].filter((item) => item.id !== id),
    }));
  }, []);

  const patchLocal = useCallback((chave, updater) => {
    setData((prev) => ({ ...prev, [chave]: updater(prev[chave]) }));
  }, []);

  const value = {
    data,
    usuario,
    setUsuario,
    empresa,
    setEmpresa,
    loading,
    erro,
    recarregar: carregarTudo,
    criar,
    atualizar,
    remover,
    patchLocal,
    RECURSOS,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData precisa estar dentro de <DataProvider>");
  return ctx;
}
