// Instrumento de la encuesta de Cinturón (plan 3.3). Textos para el alumno: sin guiones.
export const VERSION_ENCUESTA_CINTURON = 1;
type Opcion = { codigo: string; texto: string };

export const PREGUNTA_NPS = "¿Qué tan probable es que recomiendes RoninX Academy a un colega?";

export const nesPregunta = (n: number) => `Si alguien te preguntara por el Nivel ${n}, ¿qué le dirías?`;
export const NES: Opcion[] = [
  { codigo: "no_efectivo", texto: "No fue efectivo; dudaría en recomendarlo" },
  { codigo: "faltan_mejoras", texto: "Le faltan mejoras para recomendarlo" },
  { codigo: "con_mejoras", texto: "Lo recomendaría aunque tiene cosas por mejorar" },
  { codigo: "efectivo", texto: "Fue efectivo; lo recomiendo" },
  { codigo: "muy_efectivo", texto: "Fue muy efectivo; lo recomiendo mucho" },
];
// Las dos superiores cuentan para la meta NES (plan 4.1).
export const NES_SUPERIORES = ["efectivo", "muy_efectivo"];

export const APLICACION: Opcion[] = [
  { codigo: "cliente_paga", texto: "Sí, con un cliente que paga" },
  { codigo: "prueba_negocio", texto: "Sí, en una prueba o en mi negocio" },
  { codigo: "tengo_plan", texto: "Todavía no, pero tengo un plan" },
  { codigo: "no_se_como", texto: "Todavía no y no sé cómo" },
];

export const DIFICULTAD = ["Muy fácil", "Fácil", "Normal", "Difícil", "Muy difícil"];
export const PREGUNTA_CES = "Fue fácil avanzar en este nivel (acceso a cursos, examen, clases)";
export const CES_EXTREMOS = ["Totalmente en desacuerdo", "Totalmente de acuerdo"];

export const CLIENTES_ACTIVOS: Opcion[] = [
  { codigo: "0", texto: "0" },
  { codigo: "1", texto: "1" },
  { codigo: "2_4", texto: "2 a 4" },
  { codigo: "5_mas", texto: "5 o más" },
];
// La pregunta de clientes activos solo aplica a los niveles 3 a 6.
export const preguntaClientes = (n: number) => n >= 3;

export type EnvioCinturon = {
  contactId: string;
  nivel: number;
  nps: number;
  nes: string;
  aplicacion?: string;
  dificultad?: number;
  ces?: number;
  clientesActivos?: string;
  rangoTop?: string;
  textoCambio?: string;
  modo: "anonimo" | "nombre" | "contacto";
  contactoMotivo?: string;
  contactoCanal?: string;
  contactoMensaje?: string;
  segundos: number;
};
