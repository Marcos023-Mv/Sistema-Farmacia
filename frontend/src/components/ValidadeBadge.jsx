import React from "react";
import { diasParaVencer } from "../api.js";

/**
 * Mostra a data de validade com cor de acordo com a proximidade do
 * vencimento: vermelho (vencido), laranja (vence em até 30 dias), normal.
 */
export default function ValidadeBadge({ data, diasAlerta = 30 }) {
  if (!data) return <span>-</span>;
  const dias = diasParaVencer(data);

  if (dias === null) return <span>{data}</span>;
  if (dias < 0) {
    return (
      <span
        style={{
          color: "var(--err)",
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
          error
        </span>
        {data} (vencido)
      </span>
    );
  }
  if (dias <= diasAlerta) {
    return (
      <span
        style={{
          color: "#dd6b20",
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
          schedule
        </span>
        {data} ({dias}d)
      </span>
    );
  }
  return <span>{data}</span>;
}
