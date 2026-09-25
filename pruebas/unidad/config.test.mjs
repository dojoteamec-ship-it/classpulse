// Pruebas de lib/config-admin.ts. Correr: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarConfig } from "../../lib/config-admin.ts";

test("validarConfig acepta valores correctos", () => {
  assert.deepEqual(validarConfig("muestra_minima", "15"), { valor: 15 });
  assert.deepEqual(validarConfig("ghl_campo_nivel", "null"), { valor: null });
  assert.ok("valor" in validarConfig("horario_habil", '{"dias":[1,2,3,4,5],"inicio":"09:00","fin":"18:00","zona":"America/Guayaquil"}'));
  assert.ok("valor" in validarConfig("semana_a_referencia", '"2026-09-28"'));
  assert.ok("valor" in validarConfig("rangos_por_nivel", '{"1":["Rango 1","Rango 2"]}'));
});

test("validarConfig rechaza lo inválido", () => {
  assert.ok("error" in validarConfig("muestra_minima", "0"));
  assert.ok("error" in validarConfig("muestra_minima", "abc"));
  assert.ok("error" in validarConfig("horario_habil", '{"dias":[8],"inicio":"09:00","fin":"18:00"}'));
  assert.ok("error" in validarConfig("horario_habil", '{"dias":[1],"inicio":"18:00","fin":"09:00"}'));
  assert.ok("error" in validarConfig("semana_a_referencia", '"2026-09-29"'));
  assert.ok("error" in validarConfig("palabras_clave", '["ok", "reembolso"]'));
  assert.ok("error" in validarConfig("clave_inventada", "1"));
});
