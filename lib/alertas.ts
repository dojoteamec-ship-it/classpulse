import type { AlertaEstado, Gravedad } from "@/types/database";

// Textos de las reglas del plan (sección 5).
export const REGLA: Record<string, string> = {
  R1: "Pidió contacto",
  R2: "Nota 1 o 2 con identidad",
  R3: "Detractor de NPS",
  R4: "Palabra clave",
  R5: "Dos respuestas seguidas en rojo",
  R6: "Clase sin feedback abierto",
  R7: "Mentor bajo el umbral (Kaizen)",
};
export const ESTADO: Record<AlertaEstado, string> = {
  nueva: "Nueva",
  en_contacto: "En contacto",
  resuelta: "Resuelta",
  descartada: "Descartada",
};
export const GRAVEDAD: Record<Gravedad, string> = { alta: "Alta", media: "Media", operativa: "Operativa", kaizen: "Kaizen" };
export const abierta = (e: AlertaEstado) => e === "nueva" || e === "en_contacto";

// Estado del SLA en palabras (sin colores solos: siempre con texto).
export function estadoSla(venceEn: string | null, primerContacto: string | null, ahora = Date.now()) {
  if (!venceEn) return { texto: "Sin SLA", tono: "neutro" as const };
  const vence = new Date(venceEn).getTime();
  if (primerContacto) {
    return new Date(primerContacto).getTime() <= vence
      ? { texto: "Contactado en plazo", tono: "bien" as const }
      : { texto: "Contactado fuera de plazo", tono: "mal" as const };
  }
  const horas = (vence - ahora) / 3_600_000;
  if (horas < 0) return { texto: `Vencida hace ${Math.ceil(-horas)} h`, tono: "mal" as const };
  if (horas < 6) return { texto: `Vence en ${Math.max(1, Math.floor(horas))} h`, tono: "alerta" as const };
  return { texto: `Vence en ${Math.floor(horas)} h`, tono: "neutro" as const };
}
