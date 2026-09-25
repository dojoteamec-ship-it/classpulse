import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CHIPS_POSITIVOS, TODOS_LOS_CHIPS } from "@/lib/encuesta";
import { chipsPorDimension, type FilaClase } from "@/lib/metricas";
import { hoyEnEcuador, sumarDias } from "@/lib/fecha";
import type { TipoSesion } from "@/types/database";

export type RespuestaTablero = FilaClase & {
  id: string;
  sesion_id: string | null;
  grupo_id: string | null;
  nivel: number | null;
  texto_mantener: string | null;
  texto_cambiar: string | null;
  creado_en: string;
  cp_sesiones: { correos_enviados: number; cp_sesion_mentores: { mentor_id: string; principal: boolean }[] } | null;
};

const COLUMNAS =
  "id, sesion_id, grupo_id, nivel, tipo_sesion, fecha_clase, canal_entrada, asistencia, motivo_inasistencia, csat, distintiva_banda, chips, texto_mantener, texto_cambiar, creado_en, cp_sesiones(correos_enviados, cp_sesion_mentores(mentor_id, principal))";

// Respuestas de clase visibles para el usuario (RLS) en el rango. Los datos de
// prueba solo aparecen en los tableros de las cuentas de prueba (plan: fuera de
// los tableros), y viceversa.
export async function respuestasClase(
  supabase: SupabaseClient,
  { desde, hasta, prueba }: { desde: string; hasta?: string; prueba: boolean },
) {
  let q = supabase
    .from("cp_respuestas")
    .select(COLUMNAS)
    .eq("encuesta", "clase")
    .eq("es_prueba", prueba)
    .gte("fecha_clase", desde)
    .order("creado_en", { ascending: false })
    .limit(5000);
  if (hasta) q = q.lte("fecha_clase", hasta);
  const { data, error } = await q.returns<RespuestaTablero[]>();
  if (error) console.error("respuestasClase", error.code, error.message);
  return data ?? [];
}

export const mentoresDe = (r: RespuestaTablero) => r.cp_sesiones?.cp_sesion_mentores.map((m) => m.mentor_id) ?? [];

// Referencia de la academia por tipo de sesión (solo agregados).
export async function referenciaAcademia(supabase: SupabaseClient, desde: string, prueba: boolean) {
  const { data } = await supabase.rpc("cp_referencia_academia", { p_desde: desde, p_prueba: prueba });
  return (data ?? []) as { tipo_sesion: TipoSesion; semana: string; csat: number; n: number }[];
}

// Serie semanal de la academia alineada a las semanas de la serie propia.
export function referenciaAlineada(ref: { tipo_sesion: TipoSesion; semana: string; csat: number; n: number }[], tipo: TipoSesion, semanas: string[]) {
  return semanas.map((s) => {
    const r = ref.find((x) => x.tipo_sesion === tipo && x.semana === s);
    return { semana: s, csat: r ? Number(r.csat) : null, n: r ? Number(r.n) : 0 };
  });
}

export const chipsSeeq = (filas: RespuestaTablero[]) =>
  chipsPorDimension(filas, TODOS_LOS_CHIPS, new Set(CHIPS_POSITIVOS.map((c) => c.codigo)));
export const TEXTO_CHIP = Object.fromEntries(TODOS_LOS_CHIPS.map((c) => [c.codigo, c.texto]));

export const ventana90 = () => {
  const hoy = hoyEnEcuador();
  return { hoy, desde: sumarDias(hoy, -90) };
};

// Metas de cp_config (plan 4.1). null si el usuario no puede leer la configuración.
export type Metas = {
  csat_medio?: number;
  top2?: number;
  bottom2?: number;
  distintiva_roja?: number;
  nps?: number | null;
  nes_top2?: number;
  ces?: number;
  tasa_respuesta?: number;
  sla_cumplimiento?: number;
};
