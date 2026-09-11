// Temas visuais disponíveis no sistema. O "id" é o valor salvo no backend e
// usado no atributo data-tema do <html> — os estilos dos temas prontos
// ficam nos arquivos CSS (dashboard.css e login.css), em blocos
// [data-tema="id"]. "preview" é só pra desenhar a bolinha de cor no
// seletor de tema.
export const TEMAS = [
  {
    id: "coral",
    nome: "Coral (padrão)",
    preview: "#1b3f7a",
    preview2: "#e34d3f",
  },
  {
    id: "azul",
    nome: "Azul e Branco",
    preview: "#123a63",
    preview2: "#2f7fd1",
  },
  {
    id: "vermelho",
    nome: "Vermelho e Branco",
    preview: "#7a1f1f",
    preview2: "#d64545",
  },
  {
    id: "verde",
    nome: "Verde e Branco",
    preview: "#155c3a",
    preview2: "#2f9e63",
  },
  { id: "personalizado", nome: "Personalizada", preview: null, preview2: null },
];

const VARS_TEMA = [
  "--bd",
  "--bd2",
  "--bm",
  "--bl",
  "--g",
  "--g2",
  "--g-rgb",
  "--g-dark",
  "--gl",
];

function hexParaRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}
function rgbParaHex({ r, g, b }) {
  const c = (n) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
// Mistura a cor escolhida com preto ou branco (fator 0 a 1) pra gerar tons
// mais escuros (sidebar) ou mais claros (fundos) automaticamente, a partir
// de uma única cor que a farmácia escolher.
function misturar(hex, alvo, fator) {
  const a = hexParaRgb(hex);
  const b = hexParaRgb(alvo);
  return rgbParaHex({
    r: a.r + (b.r - a.r) * fator,
    g: a.g + (b.g - a.g) * fator,
    b: a.b + (b.b - a.b) * fator,
  });
}

// A partir de UMA cor escolhida pela farmácia, monta a paleta inteira
// (sidebar escura, destaque, fundos claros) de forma coerente.
export function paletaPersonalizada(corBase) {
  if (!/^#[0-9a-fA-F]{6}$/.test(corBase || "")) return null;
  const { r, g, b } = hexParaRgb(corBase);
  return {
    "--g": corBase,
    "--g2": misturar(corBase, "#ffffff", 0.25),
    "--g-rgb": `${r}, ${g}, ${b}`,
    "--g-dark": misturar(corBase, "#000000", 0.35),
    "--gl": misturar(corBase, "#ffffff", 0.88),
    "--bd": misturar(corBase, "#000000", 0.55),
    "--bd2": misturar(corBase, "#000000", 0.68),
    "--bm": misturar(corBase, "#000000", 0.15),
    "--bl": misturar(corBase, "#ffffff", 0.94),
  };
}

export function aplicarTema(tema, corPersonalizada) {
  if (!tema) return;
  document.documentElement.setAttribute("data-tema", tema);

  if (tema === "personalizado") {
    const paleta = paletaPersonalizada(corPersonalizada);
    if (paleta) {
      for (const [k, v] of Object.entries(paleta))
        document.documentElement.style.setProperty(k, v);
      return;
    }
  }
  // Fora do modo personalizado, remove qualquer variável que tenha ficado
  // fixada por estilo inline antes, senão ela "gruda" e não deixa o bloco
  // [data-tema] do CSS valer quando a pessoa troca pra um tema pronto.
  for (const k of VARS_TEMA) document.documentElement.style.removeProperty(k);
}

// ─── Modo claro/escuro ───
// Diferente da cor do tema (--g/--bd/etc, controlada só pelo Administrador
// e salva no servidor pra valer pra todo mundo), o modo claro/escuro é uma
// preferência PESSOAL de cada pessoa — cada um escolhe o seu, e fica salvo
// só no próprio navegador (não precisa de servidor nem de permissão especial).
const CHAVE_MODO = "af_modo_visual";

export function lerModoSalvo() {
  try {
    return localStorage.getItem(CHAVE_MODO) || "claro";
  } catch {
    return "claro";
  }
}

export function aplicarModo(modo) {
  const valido = modo === "escuro" ? "escuro" : "claro";
  document.documentElement.setAttribute("data-modo", valido);
  try {
    localStorage.setItem(CHAVE_MODO, valido);
  } catch {
    /* localStorage indisponível (modo privado etc.) — só não persiste entre sessões */
  }
}
