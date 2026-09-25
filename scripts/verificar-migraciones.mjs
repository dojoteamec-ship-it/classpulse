#!/usr/bin/env node
// Revisa cada migración de migrations/ y la rechaza si crea, altera, borra,
// da permisos o escribe datos sobre un objeto sin el prefijo cp_.
// ClassPulse solo puede LEER mentores, cinturones y auth.users (plan, 7.2).
//
// Uso: npm run verificar-migraciones [-- archivo.sql ...]
// Sale con código 1 si encuentra una violación.
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

const DIR = new URL("../migrations/", import.meta.url).pathname;
const NOMBRE_ARCHIVO = /^cp_\d{4}(_[a-z0-9_]+)?\.sql$/;
const ID = String.raw`(?:[a-z_][a-z0-9_$]*\.)?[a-z_][a-z0-9_$]*`;

// Objetos cuyo nombre debe empezar con cp_ (en public, sin esquema explícito).
function esPropio(nombre) {
  const n = nombre.toLowerCase().replace(/^public\./, "");
  return !n.includes(".") && n.startsWith("cp_");
}

function limpiar(sql) {
  let t = sql.replace(/\/\*[\s\S]*?\*\//g, " ");
  t = t.replace(/--[^\n]*/g, " ");
  return t.toLowerCase();
}

function revisar(archivo, texto) {
  const errores = [];
  const falla = (motivo, fragmento) =>
    errores.push(`${archivo}: ${motivo}\n    → ${fragmento.replace(/\s+/g, " ").trim().slice(0, 140)}`);

  if (!NOMBRE_ARCHIVO.test(basename(archivo))) {
    falla("el archivo debe llamarse cp_XXXX_descripcion.sql", basename(archivo));
  }

  const crudo = limpiar(texto);

  // Nombres de trabajos de pg_cron (antes de quitar los textos).
  for (const m of crudo.matchAll(/cron\.(un)?schedule\s*\(\s*'([^']*)'/g)) {
    if (!m[2].startsWith("cp_")) falla(`trabajo de pg_cron sin prefijo cp_: ${m[2]}`, m[0]);
  }

  // Quita textos entre comillas simples e identificadores entre comillas dobles.
  const t = crudo.replace(/'(?:[^']|'')*'/g, "''").replace(/"(?:[^"]|"")*"/g, "cp_nombre_citado");

  const reglas = [
    // Siempre prohibido: cambia objetos globales o compartidos.
    [/\b(create|alter|drop)\s+(schema|extension|role|user|publication|subscription|event\s+trigger|database|server|foreign\s+data\s+wrapper)\b[^;]*/g, () => "objeto global o compartido"],
    [/\balter\s+default\s+privileges\b[^;]*/g, () => "alter default privileges"],
    [/\balter\s+system\b[^;]*/g, () => "alter system"],
    [/\bsecurity\s+label\b[^;]*/g, () => "security label"],
    [/\bexecute\s+(format\s*\(|''|\$)[^;]*/g, () => "SQL dinámico (no verificable)"],
    [/\bon\s+(all\s+(tables|functions|sequences|routines)\s+in\s+schema|schema)\b[^;]*/g, () => "permisos sobre un esquema completo"],
  ];
  for (const [re, motivo] of reglas) for (const m of t.matchAll(re)) falla(motivo(m), m[0]);

  const revisarNombre = (nombre, que, fragmento) => {
    if (!esPropio(nombre)) falla(`${que} sin prefijo cp_: ${nombre}`, fragmento);
  };

  // create / alter / drop de objetos con nombre.
  const tipos = String.raw`(?:table|view|materialized\s+view|function|procedure|type|sequence|index|trigger|domain|rule|aggregate|operator|policy)`;
  const reCrear = new RegExp(
    String.raw`\bcreate\s+(?:or\s+replace\s+)?(?:unique\s+)?(?:temp(?:orary)?\s+)?(${tipos})\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?(${ID})([^;]*)`,
    "g",
  );
  for (const m of t.matchAll(reCrear)) {
    const [frag, tipo, nombre, resto] = m;
    if (tipo !== "policy") revisarNombre(nombre, tipo, frag);
    if (["index", "trigger", "policy", "rule"].includes(tipo)) {
      const sobre = resto.match(new RegExp(String.raw`\bon\s+(?:only\s+)?(${ID})`));
      if (sobre) revisarNombre(sobre[1], `${tipo} sobre tabla`, frag);
    }
  }
  const reAlterar = new RegExp(String.raw`\balter\s+(${tipos})\s+(?:if\s+exists\s+)?(?:only\s+)?(${ID})([^;]*)`, "g");
  for (const m of t.matchAll(reAlterar)) {
    const [frag, tipo, nombre, resto] = m;
    if (tipo === "policy" || tipo === "trigger") {
      const sobre = resto.match(new RegExp(String.raw`\bon\s+(${ID})`));
      if (sobre) revisarNombre(sobre[1], `${tipo} sobre tabla`, frag);
    } else revisarNombre(nombre, tipo, frag);
  }
  const reBorrar = new RegExp(String.raw`\bdrop\s+(${tipos})\s+(?:concurrently\s+)?(?:if\s+exists\s+)?([^;]*)`, "g");
  for (const m of t.matchAll(reBorrar)) {
    const [frag, tipo, resto] = m;
    if (tipo === "policy" || tipo === "trigger" || tipo === "rule") {
      const sobre = resto.match(new RegExp(String.raw`\bon\s+(${ID})`));
      if (sobre) revisarNombre(sobre[1], `${tipo} sobre tabla`, frag);
      else falla(`drop ${tipo} sin tabla`, frag);
    } else {
      const lista = resto.replace(/\([^)]*\)/g, "").replace(/\b(cascade|restrict)\b/g, "");
      for (const n of lista.split(",").map((s) => s.trim()).filter(Boolean)) revisarNombre(n, tipo, frag);
    }
  }

  // Permisos: grant/revoke … on <objetos> to/from …
  const rePermiso = /\b(grant|revoke)\b([^;]*?)\bon\s+(?:table\s+|function\s+|sequence\s+|type\s+|procedure\s+|routine\s+)?([^;]*?)\b(to|from)\b/g;
  for (const m of t.matchAll(rePermiso)) {
    const lista = m[3].replace(/\([^()]*\)/g, "");
    for (const n of lista.split(",").map((s) => s.trim()).filter(Boolean)) revisarNombre(n, "permiso sobre", m[0]);
  }

  // Escritura de datos.
  const reDatos = [
    new RegExp(String.raw`\binsert\s+into\s+(${ID})`, "g"),
    new RegExp(String.raw`\bupdate\s+(?:only\s+)?(${ID})(?:\s+(?:as\s+)?[a-z_]+)?\s+set\b`, "g"),
    new RegExp(String.raw`\bdelete\s+from\s+(?:only\s+)?(${ID})`, "g"),
    new RegExp(String.raw`\btruncate\s+(?:table\s+)?(?:only\s+)?(${ID})`, "g"),
    new RegExp(String.raw`\bmerge\s+into\s+(${ID})`, "g"),
    new RegExp(String.raw`\bcopy\s+(${ID})`, "g"),
    new RegExp(String.raw`\bcomment\s+on\s+[a-z ]+?\s+(${ID})`, "g"),
  ];
  for (const re of reDatos) for (const m of t.matchAll(re)) revisarNombre(m[1], "escritura o comentario sobre", m[0]);

  return errores;
}

const argumentos = process.argv.slice(2);
const archivos = argumentos.length
  ? argumentos
  : readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort().map((f) => join(DIR, f));

let total = 0;
for (const archivo of archivos) {
  const errores = revisar(archivo, readFileSync(archivo, "utf8"));
  total += errores.length;
  if (errores.length) errores.forEach((e) => console.error(`✗ ${e}`));
  else console.log(`✓ ${basename(archivo)}`);
}
if (total) {
  console.error(`\n${total} violación(es): solo se permiten objetos cp_.`);
  process.exit(1);
}
