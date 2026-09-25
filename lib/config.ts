import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Lee claves de cp_config. Con el cliente del usuario respeta RLS (coach);
// en los flujos públicos se usa el cliente de servicio.
export async function leerConfig<T = unknown>(supabase: SupabaseClient, clave: string): Promise<T | null> {
  const { data } = await supabase.from("cp_config").select("valor").eq("clave", clave).maybeSingle<{ valor: T }>();
  return data?.valor ?? null;
}
