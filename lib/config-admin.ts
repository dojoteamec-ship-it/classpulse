// Claves de cp_config editables en /admin, con su explicación y validación.
type Resultado = { valor: unknown } | { error: string };
const obj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export const CLAVES_CONFIG: { clave: string; titulo: string; ayuda: string; validar: (v: unknown) => string | null }[] = [
  {
    clave: "metas",
    titulo: "Metas de los KPIs",
    ayuda: "Plan 4.1. Proporciones entre 0 y 1 (0.8 = 80 %); CSAT en 1 a 5; CES en 1 a 7; NPS de -100 a 100 o null.",
    validar: (v) => (obj(v) && Object.values(v).every((x) => x === null || typeof x === "number") ? null : "Debe ser un objeto con números o null."),
  },
  {
    clave: "sla_horas",
    titulo: "SLA por regla (horas hábiles)",
    ayuda: "R1 a R5 (R8 reservado). Por defecto 24 h y 48 h para R3.",
    validar: (v) => (obj(v) && Object.entries(v).every(([k, x]) => /^R\d$/.test(k) && typeof x === "number" && x > 0 && x <= 720) ? null : "Ejemplo: {\"R1\": 24, \"R3\": 48}"),
  },
  {
    clave: "horario_habil",
    titulo: "Horario hábil",
    ayuda: "Días ISO (1 = lunes … 7 = domingo), inicio y fin en hora de Ecuador.",
    validar: (v) =>
      obj(v) && Array.isArray(v.dias) && v.dias.every((d) => Number.isInteger(d) && (d as number) >= 1 && (d as number) <= 7) && HORA.test(String(v.inicio)) && HORA.test(String(v.fin)) && String(v.inicio) < String(v.fin)
        ? null
        : "Ejemplo: {\"dias\":[1,2,3,4,5],\"inicio\":\"09:00\",\"fin\":\"18:00\",\"zona\":\"America/Guayaquil\"}",
  },
  {
    clave: "palabras_clave",
    titulo: "Palabras clave (R4)",
    ayuda: "Lista de textos. Se buscan sin tildes ni mayúsculas.",
    validar: (v) => (Array.isArray(v) && v.length <= 100 && v.every((x) => typeof x === "string" && x.trim().length >= 3) ? null : "Lista de textos de 3 caracteres o más."),
  },
  {
    clave: "muestra_minima",
    titulo: "Muestra mínima",
    ayuda: "Con n menor, la cifra se ve atenuada con «muestra pequeña». Plan: 15.",
    validar: (v) => (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 500 ? null : "Número entero entre 1 y 500."),
  },
  {
    clave: "r7",
    titulo: "Regla R7 (mentor bajo el umbral)",
    ayuda: "CSAT mínimo, n mínimo y días de la ventana.",
    validar: (v) => (obj(v) && typeof v.csat_minimo === "number" && Number.isInteger(v.n_minimo) && Number.isInteger(v.dias) ? null : "Ejemplo: {\"csat_minimo\":3.8,\"n_minimo\":15,\"dias\":30}"),
  },
  {
    clave: "correo_intervalo_horas",
    titulo: "Intervalo mínimo entre correos al mismo alumno (horas)",
    ayuda: "Plan 9.2: 48.",
    validar: (v) => (typeof v === "number" && v >= 0 && v <= 720 ? null : "Número entre 0 y 720."),
  },
  {
    clave: "retencion_identidad_meses",
    titulo: "Retención de la identidad (meses)",
    ayuda: "LOPDP: 24. Después, la identidad se borra sola.",
    validar: (v) => (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 120 ? null : "Número entero entre 1 y 120."),
  },
  {
    clave: "ghl_campo_nivel",
    titulo: "Campo de GHL con el nivel del alumno",
    ayuda: "ID del campo personalizado. Mientras sea null, el correo real no sale para los Cinturones y el enlace personal acepta cualquier Cinturón.",
    validar: (v) => (v === null || (typeof v === "string" && /^[A-Za-z0-9_]{4,60}$/.test(v)) ? null : "null o el ID del campo."),
  },
  {
    clave: "ghl_contacto_resumen",
    titulo: "Contacto de Mike en GHL (resumen diario)",
    ayuda: "contact_id de Mike. En modo prueba el resumen va a los contactos de prueba.",
    validar: (v) => (v === null || (typeof v === "string" && /^[A-Za-z0-9]{10,40}$/.test(v)) ? null : "null o un contact_id."),
  },
  {
    clave: "rangos_por_nivel",
    titulo: "Rangos de cada nivel (encuesta de Cinturón)",
    ayuda: "Ejemplo: {\"1\": [\"Rango 1\", \"Rango 2\"]}. Vacío: la pregunta es de texto libre.",
    validar: (v) => (obj(v) && Object.entries(v).every(([k, x]) => /^[0-6]$/.test(k) && Array.isArray(x) && x.every((r) => typeof r === "string")) ? null : "Objeto de nivel (0 a 6) a lista de textos."),
  },
  {
    clave: "semana_a_referencia",
    titulo: "Lunes de referencia de la semana A",
    ayuda: "Para las franjas que alternan semana A y B.",
    validar: (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(`${v}T12:00:00Z`).getUTCDay() === 1 ? null : "Una fecha AAAA-MM-DD que sea lunes."),
  },
];

export function validarConfig(clave: string, texto: string): Resultado {
  const def = CLAVES_CONFIG.find((c) => c.clave === clave);
  if (!def) return { error: "Clave no editable." };
  let valor: unknown;
  try {
    valor = JSON.parse(texto);
  } catch {
    return { error: "No es JSON válido. Los textos van entre comillas." };
  }
  const e = def.validar(valor);
  return e ? { error: e } : { valor };
}
