"use server";

import { revalidatePath } from "next/cache";
import { requerirCoach } from "@/lib/auth";
import type { AlertaEstado } from "@/types/database";

const UUID = /^[0-9a-f-]{36}$/i;
const ESTADOS: AlertaEstado[] = ["nueva", "en_contacto", "resuelta", "descartada"];

export type Identidad = {
  nombre: string;
  email: string | null;
  telefono: string | null;
  ghl_contact_id: string | null;
  nivel: number | null;
  motivo: string | null;
  canal_preferido: string | null;
  mensaje: string | null;
};
export type Historial = {
  respuesta_id: string;
  creado_en: string;
  encuesta: string;
  grupo: string | null;
  tipo_sesion: string | null;
  csat: number | null;
  nps: number | null;
  banda: string | null;
  texto: string;
  alertas: number;
};

// Muestra la identidad y el historial del alumno. Cada llamada queda en cp_auditoria.
export async function verIdentidad(respuestaId: string): Promise<{ identidad: Identidad | null; historial: Historial[] }> {
  const { supabase } = await requerirCoach();
  if (!UUID.test(respuestaId)) return { identidad: null, historial: [] };
  const [{ data: ident }, { data: hist }] = await Promise.all([
    supabase.rpc("cp_ver_identidad", { p_respuesta_id: respuestaId }),
    supabase.rpc("cp_historial_alumno", { p_respuesta_id: respuestaId }),
  ]);
  return { identidad: ((ident ?? []) as Identidad[])[0] ?? null, historial: (hist ?? []) as Historial[] };
}

export async function actualizarAlerta(form: FormData) {
  const { supabase } = await requerirCoach();
  const id = String(form.get("alerta") ?? "");
  const estado = String(form.get("estado") ?? "") as AlertaEstado;
  const nota = String(form.get("nota") ?? "").slice(0, 2000);
  if (!UUID.test(id) || !ESTADOS.includes(estado)) return;
  const { error } = await supabase.rpc("cp_actualizar_alerta", { p_id: id, p_estado: estado, p_nota: nota || null });
  if (error) console.error("actualizarAlerta", error.code, error.message);
  revalidatePath("/coach");
  revalidatePath(`/coach/alerta/${id}`);
}
