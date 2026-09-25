import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Acceso, Mentor, Rol } from "@/types/database";

// Único punto donde se resuelve quién es el usuario y su rol en ClassPulse.
// El rol vive en cp_acceso y depende solo de cp_acceso.activo (no del estado
// ni del rol de ClassVote). Los permisos reales viven en RLS; esto solo
// decide qué mostrar y a dónde redirigir.
export async function obtenerSesion() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { supabase, mentor: null, acceso: null };

  const { data: mentor } = await supabase
    .from("mentores")
    .select("id, nombre, email, auth_user_id, estado, rol, creado_en")
    .eq("auth_user_id", userId)
    .maybeSingle<Mentor>();
  if (!mentor) return { supabase, mentor: null, acceso: null };

  const { data: acceso } = await supabase
    .from("cp_acceso")
    .select("*")
    .eq("mentor_id", mentor.id)
    .maybeSingle<Acceso>();
  return { supabase, mentor, acceso: acceso?.activo ? acceso : null };
}

// Con sesión iniciada (tenga o no acceso a ClassPulse).
export async function requerirCuenta() {
  const sesion = await obtenerSesion();
  if (!sesion.mentor) redirect("/entrar");
  return { supabase: sesion.supabase, mentor: sesion.mentor, acceso: sesion.acceso };
}

// Con acceso activo y, opcionalmente, uno de los roles indicados.
export async function requerirRol(roles?: Rol[]) {
  const sesion = await requerirCuenta();
  if (!sesion.acceso) redirect("/panel");
  if (roles && !roles.includes(sesion.acceso.rol)) redirect("/panel");
  return { supabase: sesion.supabase, mentor: sesion.mentor, acceso: sesion.acceso };
}

export const requerirCoach = () => requerirRol(["coach", "super_admin"]);
export const requerirSuperAdmin = () => requerirRol(["super_admin"]);

export const esCoach = (rol: Rol | undefined) => rol === "coach" || rol === "super_admin";

export const ETIQUETA_ROL: Record<Rol, string> = {
  mentor: "Mentor",
  coach: "Coach",
  super_admin: "Super admin",
};
