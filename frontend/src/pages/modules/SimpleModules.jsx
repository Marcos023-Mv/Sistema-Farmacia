import React from "react";
import CrudModule from "../../components/CrudModule.jsx";
import { useData } from "../../context/DataContext.jsx";
import KpiCard from "../../components/KpiCard.jsx";
import ValidadeBadge from "../../components/ValidadeBadge.jsx";
import {
  hoje,
  mTel,
  mCpf,
  diasParaVencer,
  parseDataBR,
  parseMoedaBR,
  fmtMoedaBR,
} from "../../api.js";

export function ClientesPage() {
  return (
    <CrudModule
      dataKey="clientes"
      title="Clientes Cadastrados"
      subtitle="Gestão da base de clientes da farmácia"
      icon="group"
      createLabel="Novo Cliente"
      successMsg="O cliente foi adicionado à base."
      fields={[
        { name: "nome", label: "Nome", required: true, placeholder: "Ex: Ana" },
        {
          name: "sobrenome",
          label: "Sobrenome",
          required: true,
          placeholder: "Ex: Paula",
        },
        {
          name: "cpf",
          label: "CPF",
          required: true,
          placeholder: "000.000.000-00",
          mask: mCpf,
        },
        {
          name: "tel",
          label: "Telefone",
          required: true,
          placeholder: "(00) 00000-0000",
          mask: mTel,
        },
      ]}
      buildPayload={(f) => ({
        nome: `${f.nome} ${f.sobrenome}`,
        cpf: f.cpf,
        tel: f.tel,
        ultimoPedido: hoje(),
        totalGasto: "R$ 0,00",
        status: "Ativo",
      })}
      columns={[
        { key: "nome", label: "Nome", render: (i) => <b>{i.nome}</b> },
        { key: "cpf", label: "CPF" },
        { key: "tel", label: "Telefone" },
        { key: "ultimoPedido", label: "Último Pedido" },
        { key: "totalGasto", label: "Total Gasto" },
        { key: "status", label: "Status" },
      ]}
      kpis={(lista) => (
        <>
          <KpiCard
            label="Total de Clientes"
            value={lista.length}
            icon="group"
            sub="Cadastrados"
          />
          <KpiCard
            label="Ativos"
            value={lista.filter((c) => c.status === "Ativo").length}
            icon="check_circle"
            sub="Em relacionamento"
            variant="gold"
            delay={0.05}
          />
          <KpiCard
            label="Novos (hoje)"
            value={lista.filter((c) => c.ultimoPedido === hoje()).length}
            icon="person_add"
            sub="Cadastrados hoje"
            variant="red"
            delay={0.1}
          />
        </>
      )}
    />
  );
}

export function PrescritoresPage() {
  return (
    <CrudModule
      dataKey="prescritores"
      title="Gestão de Médicos"
      subtitle="Prescritores parceiros da farmácia"
      icon="stethoscope"
      createLabel="Novo Prescritor"
      successMsg="O prescritor foi cadastrado."
      fields={[
        {
          name: "nome",
          label: "Nome",
          required: true,
          placeholder: "Ex: Dr. Carlos Souza",
        },
        {
          name: "crf",
          label: "CRM/CRF",
          required: true,
          placeholder: "Ex: CRM-12345",
        },
        {
          name: "especialidade",
          label: "Especialidade",
          type: "select",
          required: true,
          options: [
            "Hospitalar",
            "Estética",
            "Industrial",
            "Análise Clínica",
            "Manipulação",
            "Homeopática",
            "Veterinária",
            "Nutracêuticos",
            "Antroposofia",
            "Esportiva",
            "Gerenciamento",
            "Outra",
          ],
        },
        {
          name: "tel",
          label: "Telefone",
          required: true,
          placeholder: "(00) 00000-0000",
          mask: mTel,
        },
      ]}
      buildPayload={(f) => ({
        ...f,
        receitas: 0,
        total: "R$ 0,00",
        status: "Ativo",
      })}
      columns={[
        { key: "nome", label: "Nome", render: (i) => <b>{i.nome}</b> },
        { key: "crf", label: "CRM/CRF" },
        { key: "especialidade", label: "Especialidade" },
        { key: "tel", label: "Telefone" },
        { key: "receitas", label: "Receitas" },
        { key: "status", label: "Status" },
      ]}
      kpis={(lista) => (
        <>
          <KpiCard
            label="Total de Prescritores"
            value={lista.length}
            icon="stethoscope"
            sub="Cadastrados"
          />
          <KpiCard
            label="Ativos"
            value={lista.filter((p) => p.status === "Ativo").length}
            icon="check_circle"
            sub="Parceiros ativos"
            variant="gold"
            delay={0.05}
          />
        </>
      )}
    />
  );
}

export function FornecedoresPage() {
  return (
    <CrudModule
      dataKey="fornecedores"
      title="Fornecedores"
      subtitle="Cadastro de fornecedores de matérias-primas e insumos"
      icon="local_shipping"
      createLabel="Novo Fornecedor"
      successMsg="O fornecedor foi adicionado à base de parceiros."
      fields={[
        {
          name: "nome",
          label: "Nome / Razão Social",
          required: true,
          placeholder: "Ex: Galena Química",
        },
        {
          name: "cnpj",
          label: "CNPJ",
          required: true,
          placeholder: "00.000.000/0000-00",
        },
        {
          name: "categoria",
          label: "Categoria",
          type: "select",
          required: true,
          options: [
            "Matérias-primas",
            "Embalagens",
            "Equipamentos",
            "Serviços",
            "Outros",
          ],
        },
        {
          name: "tel",
          label: "Telefone",
          required: true,
          placeholder: "(00) 00000-0000",
          mask: mTel,
        },
        {
          name: "email",
          label: "E-mail",
          type: "email",
          placeholder: "contato@fornecedor.com",
        },
      ]}
      columns={[
        { key: "nome", label: "Nome", render: (i) => <b>{i.nome}</b> },
        { key: "cnpj", label: "CNPJ" },
        { key: "categoria", label: "Categoria" },
        { key: "tel", label: "Telefone" },
        { key: "email", label: "E-mail" },
      ]}
      kpis={(lista) => (
        <>
          <KpiCard
            label="Total de Fornecedores"
            value={lista.length}
            icon="local_shipping"
            sub="Cadastrados"
          />
          <KpiCard
            label="Categorias"
            value={new Set(lista.map((f) => f.categoria)).size}
            icon="category"
            sub="Tipos de insumo"
            variant="gold"
            delay={0.05}
          />
        </>
      )}
    />
  );
}

export function ComprasPage() {
  return (
    <CrudModule
      dataKey="compras"
      title="Compras"
      subtitle="Pedidos de compra de matérias-primas e insumos"
      icon="shopping_bag"
      createLabel="Nova Compra"
      successMsg="A compra foi registrada."
      fields={[
        {
          name: "fornecedor",
          label: "Fornecedor",
          required: true,
          placeholder: "Ex: Galena",
        },
        {
          name: "item",
          label: "Item",
          required: true,
          placeholder: "Ex: Frascos 100ml",
        },
        {
          name: "qtd",
          label: "Quantidade",
          required: true,
          placeholder: "Ex: 200",
        },
        {
          name: "valor",
          label: "Valor (R$)",
          required: true,
          placeholder: "Ex: 300,00",
        },
        { name: "data", label: "Data", type: "date", required: true },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          options: ["Em análise", "Aprovado", "Recebido"],
        },
      ]}
      buildPayload={(f) => {
        const [a, m, d] = f.data.split("-");
        return { ...f, data: `${d}/${m}/${a}` };
      }}
      columns={[
        {
          key: "fornecedor",
          label: "Fornecedor",
          render: (i) => <b>{i.fornecedor}</b>,
        },
        { key: "item", label: "Item" },
        { key: "qtd", label: "Qtd" },
        { key: "valor", label: "Valor" },
        { key: "data", label: "Data" },
        { key: "status", label: "Status" },
      ]}
      kpis={(lista) => (
        <>
          <KpiCard
            label="Compras"
            value={lista.length}
            icon="shopping_bag"
            sub="Registradas"
          />
          <KpiCard
            label="Recebidas"
            value={lista.filter((c) => c.status === "Recebido").length}
            icon="check_circle"
            sub="Concluídas"
            variant="gold"
            delay={0.05}
          />
        </>
      )}
    />
  );
}

export function ProdutosProntosPage() {
  return (
    <CrudModule
      dataKey="produtosProntos"
      title="Produtos Prontos"
      subtitle="Fórmulas finalizadas aguardando retirada"
      icon="inventory"
      createLabel="Novo Produto Pronto"
      successMsg="O produto foi adicionado."
      fields={[
        {
          name: "produto",
          label: "Produto",
          required: true,
          placeholder: "Ex: Xarope Z",
        },
        {
          name: "cliente",
          label: "Cliente",
          required: true,
          placeholder: "Ex: Maria Cliente",
        },
        {
          name: "lote",
          label: "Lote",
          required: true,
          placeholder: "Ex: L001",
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          options: ["Disponível", "Reservado", "Entregue"],
        },
        { name: "fab", label: "Fabricação", type: "date", required: true },
        { name: "val", label: "Validade", type: "date", required: true },
      ]}
      buildPayload={(f) => {
        const fmt = (iso) => {
          const [a, m, d] = iso.split("-");
          return `${d}/${m}/${a}`;
        };
        return { ...f, fab: fmt(f.fab), val: fmt(f.val) };
      }}
      columns={[
        { key: "produto", label: "Produto", render: (i) => <b>{i.produto}</b> },
        { key: "cliente", label: "Cliente" },
        { key: "lote", label: "Lote" },
        { key: "status", label: "Status" },
        { key: "fab", label: "Fabricação" },
        {
          key: "val",
          label: "Validade",
          render: (i) => <ValidadeBadge data={i.val} />,
        },
      ]}
      kpis={(lista) => (
        <>
          <KpiCard
            label="Total"
            value={lista.length}
            icon="inventory"
            sub="Produtos"
          />
          <KpiCard
            label="Disponíveis"
            value={lista.filter((p) => p.status === "Disponível").length}
            icon="check_circle"
            sub="Aguardando retirada"
            variant="gold"
            delay={0.05}
          />
          <KpiCard
            label="Vencidos / vencendo"
            value={
              lista.filter((p) => {
                const d = diasParaVencer(p.val);
                return d !== null && d <= 30;
              }).length
            }
            icon="warning"
            sub="Nos próximos 30 dias"
            variant="red"
            delay={0.1}
          />
        </>
      )}
    />
  );
}

export function BibliotecaPage() {
  return (
    <CrudModule
      dataKey="biblioteca"
      title="Biblioteca de Fórmulas"
      subtitle="Material técnico e referências farmacêuticas"
      icon="menu_book"
      createLabel="Novo Material"
      successMsg="O material foi adicionado à biblioteca."
      fields={[
        {
          name: "titulo",
          label: "Título",
          required: true,
          placeholder: "Ex: Manual de Boas Práticas",
        },
        {
          name: "categoria",
          label: "Categoria",
          type: "select",
          required: true,
          options: [
            "Boas Práticas",
            "Farmacotécnica",
            "Legislação",
            "Estabilidade",
            "Segurança",
            "Outras",
          ],
        },
        {
          name: "autor",
          label: "Autor",
          required: true,
          placeholder: "Ex: ANVISA",
        },
      ]}
      buildPayload={(f) => ({
        ...f,
        data: hoje(),
        dataISO: new Date().toISOString().slice(0, 10),
      })}
      columns={[
        { key: "titulo", label: "Título", render: (i) => <b>{i.titulo}</b> },
        { key: "categoria", label: "Categoria" },
        { key: "autor", label: "Autor" },
        { key: "data", label: "Data" },
      ]}
      kpis={(lista) => (
        <>
          <KpiCard
            label="Materiais"
            value={lista.length}
            icon="menu_book"
            sub="Na biblioteca"
          />
        </>
      )}
    />
  );
}

export function FormulasPage() {
  return (
    <CrudModule
      dataKey="formulas"
      title="Fórmulas Magistrais"
      subtitle="Cadastro de fórmulas manipuladas"
      icon="biotech"
      createLabel="Nova Fórmula"
      successMsg="A fórmula foi cadastrada."
      fields={[
        {
          name: "nome",
          label: "Nome",
          required: true,
          placeholder: "Ex: Creme Tretinona 0,05%",
        },
        {
          name: "categoria",
          label: "Categoria",
          type: "select",
          required: true,
          options: [
            "Dermatológica",
            "Capilar",
            "Nutracêutica",
            "Veterinária",
            "Homeopática",
            "Outras",
          ],
        },
        {
          name: "forma",
          label: "Forma Farmacêutica",
          type: "select",
          required: true,
          options: [
            "Cápsulas",
            "Cremes Dermatológicos",
            "Florais de Bach",
            "Géis",
            "Manipulados Líquidos",
            "Outros",
          ],
        },
        {
          name: "validade",
          label: "Validade",
          required: true,
          placeholder: "Ex: 90 dias",
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          options: ["Ativo", "Inativo"],
        },
      ]}
      columns={[
        { key: "nome", label: "Nome", render: (i) => <b>{i.nome}</b> },
        { key: "categoria", label: "Categoria" },
        { key: "forma", label: "Forma" },
        { key: "validade", label: "Validade" },
        { key: "status", label: "Status" },
      ]}
      kpis={(lista) => (
        <>
          <KpiCard
            label="Fórmulas"
            value={lista.length}
            icon="biotech"
            sub="Cadastradas"
          />
          <KpiCard
            label="Ativas"
            value={lista.filter((f) => f.status === "Ativo").length}
            icon="check_circle"
            sub="Em uso"
            variant="gold"
            delay={0.05}
          />
        </>
      )}
    />
  );
}

export function AgendaPage() {
  return (
    <CrudModule
      dataKey="compromissos"
      title="Agenda"
      subtitle="Compromissos, entregas e consultas"
      icon="event"
      createLabel="Novo Compromisso"
      successMsg="O compromisso foi agendado."
      fields={[
        {
          name: "nome",
          label: "Nome",
          required: true,
          placeholder: "Ex: Reunião cliente",
        },
        {
          name: "tipo",
          label: "Tipo",
          type: "select",
          required: true,
          options: ["Entrega", "Retirada", "Consulta", "Retorno"],
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          options: ["Agendado", "Confirmado", "Concluído", "Cancelado"],
        },
        { name: "data", label: "Data", type: "date", required: true },
        { name: "hora", label: "Hora", type: "time", required: true },
        { name: "obs", label: "Observações", placeholder: "Opcional" },
      ]}
      buildPayload={(f) => {
        const [a, m, d] = f.data.split("-");
        return { ...f, dataISO: f.data, data: `${d}/${m}/${a}` };
      }}
      columns={[
        { key: "nome", label: "Nome", render: (i) => <b>{i.nome}</b> },
        { key: "tipo", label: "Tipo" },
        { key: "data", label: "Data" },
        { key: "hora", label: "Hora" },
        { key: "status", label: "Status" },
      ]}
      kpis={(lista) => (
        <>
          <KpiCard
            label="Compromissos"
            value={lista.length}
            icon="event"
            sub="Agendados"
          />
          <KpiCard
            label="Hoje"
            value={
              lista.filter(
                (c) => c.dataISO === new Date().toISOString().slice(0, 10),
              ).length
            }
            icon="today"
            sub="Para hoje"
            variant="gold"
            delay={0.05}
          />
        </>
      )}
    />
  );
}

export function ProducaoPage() {
  return (
    <CrudModule
      dataKey="producoes"
      title="Produção"
      subtitle="Acompanhamento das manipulações em andamento"
      icon="science"
      createLabel="Nova Produção"
      successMsg="A produção foi registrada."
      fields={[
        {
          name: "formula",
          label: "Fórmula",
          required: true,
          placeholder: "Ex: Creme X 2%",
        },
        {
          name: "tipo",
          label: "Tipo",
          type: "select",
          required: true,
          options: [
            "Cápsulas",
            "Cremes Dermatológicos",
            "Florais de Bach",
            "Géis",
            "Manipulados Líquidos",
            "Outros",
          ],
        },
        {
          name: "farmaceutico",
          label: "Farmacêutico Responsável",
          required: true,
          placeholder: "Ex: Ana Farmacêutica",
        },
        { name: "inicio", label: "Início", type: "time", required: true },
        { name: "prazo", label: "Prazo", type: "time", required: true },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          options: ["Aguardando", "Em Produção", "Concluído"],
        },
      ]}
      buildPayload={(f) => ({ ...f, hoje: true })}
      columns={[
        { key: "formula", label: "Fórmula", render: (i) => <b>{i.formula}</b> },
        { key: "tipo", label: "Tipo" },
        { key: "farmaceutico", label: "Farmacêutico" },
        { key: "inicio", label: "Início" },
        { key: "prazo", label: "Prazo" },
        { key: "status", label: "Status" },
      ]}
      kpis={(lista) => (
        <>
          <KpiCard
            label="Em produção"
            value={lista.filter((p) => p.status === "Em Produção").length}
            icon="science"
            sub="Ativas agora"
          />
          <KpiCard
            label="Concluídas"
            value={lista.filter((p) => p.status === "Concluído").length}
            icon="check_circle"
            sub="Finalizadas"
            variant="gold"
            delay={0.05}
          />
        </>
      )}
    />
  );
}

export function EstoquePage() {
  return (
    <CrudModule
      dataKey="pedidos"
      title="Estoque de Insumos"
      subtitle="Matérias-primas e insumos usados na manipulação"
      icon="inventory_2"
      createLabel="Novo Insumo"
      successMsg="O insumo foi adicionado ao estoque."
      fields={[
        {
          name: "produto",
          label: "Produto",
          type: "select",
          required: true,
          options: [
            "Metformina 500mg",
            "Base Creme Não Iônica",
            "Cápsulas HPMC Nº1",
            "Óleo de Melaleuca",
            "Pantenol 99%",
            "Silimarina Extrato",
            "Ácido Hialurônico",
            "Excipiente Gel Base",
            "Outro",
          ],
        },
        {
          name: "fornecedor",
          label: "Fornecedor",
          type: "select",
          required: true,
          options: [
            "FarmaBase",
            "Galena",
            "CapsulMax",
            "NaturaFarma",
            "Mapric",
            "Croda",
          ],
        },
        {
          name: "qtdAtual",
          label: "Quantidade",
          required: true,
          placeholder: "Ex: 50",
        },
        {
          name: "unid",
          label: "Unidade",
          type: "select",
          required: true,
          options: ["g", "kg", "ml", "L", "un", "cx"],
        },
        {
          name: "urgencia",
          label: "Urgência",
          type: "select",
          required: true,
          options: ["Normal", "Urgente", "Crítico"],
        },
      ]}
      buildPayload={(f) => {
        const qtd = parseInt(f.qtdAtual) || 0;
        return {
          produto: f.produto,
          categoria: "Matéria-prima",
          qtdAtual: qtd,
          qtdMin: Math.floor(qtd * 0.3),
          unid: f.unid,
          fornecedor: f.fornecedor,
          status:
            f.urgencia === "Crítico"
              ? "Crítico"
              : f.urgencia === "Urgente"
                ? "Urgente"
                : "OK",
          _novo: true,
        };
      }}
      columns={[
        { key: "produto", label: "Produto", render: (i) => <b>{i.produto}</b> },
        { key: "fornecedor", label: "Fornecedor" },
        {
          key: "qtdAtual",
          label: "Qtd Atual",
          render: (i) => `${i.qtdAtual} ${i.unid}`,
        },
        { key: "qtdMin", label: "Qtd Mín." },
        { key: "status", label: "Status" },
      ]}
      kpis={(lista) => (
        <>
          <KpiCard
            label="Itens"
            value={lista.length}
            icon="inventory_2"
            sub="No estoque"
          />
          <KpiCard
            label="Críticos"
            value={lista.filter((p) => p.status === "Crítico").length}
            icon="warning"
            sub="Repor urgente"
            variant="red"
            delay={0.05}
          />
        </>
      )}
    />
  );
}

// Calcula se uma promoção está Agendada (ainda não começou), Ativa (dentro
// do período) ou Expirada (já passou), comparando com a data de hoje.
function statusPromocao(promo) {
  const inicio = parseDataBR(promo.dataInicio);
  const fim = parseDataBR(promo.dataFim);
  const agora = new Date();
  agora.setHours(0, 0, 0, 0);
  if (fim && agora > fim) return "Expirada";
  if (inicio && agora < inicio) return "Agendada";
  return "Ativa";
}

export function PromocoesPage() {
  const { data } = useData();
  const produtos = data.produtosIndustrializados || [];

  function nomeProduto(id) {
    if (id === "todos") return "Todos os produtos";
    const p = produtos.find((p) => String(p.id) === String(id));
    return p ? p.nome : "Produto removido";
  }

  return (
    <CrudModule
      dataKey="promocoes"
      title="Promoções"
      subtitle="Descontos por período em produtos não manipulados, aplicados automaticamente no PDV"
      icon="sell"
      createLabel="Nova Promoção"
      successMsg="A promoção foi cadastrada e já vale para as vendas dentro do período."
      fields={[
        {
          name: "nome",
          label: "Nome da promoção",
          required: true,
          placeholder: "Ex: Queima de estoque - Protetor solar",
        },
        {
          name: "produtoId",
          label: "Produto",
          type: "select",
          required: true,
          options: () => [
            { value: "todos", label: "Todos os produtos (loja toda)" },
            ...produtos.map((p) => ({ value: String(p.id), label: p.nome })),
          ],
        },
        {
          name: "tipoDesconto",
          label: "Tipo de desconto",
          type: "select",
          required: true,
          options: ["Percentual (%)", "Valor fixo (R$)"],
        },
        {
          name: "valorDesconto",
          label: "Valor do desconto",
          required: true,
          placeholder: "Ex: 10 (para 10%) ou 5,00",
        },
        { name: "dataInicio", label: "Início", type: "date", required: true },
        { name: "dataFim", label: "Fim", type: "date", required: true },
      ]}
      buildPayload={(f) => {
        const [ai, mi, di] = f.dataInicio.split("-");
        const [af, mf, df] = f.dataFim.split("-");
        return {
          nome: f.nome,
          produtoId: f.produtoId,
          tipoDesconto: f.tipoDesconto,
          valorDesconto: parseMoedaBR(f.valorDesconto),
          dataInicio: `${di}/${mi}/${ai}`,
          dataFim: `${df}/${mf}/${af}`,
        };
      }}
      columns={[
        { key: "nome", label: "Promoção", render: (i) => <b>{i.nome}</b> },
        {
          key: "produtoId",
          label: "Produto",
          render: (i) => nomeProduto(i.produtoId),
        },
        {
          key: "valorDesconto",
          label: "Desconto",
          render: (i) =>
            i.tipoDesconto === "Percentual (%)"
              ? `${i.valorDesconto}%`
              : fmtMoedaBR(i.valorDesconto),
        },
        {
          key: "periodo",
          label: "Período",
          render: (i) => `${i.dataInicio} a ${i.dataFim}`,
        },
        {
          key: "status",
          label: "Status",
          render: (i) => {
            const s = statusPromocao(i);
            const cor =
              s === "Ativa"
                ? "var(--ok)"
                : s === "Agendada"
                  ? "var(--bm)"
                  : "var(--tl)";
            return <span style={{ color: cor, fontWeight: 700 }}>{s}</span>;
          },
        },
      ]}
      kpis={(lista) => (
        <>
          <KpiCard
            label="Promoções cadastradas"
            value={lista.length}
            icon="sell"
            sub="No total"
          />
          <KpiCard
            label="Ativas agora"
            value={lista.filter((p) => statusPromocao(p) === "Ativa").length}
            icon="local_offer"
            sub="Valendo no PDV"
            variant="gold"
            delay={0.05}
          />
        </>
      )}
      emptyMsg="Nenhuma promoção cadastrada ainda."
    />
  );
}
