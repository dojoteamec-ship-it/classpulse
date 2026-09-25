// Pruebas de lib/metricas.ts. Correr: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chipsPorDimension,
  esMuestraPequena,
  lunesDe,
  resumenCinturon,
  resumenClase,
  tasaRespuesta,
  tendenciaSemanal,
} from "../../lib/metricas.ts";

const fila = (o) => ({ csat: null, distintiva_banda: null, asistencia: "en_vivo", motivo_inasistencia: null, chips: [], tipo_sesion: "kata", fecha_clase: "2026-09-24", canal_entrada: "general", ...o });

test("resumenClase: promedio, top2, bottom2, distribución y bandas sin neutras", () => {
  const r = resumenClase([
    fila({ csat: 5, distintiva_banda: "verde" }),
    fila({ csat: 4, distintiva_banda: "amarilla" }),
    fila({ csat: 2, distintiva_banda: "roja" }),
    fila({ csat: 1, distintiva_banda: "neutra" }),
    fila({ asistencia: "no_asistio", motivo_inasistencia: "horario" }),
  ]);
  assert.equal(r.total, 5);
  assert.equal(r.n, 4);
  assert.equal(r.csatMedio, 3);
  assert.equal(r.top2, 0.5);
  assert.equal(r.bottom2, 0.5);
  assert.deepEqual(r.distribucion, [1, 1, 0, 1, 1]);
  assert.deepEqual(r.bandas, { roja: 1, amarilla: 1, verde: 1, n: 3, neutras: 1 });
  assert.equal(r.inasistencia, 0.2);
  assert.deepEqual(r.motivos, { horario: 1 });
});

test("resumenClase: sin datos no inventa cifras", () => {
  const r = resumenClase([]);
  assert.equal(r.csatMedio, null);
  assert.equal(r.top2, null);
  assert.equal(r.inasistencia, null);
});

test("resumenCinturon: NPS = % promotores menos % detractores", () => {
  const filas = [10, 9, 9, 8, 7, 6, 0].map((nps) => ({ nps, nes: nps >= 9 ? "efectivo" : "faltan_mejoras", aplicacion: null, dificultad: 3, ces: 6, clientes_activos: null }));
  const r = resumenCinturon(filas, ["efectivo", "muy_efectivo"]);
  assert.equal(r.n, 7);
  assert.equal(r.promotores, 3);
  assert.equal(r.detractores, 2);
  assert.equal(r.pasivos, 2);
  assert.equal(r.nps, Math.round(((3 - 2) / 7) * 100));
  assert.equal(r.nesTop2, 3 / 7);
  assert.equal(r.ces, 6);
});

test("chipsPorDimension separa positivos y negativos", () => {
  const cat = [{ codigo: "explico_claro", dimension: "claridad" }, { codigo: "poco_claro", dimension: "claridad" }, { codigo: "audio_conexion", dimension: "tecnico" }];
  const r = chipsPorDimension([{ chips: ["explico_claro", "poco_claro"] }, { chips: ["poco_claro", "audio_conexion", "desconocido"] }], cat, new Set(["explico_claro"]));
  assert.equal(r.claridad.positivos, 1);
  assert.equal(r.claridad.negativos, 2);
  assert.equal(r.tecnico.negativos, 1);
  assert.equal(r.claridad.chips.poco_claro, 2);
});

test("lunesDe y tendenciaSemanal", () => {
  assert.equal(lunesDe("2026-09-27"), "2026-09-21"); // domingo
  assert.equal(lunesDe("2026-09-28"), "2026-09-28"); // lunes
  const t = tendenciaSemanal([fila({ csat: 4, fecha_clase: "2026-09-22" }), fila({ csat: 2, fecha_clase: "2026-09-24" }), fila({ csat: 5, fecha_clase: "2026-09-10" })], "2026-09-25", 3);
  assert.deepEqual(t.map((x) => x.semana), ["2026-09-07", "2026-09-14", "2026-09-21"]);
  assert.deepEqual(t.map((x) => x.csat), [5, null, 3]);
  assert.deepEqual(t.map((x) => x.n), [1, 0, 2]);
});

test("muestra pequeña y tasa de respuesta", () => {
  assert.equal(esMuestraPequena(14), true);
  assert.equal(esMuestraPequena(15), false);
  assert.equal(tasaRespuesta(4, 10), 0.4);
  assert.equal(tasaRespuesta(3, 0), null);
});
