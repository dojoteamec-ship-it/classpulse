import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { esCoach } from "@/lib/auth";
import type { Acceso, Grupo } from "@/types/database";

// Grupos activos donde el usuario puede abrir sesiones: coach y super admin,
// todos; un mentor, los asignados en cp_mentor_grupos (RLS ya filtra).
export async function gruposQuePuedoAbrir(supabase: SupabaseClient, mentorId: string, acceso: Acceso) {
  const { data } = await supabase
    .from("cp_grupos")
    .select("*, cp_mentor_grupos(mentor_id)")
    .eq("activo", true)
    .order("orden")
    .returns<(Grupo & { cp_mentor_grupos: { mentor_id: string }[] })[]>();
  const grupos = data ?? [];
  return esCoach(acceso.rol) ? grupos : grupos.filter((g) => g.cp_mentor_grupos.some((a) => a.mentor_id === mentorId));
}
