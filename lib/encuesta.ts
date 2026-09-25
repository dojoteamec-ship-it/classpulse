// Instrumento de la encuesta de clase (plan 3.1 y 3.2). Fuente única de textos,
// códigos y bandas: la usan la pantalla del alumno y la validación del servidor.
// Textos para el alumno: sin guiones ni rayas.
import type { TipoSesion } from "@/types/database";

export const VERSION_ENCUESTA_CLASE = 1;

export type Banda = "roja" | "amarilla" | "verde" | "neutra";
export type Asistencia = "en_vivo" | "grabacion" | "no_asistio";
export type ModoIdentidad = "anonimo" | "nombre" | "contacto";
type Opcion = { codigo: string; texto: string };

export const ASISTENCIA: (Opcion & { codigo: Asistencia })[] = [
  { codigo: "en_vivo", texto: "En vivo" },
  { codigo: "grabacion", texto: "Vi la grabación" },
  { codigo: "no_asistio", texto: "No pude asistir" },
];

export const MOTIVOS_INASISTENCIA: Opcion[] = [
  { codigo: "horario", texto: "El horario no me funciona" },
  { codigo: "no_me_entere", texto: "No me enteré de la clase" },
  { codigo: "tema_no_interesa", texto: "El tema no me interesaba" },
  { codigo: "problema_tecnico", texto: "Problema técnico" },
  { codigo: "otro", texto: "Otro" },
];

export const CARITAS: { valor: number; emoji: string; texto: string }[] = [
  { valor: 1, emoji: "😞", texto: "Muy mala" },
  { valor: 2, emoji: "🙁", texto: "Mala" },
  { valor: 3, emoji: "😐", texto: "Regular" },
  { valor: 4, emoji: "🙂", texto: "Buena" },
  { valor: 5, emoji: "😄", texto: "Excelente" },
];

export const LINEA_SESGO =
  "Califica la clase por lo que aprendiste y te llevas. Todos tenemos sesgos inconscientes, por ejemplo de género o de acento.";

// Pregunta distintiva por tipo de sesión (Thalheimer). La banda es interna.
export const DISTINTIVA: Record<TipoSesion, { pregunta: string; opciones: (Opcion & { banda: Banda })[] }> = {
  mondo: {
    pregunta: "¿Se resolvió tu duda?",
    opciones: [
      { codigo: "sin_dudas", texto: "No traje dudas", banda: "neutra" },
      { codigo: "no_alcanzo", texto: "Mi duda no se alcanzó a tratar", banda: "roja" },
      { codigo: "sigo_con_duda", texto: "Se trató, pero sigo con la duda", banda: "roja" },
      { codigo: "resuelta", texto: "Quedó resuelta", banda: "amarilla" },
      { codigo: "resuelta_aplico", texto: "Quedó resuelta y ya sé cómo aplicarla", banda: "verde" },
    ],
  },
  randori: {
    pregunta: "Después de esta práctica, ¿qué tan listo estás para hacerlo con un cliente real?",
    opciones: [
      { codigo: "no_podria", texto: "Todavía no podría hacerlo", banda: "roja" },
      { codigo: "con_ayuda", texto: "Podría hacerlo con ayuda", banda: "amarilla" },
      { codigo: "solo", texto: "Podría hacerlo solo", banda: "verde" },
      { codigo: "ensenarlo", texto: "Podría hacerlo y enseñarlo", banda: "verde" },
    ],
  },
  kata: {
    pregunta: "¿Qué tan claro te quedó el tema?",
    opciones: [
      { codigo: "me_perdi", texto: "Me perdí", banda: "roja" },
      { codigo: "algunas_partes", texto: "Entendí algunas partes", banda: "roja" },
      { codigo: "lo_principal", texto: "Entendí lo principal", banda: "amarilla" },
      { codigo: "entendi_aplico", texto: "Lo entendí y sé cómo aplicarlo", banda: "verde" },
    ],
  },
  shinsa: {
    pregunta: "¿Qué tan útil fue el feedback sobre tu proyecto?",
    opciones: [
      { codigo: "sin_feedback_claro", texto: "No recibí un feedback claro", banda: "roja" },
      { codigo: "no_se_que_hacer", texto: "Recibí feedback, pero no sé qué hacer con él", banda: "roja" },
      { codigo: "se_que_corregir", texto: "Sé exactamente qué corregir", banda: "amarilla" },
      { codigo: "se_que_y_por_que", texto: "Sé qué corregir y por qué", banda: "verde" },
    ],
  },
  practica_cliente: {
    pregunta: "¿Qué tan útil fue para tu trabajo en este lanzamiento?",
    opciones: [
      { codigo: "no_sirvio", texto: "No me sirvió", banda: "roja" },
      { codigo: "sirvio_poco", texto: "Me sirvió poco", banda: "roja" },
      { codigo: "ya_se_que_hacer", texto: "Me sirvió; ya sé qué hacer", banda: "amarilla" },
      { codigo: "ya_aplico", texto: "Ya lo estoy aplicando en mis campañas", banda: "verde" },
    ],
  },
};

// Chips con su dimensión SEEQ. Técnico y plataforma no son del mentor.
export type Dimension =
  | "claridad"
  | "dominio"
  | "interaccion"
  | "valor_aplicable"
  | "organizacion"
  | "entusiasmo"
  | "tecnico"
  | "plataforma";

export const DIMENSION: Record<Dimension, string> = {
  claridad: "Claridad",
  dominio: "Dominio",
  interaccion: "Interacción",
  valor_aplicable: "Valor aplicable",
  organizacion: "Organización",
  entusiasmo: "Entusiasmo",
  tecnico: "Técnico (no es del mentor)",
  plataforma: "Plataforma (no es del mentor)",
};

export const CHIPS_POSITIVOS: (Opcion & { dimension: Dimension })[] = [
  { codigo: "explico_claro", texto: "Explicó con claridad", dimension: "claridad" },
  { codigo: "domino_tema", texto: "Dominó el tema", dimension: "dominio" },
  { codigo: "respondio_dudas", texto: "Respondió mis dudas", dimension: "interaccion" },
  { codigo: "ejemplos_aplicables", texto: "Ejemplos aplicables a mi negocio", dimension: "valor_aplicable" },
  { codigo: "buen_ritmo", texto: "Buen ritmo", dimension: "organizacion" },
  { codigo: "empezo_puntual", texto: "Empezó puntual", dimension: "organizacion" },
  { codigo: "buena_energia", texto: "Buena energía", dimension: "entusiasmo" },
];

export const CHIPS_NEGATIVOS: (Opcion & { dimension: Dimension })[] = [
  { codigo: "poco_claro", texto: "Poco claro", dimension: "claridad" },
  { codigo: "poco_preparado", texto: "Se notó poco preparado", dimension: "dominio" },
  { codigo: "duda_sin_responder", texto: "No se respondió mi duda", dimension: "interaccion" },
  { codigo: "muy_teorico", texto: "Muy teórico", dimension: "valor_aplicable" },
  { codigo: "muy_rapido", texto: "Muy rápido", dimension: "organizacion" },
  { codigo: "muy_lento", texto: "Muy lento", dimension: "organizacion" },
  { codigo: "empezo_tarde", texto: "Empezó tarde", dimension: "organizacion" },
  { codigo: "audio_conexion", texto: "Audio o conexión", dimension: "tecnico" },
  { codigo: "plataforma_ghl", texto: "Problema con GHL o accesos", dimension: "plataforma" },
];

export const TODOS_LOS_CHIPS = [...CHIPS_POSITIVOS, ...CHIPS_NEGATIVOS];
export const chipsPara = (csat: number) => (csat >= 4 ? CHIPS_POSITIVOS : CHIPS_NEGATIVOS);

// Elección de identidad (plan 2.3).
export const MODOS: { codigo: ModoIdentidad; texto: string; detalle: string }[] = [
  { codigo: "anonimo", texto: "Anónimo", detalle: "Solo guardamos tus respuestas." },
  { codigo: "nombre", texto: "Con mi nombre", detalle: "Solo Mike y Santi ven quién eres. Tu mentor nunca." },
  {
    codigo: "contacto",
    texto: "Con mi nombre y quiero que Mike me contacte",
    detalle: "Mike te escribe en un día hábil.",
  },
];
export const AVISO_MENTOR = "Tu mentor leerá tus comentarios sin tu nombre.";
export const AVISO_ANONIMO =
  "No guardamos tu nombre ni tu correo. Si necesitas ayuda, elige la opción de contacto.";

export const MOTIVOS_CONTACTO: Opcion[] = [
  { codigo: "dudas_contenido", texto: "Tengo dudas del contenido" },
  { codigo: "pagos_accesos", texto: "Pagos o accesos" },
  { codigo: "mi_avance", texto: "Quiero hablar de mi avance" },
  { codigo: "trato", texto: "Algo del trato en la clase" },
  { codigo: "otro", texto: "Otro" },
];
export const CANALES_CONTACTO: Opcion[] = [
  { codigo: "whatsapp", texto: "WhatsApp" },
  { codigo: "correo", texto: "Correo" },
  { codigo: "llamada", texto: "Llamada" },
];

export const MAX_TEXTO = 500;

// Lo que envía la pantalla del alumno.
export type EnvioClase = {
  sesionId: string;
  asistencia: Asistencia;
  motivoInasistencia?: string;
  csat?: number;
  distintiva?: string;
  chips: string[];
  textoMantener?: string;
  textoCambiar?: string;
  modo: ModoIdentidad;
  nombre?: string;
  email?: string;
  telefono?: string;
  contactoMotivo?: string;
  contactoCanal?: string;
  contactoMensaje?: string;
  segundos: number;
  // Enlace general: id anónimo del navegador. Enlace personal: el contact_id va en el enlace.
  fingerprint?: string;
  contactId?: string;
};
