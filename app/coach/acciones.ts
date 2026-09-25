"use server";

import { revalidatePath } from "next/cache";
import { requerirSuperAdmin } from "@/lib/auth";
import type { EstadoFormulario } from "@/app/sesion/acciones";

// Carga de la tasa de aprobación por Rango (CSV pegado): nivel,rango,AAAA-MM,presentados,aprobados
export async function cargarAprobaciones(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const { supabase, acceso } = await requerirSuperAdmin();
  const csv = String(form.get("csv") ?? "");
  const filas = [];
  const lineas = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const [i, linea] of lineas.entries()) {
    const c = linea.split(/[,;\t]/).map((x) => x.trim());
    if (i === 0 && /nivel/i.test(c[0])) continue; // encabezado
    const [nivel, rango, periodo, presentados, aprobados] = c;
    const n = Number(nivel), p = Number(presentados), a = Number(aprobados);
    if (!Number.isInteger(n) || n < 0 || n > 6 || !rango || !/^\d{4}-\d{2}$/.test(periodo ?? "") || !Number.isInteger(p) || !Number.isInteger(a) || a < 0 || a > p) {
      return { error: `Línea ${i + 1} inválida: «${linea}». Formato: nivel,rango,AAAA-MM,presentados,aprobados`, valores: { csv } };
    }
    filas.push({ nivel: n, rango: rango.slice(0, 80), periodo: `${periodo}-01`, presentados: p, aprobados: a, es_prueba: acceso.es_prueba, actualizado_en: new Date().toISOString() });
  }
  if (!filas.length) return { error: "Pega al menos una línea.", valores: { csv } };
  const { error } = await supabase.from("cp_aprobaciones").upsert(filas, { onConflict: "nivel,rango,periodo,es_prueba" });
  if (error) {
    console.error("cargarAprobaciones", error.code, error.message);
    return { error: "No se pudo guardar. Revisa los datos.", valores: { csv } };
  }
  revalidatePath("/coach/programa");
  return { aviso: `${filas.length} filas guardadas.` };
}
