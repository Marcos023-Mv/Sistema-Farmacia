import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "../../context/DataContext.jsx";
import { useUi } from "../../context/UiContext.jsx";
import KpiCard from "../../components/KpiCard.jsx";
import ValidadeBadge from "../../components/ValidadeBadge.jsx";
import { Api } from "../../api.js";
import {
  fmtMoedaBR,
  hoje,
  diasParaVencer,
  parseMoedaBR,
  parseDataBR,
} from "../../api.js";

const FORMAS_PAGAMENTO = [
  "Dinheiro",
  "Cartão de Débito",
  "Cartão de Crédito",
  "Pix",
];

function arredondar(n) {
  return Math.round(n * 100) / 100;
}

// Uma promoção vale se hoje estiver dentro do período de início/fim
// cadastrado (sem data = sem limite naquele lado).
function promocaoVigente(promo) {
  const inicio = parseDataBR(promo.dataInicio);
  const fim = parseDataBR(promo.dataFim);
  const agora = new Date();
  agora.setHours(0, 0, 0, 0);
  if (inicio && agora < inicio) return false;
  if (fim && agora > fim) return false;
  return true;
}

export default function VendasPage() {
  const { data, criar, atualizar, patchLocal } = useData();
  const { showSuccess } = useUi();

  const disponiveis = data.produtosIndustrializados.filter((p) => {
    if ((Number(p.estoque) || 0) <= 0) return false;
    const dias = diasParaVencer(p.validade);
    return dias === null || dias >= 0;
  });
  const [produtoId, setProdutoId] = useState(disponiveis[0]?.id ?? "");
  const [qtd, setQtd] = useState(1);
  const [carrinho, setCarrinho] = useState([]);
  const [cliente, setCliente] = useState("");
  const [pagamentos, setPagamentos] = useState([
    { forma: "Dinheiro", valorTexto: "" },
  ]);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [codigoBarras, setCodigoBarras] = useState("");
  const inputBarrasRef = useRef(null);

  const produtoSelecionado = data.produtosIndustrializados.find(
    (p) => String(p.id) === String(produtoId),
  );
  const total = carrinho.reduce((s, i) => s + i.qtd * i.precoUnit, 0);

  // Verifica se existe promoção vigente pro produto (ou pra loja toda,
  // "todos") e devolve o melhor preço encontrado — se houver mais de uma
  // promoção aplicável, vale a que dá mais desconto pro cliente.
  function precoComPromocao(produto) {
    const promos = (data.promocoes || []).filter(
      (p) =>
        promocaoVigente(p) &&
        (p.produtoId === "todos" || String(p.produtoId) === String(produto.id)),
    );
    let melhorPreco = produto.preco;
    let promoAplicada = null;
    for (const p of promos) {
      const desconto =
        p.tipoDesconto === "Percentual (%)"
          ? (produto.preco * (Number(p.valorDesconto) || 0)) / 100
          : Number(p.valorDesconto) || 0;
      const precoComEssa = Math.max(0, arredondar(produto.preco - desconto));
      if (precoComEssa < melhorPreco) {
        melhorPreco = precoComEssa;
        promoAplicada = p;
      }
    }
    return { precoFinal: melhorPreco, promo: promoAplicada };
  }

  const precoInfo = produtoSelecionado
    ? precoComPromocao(produtoSelecionado)
    : null;

  // Só a última forma de pagamento tem o valor calculado automaticamente
  // (o restante do total depois do que já foi alocado nas anteriores) —
  // assim, com uma forma só (caso mais comum), não precisa digitar nada:
  // o valor já é o total da venda. Ao dividir em mais formas, só as
  // primeiras precisam de valor digitado, a última sempre fecha a conta.
  function valorDaLinha(i) {
    if (i < pagamentos.length - 1)
      return parseMoedaBR(pagamentos[i].valorTexto);
    const alocado = pagamentos
      .slice(0, i)
      .reduce((s, p) => s + parseMoedaBR(p.valorTexto), 0);
    return Math.max(0, arredondar(total - alocado));
  }
  const valoresPagamento = pagamentos.map((_, i) => valorDaLinha(i));
  const somaAlocada = valoresPagamento.reduce((s, v) => s + v, 0);
  const somaSemUltima = pagamentos
    .slice(0, -1)
    .reduce((s, p) => s + parseMoedaBR(p.valorTexto), 0);

  const vendasHoje = data.vendas.filter((v) => v.data === hoje());
  const faturadoHoje = vendasHoje.reduce(
    (s, v) => s + (Number(v.total) || 0),
    0,
  );
  const ticket = vendasHoje.length ? faturadoHoje / vendasHoje.length : 0;

  function produtoEstaVencido(produto) {
    const dias = diasParaVencer(produto.validade);
    return dias !== null && dias < 0;
  }

  function adicionarAoCarrinho(produto, quantidade) {
    setErro("");
    if (produtoEstaVencido(produto)) {
      setErro(
        `"${produto.nome}" está com a validade vencida e não pode ser vendido.`,
      );
      return false;
    }
    const q = parseInt(quantidade) || 0;
    if (q <= 0) {
      setErro("Informe uma quantidade válida.");
      return false;
    }
    const jaNoCarrinho = carrinho.find((i) => i.produtoId === produto.id);
    const qtdJa = jaNoCarrinho ? jaNoCarrinho.qtd : 0;
    if (q + qtdJa > produto.estoque) {
      setErro(
        `Estoque insuficiente de "${produto.nome}". Disponível: ${produto.estoque - qtdJa}.`,
      );
      return false;
    }
    if (jaNoCarrinho) {
      setCarrinho((prev) =>
        prev.map((i) =>
          i.produtoId === produto.id ? { ...i, qtd: i.qtd + q } : i,
        ),
      );
    } else {
      const { precoFinal, promo } = precoComPromocao(produto);
      setCarrinho((prev) => [
        ...prev,
        {
          produtoId: produto.id,
          nome: produto.nome,
          qtd: q,
          precoUnit: precoFinal,
          promoNome: promo?.nome || null,
        },
      ]);
    }
    return true;
  }

  function adicionar() {
    if (!produtoSelecionado) {
      setErro("Selecione um produto disponível em estoque.");
      return;
    }
    if (adicionarAoCarrinho(produtoSelecionado, qtd)) setQtd(1);
  }

  function lerCodigoBarras(e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const codigo = codigoBarras.trim();
    if (!codigo) return;
    const produto = data.produtosIndustrializados.find(
      (p) => p.codigoBarras && p.codigoBarras === codigo,
    );
    if (!produto) {
      setErro(`Nenhum produto encontrado com o código de barras "${codigo}".`);
    } else {
      adicionarAoCarrinho(produto, 1);
    }
    setCodigoBarras("");
    inputBarrasRef.current?.focus();
  }

  function removerItem(idx) {
    setCarrinho(carrinho.filter((_, i) => i !== idx));
  }

  async function finalizar() {
    setErro("");
    if (carrinho.length === 0) {
      setErro("Adicione ao menos um produto ao carrinho antes de finalizar.");
      return;
    }
    if (somaSemUltima > total + 0.004) {
      setErro(
        "A soma dos valores informados nas formas de pagamento ultrapassa o total da venda.",
      );
      return;
    }
    setEnviando(true);
    try {
      const pagamentosFinal = pagamentos.map((p, i) => ({
        forma: p.forma,
        valor: valoresPagamento[i],
      }));
      const resumoPagamento =
        pagamentosFinal.length === 1
          ? pagamentosFinal[0].forma
          : pagamentosFinal
              .map((p) => `${p.forma} (${fmtMoedaBR(p.valor)})`)
              .join(" + ");

      const venda = await criar("vendas", {
        cliente: cliente.trim() || "Cliente balcão",
        itens: carrinho,
        total,
        formaPagamento: resumoPagamento,
        pagamentos: pagamentosFinal,
        data: hoje(),
        status: "Concluída",
      });
      if (venda._lancamentoCriado) {
        patchLocal("lancamentos", (lista) => [
          venda._lancamentoCriado,
          ...lista,
        ]);
      }

      for (const item of carrinho) {
        const produto = data.produtosIndustrializados.find(
          (p) => p.id === item.produtoId,
        );
        if (produto) {
          const novoEstoque = produto.estoque - item.qtd;
          await Api.atualizar("produtos-industrializados", produto.id, {
            ...produto,
            estoque: novoEstoque,
          });
          patchLocal("produtosIndustrializados", (lista) =>
            lista.map((p) =>
              p.id === produto.id ? { ...p, estoque: novoEstoque } : p,
            ),
          );
        }
      }

      // O lançamento financeiro da venda é criado pelo próprio backend (na
      // mesma requisição de POST /api/vendas) — assim quem opera o caixa
      // não precisa ter acesso ao módulo Financeiro pra conseguir vender.

      setCarrinho([]);
      setCliente("");
      setPagamentos([{ forma: "Dinheiro", valorTexto: "" }]);
      showSuccess(
        "🧾",
        "Venda Concluída!",
        `Venda de ${fmtMoedaBR(total)} registrada com sucesso.`,
      );
    } catch (err) {
      setErro("Não foi possível concluir a venda: " + err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <div className="sec-title">Vendas (Balcão)</div>
      <div className="sec-sub">
        Venda direta de medicamentos não manipulados, sem prescrição/fórmula
      </div>
      <div className="gold-line"></div>

      <div className="grid g3" style={{ marginBottom: 20 }}>
        <KpiCard
          label="Vendas hoje"
          value={vendasHoje.length}
          icon="point_of_sale"
          sub="Pedidos de balcão"
        />
        <KpiCard
          label="Faturado hoje"
          value={fmtMoedaBR(faturadoHoje)}
          icon="payments"
          sub="Total em vendas"
          variant="gold"
          delay={0.05}
        />
        <KpiCard
          label="Ticket médio"
          value={fmtMoedaBR(ticket)}
          icon="receipt_long"
          sub="Por venda hoje"
          variant="red"
          delay={0.1}
        />
      </div>

      <div className="grid g2">
        <div className="tc">
          <div className="tc-hdr">
            <div>
              <div className="cc-title">Adicionar produto</div>
              <div className="cc-sub">
                Escaneie o código de barras ou selecione da lista
              </div>
            </div>
          </div>
          <div className="modal-field">
            <label>Código de barras</label>
            <input
              ref={inputBarrasRef}
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
              onKeyDown={lerCodigoBarras}
              placeholder="Escaneie com o leitor ou digite e aperte Enter"
              style={{ fontFamily: "monospace" }}
            />
          </div>
          <div className="modal-field">
            <label>Produto</label>
            <select
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
            >
              {disponiveis.length === 0 ? (
                <option value="">Nenhum produto com estoque disponível</option>
              ) : (
                disponiveis.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} ({p.estoque} disp.)
                  </option>
                ))
              )}
            </select>
            {produtoSelecionado && produtoSelecionado.validade && (
              <div style={{ marginTop: 6, fontSize: 12 }}>
                Validade: <ValidadeBadge data={produtoSelecionado.validade} />
              </div>
            )}
          </div>
          <div className="modal-row2">
            <div className="modal-field">
              <label>Quantidade</label>
              <input
                type="number"
                min={1}
                value={qtd}
                onChange={(e) => setQtd(e.target.value)}
              />
            </div>
            <div className="modal-field">
              <label>Preço unitário</label>
              <input
                readOnly
                style={{ background: "var(--bg)" }}
                value={precoInfo ? fmtMoedaBR(precoInfo.precoFinal) : ""}
              />
              {precoInfo?.promo && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: "var(--g)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 15 }}
                  >
                    sell
                  </span>
                  Promoção "{precoInfo.promo.nome}" aplicada (de{" "}
                  {fmtMoedaBR(produtoSelecionado.preco)})
                </div>
              )}
            </div>
          </div>
          <motion.button
            className="btn btn-p"
            style={{ width: "100%" }}
            onClick={adicionar}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="material-symbols-outlined">add_shopping_cart</span>{" "}
            Adicionar ao carrinho
          </motion.button>
          {erro && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--err)",
                background: "#fdeeee",
                border: "1px solid #f4c7c7",
                borderRadius: 10,
                padding: "10px 14px",
                marginTop: 14,
                fontSize: 13.5,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18 }}
              >
                warning
              </span>{" "}
              {erro}
            </div>
          )}
        </div>

        <div className="tc">
          <div className="tc-hdr">
            <div>
              <div className="cc-title">Carrinho</div>
              <div className="cc-sub">Itens da venda atual</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Qtd</th>
                <th>Subtotal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {carrinho.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      textAlign: "center",
                      color: "var(--tl)",
                      padding: 16,
                    }}
                  >
                    Carrinho vazio.
                  </td>
                </tr>
              )}
              <AnimatePresence>
                {carrinho.map((i, idx) => (
                  <motion.tr
                    key={i.produtoId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                  >
                    <td>
                      {i.nome}
                      {i.promoNome && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--g)",
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            marginTop: 2,
                          }}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 12 }}
                          >
                            sell
                          </span>
                          {i.promoNome}
                        </div>
                      )}
                    </td>
                    <td>{i.qtd}</td>
                    <td>{fmtMoedaBR(i.qtd * i.precoUnit)}</td>
                    <td>
                      <button
                        className="btn btn-o"
                        style={{ padding: "4px 8px", fontSize: 11 }}
                        onClick={() => removerItem(idx)}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: 14 }}
                        >
                          close
                        </span>
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 0 6px 0",
              borderTop: "1px solid var(--border)",
              marginTop: 10,
            }}
          >
            <span style={{ fontWeight: 700, color: "var(--td)" }}>Total</span>
            <motion.span
              key={total}
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
              style={{ fontWeight: 800, fontSize: 20, color: "var(--g)" }}
            >
              {fmtMoedaBR(total)}
            </motion.span>
          </div>
          <div className="modal-field">
            <label>Cliente (opcional)</label>
            <input
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Nome do cliente"
            />
          </div>
          <div className="modal-field">
            <label>Forma(s) de pagamento</label>
            {pagamentos.map((p, i) => {
              const ultima = i === pagamentos.length - 1;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 8,
                    alignItems: "center",
                  }}
                >
                  <select
                    style={{ flex: 1 }}
                    value={p.forma}
                    onChange={(e) =>
                      setPagamentos((prev) =>
                        prev.map((x, idx) =>
                          idx === i ? { ...x, forma: e.target.value } : x,
                        ),
                      )
                    }
                  >
                    {FORMAS_PAGAMENTO.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                  {ultima ? (
                    <input
                      readOnly
                      style={{ width: 110, background: "var(--bg)" }}
                      value={fmtMoedaBR(valoresPagamento[i])}
                      title="Fecha automaticamente com o total da venda"
                    />
                  ) : (
                    <input
                      style={{ width: 110 }}
                      value={p.valorTexto}
                      onChange={(e) =>
                        setPagamentos((prev) =>
                          prev.map((x, idx) =>
                            idx === i
                              ? { ...x, valorTexto: e.target.value }
                              : x,
                          ),
                        )
                      }
                      placeholder="Ex: 20,00"
                    />
                  )}
                  {pagamentos.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-o"
                      style={{ padding: "6px 8px" }}
                      onClick={() =>
                        setPagamentos((prev) =>
                          prev.filter((_, idx) => idx !== i),
                        )
                      }
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 14 }}
                      >
                        close
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              className="btn btn-o"
              style={{ fontSize: 12, padding: "6px 10px" }}
              onClick={() =>
                setPagamentos((prev) => [
                  ...prev,
                  {
                    forma: prev.some((x) => x.forma === "Pix")
                      ? "Dinheiro"
                      : "Pix",
                    valorTexto: "",
                  },
                ])
              }
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 14 }}
              >
                add
              </span>{" "}
              Dividir em outra forma de pagamento
            </button>
            {pagamentos.length > 1 && (
              <div style={{ fontSize: 12, color: "var(--tl)", marginTop: 8 }}>
                Total da venda: {fmtMoedaBR(total)} — já alocado:{" "}
                {fmtMoedaBR(somaAlocada)}
              </div>
            )}
          </div>
          <motion.button
            className="btn btn-p"
            style={{ width: "100%" }}
            disabled={enviando}
            onClick={finalizar}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="material-symbols-outlined">check_circle</span>{" "}
            {enviando ? "Processando..." : "Finalizar Venda"}
          </motion.button>
        </div>
      </div>

      <div className="tc">
        <div className="tc-hdr">
          <div>
            <div className="cc-title">Últimas Vendas</div>
            <div className="cc-sub">Histórico de vendas de balcão</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente</th>
              <th>Itens</th>
              <th>Total</th>
              <th>Pagamento</th>
            </tr>
          </thead>
          <tbody>
            {data.vendas.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    color: "var(--tl)",
                    padding: 24,
                  }}
                >
                  Nenhuma venda registrada ainda.
                </td>
              </tr>
            )}
            {data.vendas.map((v, i) => (
              <tr key={v.id ?? i}>
                <td>{v.data}</td>
                <td>{v.cliente}</td>
                <td>{(v.itens || []).length} item(ns)</td>
                <td>
                  <b>{fmtMoedaBR(v.total)}</b>
                </td>
                <td>{v.formaPagamento}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
