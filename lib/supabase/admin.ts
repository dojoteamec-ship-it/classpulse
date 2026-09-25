import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

// Cliente con service role: salta RLS. Solo en las excepciones listadas en
// docs/03-arquitectura.md, y siempre después de verificar el rol del usuario
// o el secreto del cron.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(supabaseUrl(), key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
