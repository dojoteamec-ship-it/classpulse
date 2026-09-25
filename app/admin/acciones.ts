"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { requerirSuperAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { validarConfig } from "@/lib/config-admin";
import type { EstadoFormulario } from "@/app/sesion/acciones";

const UUID = /^[0-9a-f-]{36}$/i;
const ROLES = ["mentor", "coach", "super_admin"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Dar o cambiar el acceso de una cuenta de ClassVote. RLS: solo super admin y nunca sobre sí mismo.
export async function guardarAcceso(form: FormData) {
  const { supabase, mentor } = await requerirSuperAdmin();
  const id = String(form.get("mentor") ?? "");
  const rol = String(form.get("rol") ?? "");
  const activo = form.get("activo") !== "off";
  if (!UUID.test(id) || !ROLES.includes(rol) || id === mentor.id) return;
  const { error } = await supabase.from("cp_acceso").upsert({ mentor_id: id, rol, activo, actualizado_en: new Date().toISOString() });
  if (error) console.error("guardarAcceso", error.code, error.message);
  else await supabase.rpc("cp_auditar", { p_accion: "cambiar_acceso", p_objeto: `mentor:${id}`, p_detalle: { rol, activo } });
  revalidatePath("/admin/usuarios");
}

export async function cambiarGrupoMentor(form: FormData) {
  const { supabase } = await requerirSuperAdmin();
  const mentor = String(form.get("mentor") ?? "");
  const grupo = String(form.get("grupo") ?? "");
  const asignar = form.get("asignar") === "1";
  if (!UUID.test(mentor) || !UUID.test(grupo)) return;
  const { error } = asignar
    ? await supabase.from("cp_mentor_grupos").upsert({ mentor_id: mentor, grupo_id: grupo })
    : await supabase.from("cp_mentor_grupos").delete().eq("mentor_id", mentor).eq("grupo_id", grupo);
  if (error) console.error("cambiarGrupoMentor", error.code, error.message);
  revalidatePath("/admin/usuarios");
}

// Crea una cuenta nueva (por ejemplo, la de Mike) con la service role. El trigger de
// ClassVote crea la fila en mentores (queda «pendiente» en ClassVote, sin acceso allí).
export async function crearCuenta(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const { supabase, acceso } = await requerirSuperAdmin();
  const nombre = String(form.get("nombre") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const rol = String(form.get("rol") ?? "mentor");
  const valores = { nombre, email, rol };
  if (nombre.length < 2) return { error: "Escribe el nombre.", valores };
  if (!EMAIL.test(email)) return { error: "Revisa el correo.", valores };
  if (!ROLES.includes(rol)) return { error: "Elige el rol.", valores };
  const admin = createAdminClient();
  if (!admin) return { error: "Falta la service role en el servidor.", valores };

  const clave = crypto.randomBytes(9).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({ email, password: clave, email_confirm: true, user_metadata: { nombre } });
  if (error || !data.user) {
    console.error("crearCuenta", error?.code, error?.message);
    return {
      error: error?.code === "email_exists" ? "Ya existe una cuenta con ese correo: dale acceso desde la lista." : "No se pudo crear la cuenta.",
      valores,
    };
  }
  const { data: m } = await admin.from("mentores").select("id").eq("auth_user_id", data.user.id).maybeSingle<{ id: string }>();
  if (!m) return { error: "La cuenta se creó, pero no apareció en mentores. Revisa ClassVote.", valores };
  const { error: e2 } = await supabase.from("cp_acceso").insert({ mentor_id: m.id, rol, es_prueba: acceso.es_prueba });
  if (e2) console.error("crearCuenta acceso", e2.code, e2.message);
  await supabase.rpc("cp_auditar", { p_accion: "crear_cuenta", p_objeto: `mentor:${m.id}`, p_detalle: { rol } });
  revalidatePath("/admin/usuarios");
  return { aviso: `Cuenta creada. Contraseña temporal (se muestra una sola vez): ${clave}` };
}

export async function guardarGrupo(form: FormData) {
  const { supabase } = await requerirSuperAdmin();
  const id = String(form.get("grupo") ?? "");
  if (!UUID.test(id)) return;
  const nombre = String(form.get("nombre") ?? "").trim().slice(0, 80);
  const tag = String(form.get("tag_ghl") ?? "").trim().slice(0, 80);
  const cambios: Record<string, unknown> = {
    activo: form.get("activo") === "on",
    enviar_correo: form.get("enviar_correo") === "on",
    tag_ghl: tag || null,
  };
  if (nombre.length >= 2) cambios.nombre = nombre;
  const { error } = await supabase.from("cp_grupos").update(cambios).eq("id", id);
  if (error) console.error("guardarGrupo", error.code, error.message);
  else await supabase.rpc("cp_auditar", { p_accion: "cambiar_grupo", p_objeto: `grupo:${id}`, p_detalle: cambios });
  revalidatePath("/admin/grupos");
}

export async function guardarConfig(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const { supabase, mentor } = await requerirSuperAdmin();
  const clave = String(form.get("clave") ?? "");
  const texto = String(form.get("valor") ?? "");
  const r = validarConfig(clave, texto);
  if ("error" in r) return { error: r.error, valores: { [clave]: texto } };
  const { error } = await supabase
    .from("cp_config")
    .upsert({ clave, valor: r.valor, actualizado_en: new Date().toISOString(), actualizado_por: mentor.id });
  if (error) {
    console.error("guardarConfig", error.code, error.message);
    return { error: "No se pudo guardar.", valores: { [clave]: texto } };
  }
  await supabase.rpc("cp_auditar", { p_accion: "cambiar_config", p_objeto: `config:${clave}` });
  revalidatePath("/admin/configuracion");
  return { aviso: `«${clave}» guardada.` };
}

// Borrado a pedido del alumno (LOPDP, 15 días). No se guarda el identificador.
export async function borrarAlumno(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const { supabase, acceso } = await requerirSuperAdmin();
  const identificador = String(form.get("identificador") ?? "").trim();
  const recibida = String(form.get("recibida") ?? "");
  const notas = String(form.get("notas") ?? "").trim().replace(/[^\s@]+@[^\s@]+/g, "[correo]").slice(0, 500);
  const { data, error } = await supabase.rpc("cp_borrar_alumno", {
    p_identificador: identificador,
    p_recibida: recibida,
    p_notas: notas || null,
    p_es_prueba: acceso.es_prueba,
  });
  if (error) {
    return { error: error.code === "P0001" ? error.message : "No se pudo completar el borrado.", valores: { recibida, notas } };
  }
  revalidatePath("/admin/datos");
  return { aviso: `Listo: se borró la identidad de ${data} respuesta(s). Las respuestas quedan anónimas.` };
}
