import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

// Cliente para Client Components (anon key, sujeto a RLS).
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
