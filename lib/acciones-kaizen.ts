import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Medicion } from "@/lib/kaizen";
import type { Accion } from "@/types/database";

// Acciones visibles (RLS) con su medición antes y después (en vivo o congelada).
export async function accionesConMedicion(supabase: SupabaseClient, prueba: boolean, filtro?: { mentor?: string; id?: string }) {
  let q = supabase.from("cp_acciones").select("*").eq("es_prueba", prueba).order("actualizado_en", { ascending: false });
  if (filtro?.mentor) q = q.eq("mentor_id", filtro.mentor);
  if (filtro?.id) q = q.eq("id", filtro.id);
  const { data } = await q.returns<Accion[]>();
  const acciones = data ?? [];
  const mediciones = await Promise.all(
    acciones.map(async (a) => {
      const { data: m } = await supabase.rpc("cp_medir_accion", { p_id: a.id });
      return ((m ?? []) as { antes: Medicion; despues: Medicion }[])[0] ?? null;
    }),
  );
  return acciones.map((a, i) => ({ accion: a, medicion: mediciones[i] }));
}
