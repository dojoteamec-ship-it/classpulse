// Cálculo de KPIs (plan 4.1). Funciones puras, sin dependencias: las prueba
// pruebas/unidad/metricas.test.mjs con Node.
//
// Reglas de lectura (4.1): cada cifra lleva su n; con n < muestraMinima se
// muestra atenuada; se muestra la distribución, no solo el promedio; nunca se
// comparan tipos de sesión distintos.

export type FilaClase = {
  csat: number | null;
  distintiva_banda: "roja" | "amarilla" | "verde" | "neutra" | null;
  asistencia: "en_vivo" | "grabacion" | "no_asistio" | null;
  motivo_inasistencia: string | null;
  chips: string[] | null;
  tipo_sesion: string | null;
  fecha_clase: string | null;
  canal_entrada: "personal" | "general";
};

export type FilaCinturon = {
  nps: number | null;
  nes: string | null;
  aplicacion: string | null;
  dificultad: number | null;
  ces: number | null;
  clientes_activos: string | null;
};

export const MUESTRA_MINIMA = 15;

const promedio = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const proporcion = (a: number, n: number) => (n ? a / n : null);
function contar<T extends string>(xs: (T | null | undefined)[]) {
  const c: Record<string, number> = {};
  for (const x of xs) if (x) c[x] = (c[x] ?? 0) + 1;
  return c;
}

export type ResumenClase = {
  total: number;
  n: number;
  csatMedio: number | null;
  top2: number | null;
  bottom2: number | null;
  distribucion: [number, number, number, number, number];
  bandas: { roja: number; amarilla: number; verde: number; n: number; neutras: number };
  inasistencia: number | null;
  motivos: Record<string, number>;
};

export function resumenClase(filas: FilaClase[]): ResumenClase {
  const asistieron = filas.filter((f) => f.asistencia !== "no_asistio");
  const notas = asistieron.map((f) => f.csat).filter((c): c is number => typeof c === "number");
  const distribucion: ResumenClase["distribucion"] = [0, 0, 0, 0, 0];
  for (const c of notas) if (c >= 1 && c <= 5) distribucion[c - 1]++;
  const b = contar(asistieron.map((f) => f.distintiva_banda));
  const nBandas = (b.roja ?? 0) + (b.amarilla ?? 0) + (b.verde ?? 0);
  const faltaron = filas.filter((f) => f.asistencia === "no_asistio");
  return {
    total: filas.length,
    n: notas.length,
    csatMedio: promedio(notas),
    top2: proporcion(notas.filter((c) => c >= 4).length, notas.length),
    bottom2: proporcion(notas.filter((c) => c <= 2).length, notas.length),
    distribucion,
    bandas: { roja: b.roja ?? 0, amarilla: b.amarilla ?? 0, verde: b.verde ?? 0, n: nBandas, neutras: b.neutra ?? 0 },
    inasistencia: proporcion(faltaron.length, filas.length),
    motivos: contar(faltaron.map((f) => f.motivo_inasistencia)),
  };
}

export type ResumenCinturon = {
  n: number;
  nps: number | null;
  promotores: number;
  pasivos: number;
  detractores: number;
  nes: Record<string, number>;
  nesTop2: number | null;
  nNes: number;
  ces: number | null;
  nCes: number;
  dificultad: number | null;
  aplicacion: Record<string, number>;
  clientes: Record<string, number>;
};

export function resumenCinturon(filas: FilaCinturon[], nesSuperiores: string[]): ResumenCinturon {
  const notas = filas.map((f) => f.nps).filter((x): x is number => typeof x === "number");
  const promotores = notas.filter((x) => x >= 9).length;
  const detractores = notas.filter((x) => x <= 6).length;
  const nes = contar(filas.map((f) => f.nes));
  const nNes = Object.values(nes).reduce((a, b) => a + b, 0);
  const ces = filas.map((f) => f.ces).filter((x): x is number => typeof x === "number");
  return {
    n: notas.length,
    nps: notas.length ? Math.round(((promotores - detractores) / notas.length) * 100) : null,
    promotores,
    pasivos: notas.length - promotores - detractores,
    detractores,
    nes,
    nesTop2: proporcion(nesSuperiores.reduce((a, k) => a + (nes[k] ?? 0), 0), nNes),
    nNes,
    ces: promedio(ces),
    nCes: ces.length,
    dificultad: promedio(filas.map((f) => f.dificultad).filter((x): x is number => typeof x === "number")),
    aplicacion: contar(filas.map((f) => f.aplicacion)),
    clientes: contar(filas.map((f) => f.clientes_activos)),
  };
}

// Frecuencia de chips agrupada por dimensión SEEQ, separando positivos y negativos.
export function chipsPorDimension(
  filas: Pick<FilaClase, "chips">[],
  catalogo: { codigo: string; dimension: string }[],
  positivos: Set<string>,
) {
  const dim = new Map(catalogo.map((c) => [c.codigo, c.dimension]));
  const salida: Record<string, { positivos: number; negativos: number; chips: Record<string, number> }> = {};
  for (const f of filas) {
    for (const c of f.chips ?? []) {
      const d = dim.get(c);
      if (!d) continue;
      salida[d] ??= { positivos: 0, negativos: 0, chips: {} };
      salida[d][positivos.has(c) ? "positivos" : "negativos"]++;
      salida[d].chips[c] = (salida[d].chips[c] ?? 0) + 1;
    }
  }
  return salida;
}

// Lunes de la semana de una fecha "YYYY-MM-DD".
export function lunesDe(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

// CSAT medio por semana (lunes) en la ventana, con su n. Semanas sin datos: null.
export function tendenciaSemanal(filas: Pick<FilaClase, "csat" | "fecha_clase" | "asistencia">[], hasta: string, semanas = 13) {
  const fin = lunesDe(hasta);
  const claves: string[] = [];
  for (let i = semanas - 1; i >= 0; i--) {
    const d = new Date(`${fin}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 7 * i);
    claves.push(d.toISOString().slice(0, 10));
  }
  const grupos = new Map<string, number[]>(claves.map((k) => [k, []]));
  for (const f of filas) {
    if (!f.fecha_clase || f.asistencia === "no_asistio" || typeof f.csat !== "number") continue;
    grupos.get(lunesDe(f.fecha_clase))?.push(f.csat);
  }
  return claves.map((semana) => {
    const xs = grupos.get(semana)!;
    return { semana, csat: promedio(xs), n: xs.length };
  });
}

export const esMuestraPequena = (n: number, minima = MUESTRA_MINIMA) => n < minima;

// Tasa de respuesta del enlace personal: respuestas personales / correos enviados.
export const tasaRespuesta = (respuestasPersonales: number, correos: number) =>
  correos > 0 ? Math.min(1, respuestasPersonales / correos) : null;
