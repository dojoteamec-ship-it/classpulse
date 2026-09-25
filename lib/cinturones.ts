// Identidad visual de cada cinturón: color del obi y kanji decorativo.
export const OBI: Record<string, { color: string; texto: string; kanji: string }> = {
  blanco: { color: "#e9e4d8", texto: "#1a1a1a", kanji: "白" },
  amarillo: { color: "#e2b53a", texto: "#1d1606", kanji: "黄" },
  naranja: { color: "#e07a2e", texto: "#1e0e03", kanji: "橙" },
  verde: { color: "#3a9a5c", texto: "#f3fbf5", kanji: "緑" },
  azul: { color: "#3469c9", texto: "#f2f6ff", kanji: "青" },
  marron: { color: "#7c4a2b", texto: "#fbf1ea", kanji: "茶" },
  negro: { color: "#0d0d10", texto: "#7fe0ff", kanji: "黒" },
};

export const obiDe = (slug: string) => OBI[slug] ?? OBI.blanco;
