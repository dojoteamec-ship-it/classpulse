"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { enviarCorreosDeSesion } from "@/lib/correo-sesion";
import { redirect } from "next/navigation";
import { requerirRol } from "@/lib/auth";
import type { EstadoFormulario } from "@/app/sesion/acciones";

const UUID = /^[0-9a-f-]{36}$/i;

// Abre la sesión de feedback. Los permisos reales los valida cp_abrir_sesion
// (RLS y reglas de la sección 2.1 del plan).
export async function abrirSesion(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const { supabase } = await requerirRol();
  const valores = Object.fromEntries(
    ["grupo", "tipo", "fecha", "co_mentor", "rango", "principal"].map((k) => [k, String(form.get(k) ?? "")]),
  );
  if (!UUID.test(valores.grupo)) return { error: "Elige un Grupo.", valores };
  if (!valores.tipo) return { error: "Elige el tipo de sesión.", valores };

  const { data, error } = await supabase.rpc("cp_abrir_sesion", {
    p_grupo_id: valores.grupo,
    p_tipo: valores.tipo,
    p_fecha: valores.fecha,
    p_co_mentores: UUID.test(valores.co_mentor) ? [valores.co_mentor] : [],
    p_rango: valores.rango.trim() || null,
    p_principal: UUID.test(valores.principal) ? valores.principal : null,
  });
  if (error || !data) {
    console.error("abrirSesion", error?.code, error?.message);
    const mensaje =
      error?.code === "P0001" ? error.message : "No se pudo abrir la sesión. Intenta de nuevo.";
    return { error: mensaje, valores };
  }
  // El correo del enlace personal sale después de responder al mentor.
  const sesionId = String(data);
  after(() => enviarCorreosDeSesion(sesionId).catch((e) => console.error("enviarCorreosDeSesion", e)));
  revalidatePath("/panel");
  redirect(`/panel/sesion/${sesionId}?nueva=1`);
}

export async function cerrarSesion(form: FormData) {
  const { supabase } = await requerirRol();
  const id = String(form.get("sesion") ?? "");
  if (!UUID.test(id)) return;
  const { error } = await supabase.rpc("cp_cerrar_sesion", { p_sesion_id: id });
  if (error) console.error("cerrarSesion", error.code, error.message);
  revalidatePath("/panel");
  revalidatePath(`/panel/sesion/${id}`);
}
