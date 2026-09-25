// Pruebas de lib/kaizen.ts. Correr: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { dijisteHicimos, formatoMetrica, mejoro, sinGuiones } from "../../lib/kaizen.ts";

test("sinGuiones quita guiones y rayas", () => {
  assert.equal(sinGuiones("Clase muy rápida — no hubo pausas"), "Clase muy rápida, no hubo pausas");
  assert.equal(sinGuiones("Ritmo - mejor ahora"), "Ritmo, mejor ahora");
  assert.equal(sinGuiones("e-mail y co-mentor"), "e mail y co mentor");
  assert.equal(sinGuiones("- viñeta"), "viñeta");
  assert.ok(!/[-—–]/.test(sinGuiones("a — b – c - d-e")));
});

test("dijisteHicimos arma el texto sin guiones", () => {
  const t = dijisteHicimos("Cinturón Amarillo · Nivel 1", "2026-09", [
    { problema: "La Kata va muy rápido — nos perdemos", accion: "Pausa de dudas cada 15 minutos" },
  ]);
  assert.ok(t.startsWith("Dijiste, hicimos · Cinturón Amarillo · Nivel 1 · septiembre de 2026"));
  assert.ok(t.includes("• Dijiste: La Kata va muy rápido, nos perdemos"));
  assert.ok(t.includes("Hicimos: Pausa de dudas cada 15 minutos"));
  assert.ok(!/[-—–]/.test(t));
  assert.ok(dijisteHicimos("Comunidad Ronin", "2026-10", []).includes("no hay cambios"));
});

test("mejoro respeta la dirección de cada métrica", () => {
  assert.equal(mejoro("csat_medio", { valor: 3.5, n: 20 }, { valor: 4.1, n: 18 }), true);
  assert.equal(mejoro("bottom2", { valor: 0.2, n: 20 }, { valor: 0.1, n: 18 }), true);
  assert.equal(mejoro("distintiva_roja", { valor: 0.1, n: 20 }, { valor: 0.3, n: 18 }), false);
  assert.equal(mejoro("csat_medio", { valor: null, n: 0 }, { valor: 4, n: 3 }), null);
});

test("formatoMetrica", () => {
  assert.equal(formatoMetrica("csat_medio", 4.256), "4,26");
  assert.equal(formatoMetrica("top2", 0.8), "80 %");
  assert.equal(formatoMetrica("nps", "33"), "33");
  assert.equal(formatoMetrica("nps", null), "—");
});
