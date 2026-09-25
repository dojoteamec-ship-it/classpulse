"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirCoach } from "@/lib/auth";
import { ORDEN_PDCA, METRICA } from "@/lib/kaizen";
import type { EstadoFormulario } from "@/app/sesion/acciones";

const UUID = /^[0-9a-f-]{36}$/i;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const TIPOS = ["kata", "mondo", "randori", "shinsa", "practica_cliente"];

// Crea o actualiza una acción PDCA. Solo coach y super admin (RLS lo exige también).
export async function guardarAccion(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const { supabase, acceso } = await requerirCoach();
  const v = (k: string) => String(form.get(k) ?? "").trim();
  const valores = Object.fromEntries(
    ["id", "grupo", "mentor", "tipo", "problema", "enlace", "accion", "responsable", "compromiso", "estado", "metrica", "inicio", "ventana", "alerta", "p1", "p2", "p3", "p4", "p5"].map((k) => [k, v(k)]),
  );
  if (valores.problema.length < 3) return { error: "Describe el problema observado.", valores };
  if (valores.accion.length < 3) return { error: "Describe la acción.", valores };
  const estado = ORDEN_PDCA.includes(valores.estado as never) ? valores.estado : "planificar";
  const metrica = valores.metrica in METRICA ? valores.metrica : "csat_medio";
  const fila = {
    grupo_id: UUID.test(valores.grupo) ? valores.grupo : null,
    mentor_id: UUID.test(valores.mentor) ? valores.mentor : null,
    tipo_sesion: TIPOS.includes(valores.tipo) ? valores.tipo : null,
    problema: valores.problema.slice(0, 1000),
    enlace_datos: valores.enlace.slice(0, 500) || null,
    porques: ["p1", "p2", "p3", "p4", "p5"].map((k) => valores[k].slice(0, 300)).filter(Boolean),
    accion: valores.accion.slice(0, 1000),
    responsable: valores.responsable.slice(0, 120) || null,
    fecha_compromiso: FECHA.test(valores.compromiso) ? valores.compromiso : null,
    estado,
    metrica,
    fecha_inicio: FECHA.test(valores.inicio) ? valores.inicio : undefined,
    ventana_dias: Math.min(180, Math.max(7, Number(valores.ventana) || 30)),
    publicar: form.get("publicar") === "on",
    alerta_id: UUID.test(valores.alerta) ? valores.alerta : null,
  };
  let id = valores.id;
  if (UUID.test(id)) {
    const { error } = await supabase.from("cp_acciones").update(fila).eq("id", id);
    if (error) {
      console.error("guardarAccion", error.code, error.message);
      return { error: "No se pudo guardar la acción.", valores };
    }
  } else {
    const { data, error } = await supabase
      .from("cp_acciones")
      .insert({ ...fila, es_prueba: acceso.es_prueba, creada_por: acceso.mentor_id })
      .select("id")
      .single();
    if (error || !data) {
      console.error("guardarAccion", error?.code, error?.message);
      return { error: "No se pudo crear la acción.", valores };
    }
    id = data.id;
  }
  revalidatePath("/kaizen");
  redirect(`/kaizen/${id}?guardada=1`);
}
