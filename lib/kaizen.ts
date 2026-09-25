// Ciclo Kaizen (plan 6). Funciones puras: las prueba pruebas/unidad/kaizen.test.mjs.

export type EstadoPdca = "planificar" | "hacer" | "verificar" | "estandarizar" | "descartar";
export const ESTADO_PDCA: Record<EstadoPdca, string> = {
  planificar: "Planificar",
  hacer: "Hacer",
  verificar: "Verificar",
  estandarizar: "Estandarizar",
  descartar: "Descartada",
};
export const ORDEN_PDCA: EstadoPdca[] = ["planificar", "hacer", "verificar", "estandarizar", "descartar"];

export type MetricaKaizen = "csat_medio" | "top2" | "bottom2" | "distintiva_roja" | "nps";
export const METRICA: Record<MetricaKaizen, { texto: string; mejor: "sube" | "baja"; formato: "nota" | "pct" | "entero" }> = {
  csat_medio: { texto: "CSAT medio", mejor: "sube", formato: "nota" },
  top2: { texto: "% Top 2", mejor: "sube", formato: "pct" },
  bottom2: { texto: "% Bottom 2", mejor: "baja", formato: "pct" },
  distintiva_roja: { texto: "% distintiva en rojo", mejor: "baja", formato: "pct" },
  nps: { texto: "NPS de Cinturón", mejor: "sube", formato: "entero" },
};

export type Medicion = { valor: number | string | null; n: number; desde?: string; hasta?: string } | null;

export function formatoMetrica(m: MetricaKaizen, v: number | string | null | undefined) {
  if (v === null || v === undefined) return "—";
  const x = Number(v);
  const f = METRICA[m].formato;
  if (f === "pct") return `${Math.round(x * 100)} %`;
  if (f === "entero") return String(Math.round(x));
  return x.toFixed(2).replace(".", ",");
}

// ¿Mejoró? null si falta un dato.
export function mejoro(m: MetricaKaizen, antes: Medicion, despues: Medicion): boolean | null {
  if (!antes || !despues || antes.valor === null || despues.valor === null) return null;
  const a = Number(antes.valor), d = Number(despues.valor);
  if (a === d) return false;
  return METRICA[m].mejor === "sube" ? d > a : d < a;
}

// Quita guiones y rayas: el texto lo lee el alumno.
export function sinGuiones(texto: string): string {
  return texto
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s+-\s+/g, ", ")
    .replace(/(\p{L})-(\p{L})/gu, "$1 $2")
    .replace(/^\s*-\s*/gm, "")
    .replace(/-/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const nombreMes = (aaaamm: string) => {
  const [a, m] = aaaamm.split("-").map(Number);
  return `${MESES[m - 1]} de ${a}`;
};

// Texto mensual «Dijiste, hicimos» de un Grupo, listo para que Anita lo publique.
export function dijisteHicimos(grupo: string, aaaamm: string, acciones: { problema: string; accion: string }[]): string {
  const titulo = `Dijiste, hicimos · ${sinGuiones(grupo)} · ${nombreMes(aaaamm)}`;
  if (!acciones.length) return `${titulo}\n\nEste mes no hay cambios para publicar en este Grupo.`;
  const cuerpo = acciones
    .map((a) => `• Dijiste: ${sinGuiones(a.problema)}\n  Hicimos: ${sinGuiones(a.accion)}`)
    .join("\n\n");
  return `${titulo}\n\nGracias por contarnos cómo van las clases. Esto es lo que cambiamos este mes gracias a tu feedback:\n\n${cuerpo}\n\nSigue contándonos después de cada clase: te leemos.`;
}
