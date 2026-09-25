"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type EstadoFormulario =
  | { error?: string; aviso?: string; valores?: Record<string, string> }
  | undefined;

// Mismas cuentas que ClassVote (mismo proyecto de Supabase). No hay registro
// público en ClassPulse: el acceso lo da el super admin en cp_acceso.
export async function entrar(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("entrar", error.code, error.message);
    const mensaje =
      error.code === "email_not_confirmed"
        ? "Tu correo todavía no está confirmado. Pídele al administrador que restablezca tu contraseña."
        : "Correo o contraseña incorrectos.";
    return { error: mensaje, valores: { email } };
  }
  redirect("/panel");
}

export async function salir() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}
