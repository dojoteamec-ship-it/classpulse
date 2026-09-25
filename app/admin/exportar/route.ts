import { NextResponse, type NextRequest } from "next/server";
import { obtenerSesion } from "@/lib/auth";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const celda = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const s = Array.isArray(v) ? v.join("|") : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Exportación CSV (plan 4.4), solo super admin. Sin identidades: las respuestas se
// exportan anónimas. Cada exportación queda en la auditoría.
const CONSULTAS = {
  respuestas: {
    tabla: "cp_respuestas",
    columnas:
      "id,encuesta,version_encuesta,sesion_id,grupo_id,tipo_sesion,nivel,fecha_clase,canal_entrada,modo_identidad,asistencia,motivo_inasistencia,csat,distintiva_codigo,distintiva_banda,chips,texto_mantener,texto_cambiar,nps,nes,aplicacion,dificultad,ces,clientes_activos,rango_top,texto_cambio_nivel,segundos_para_responder,horas_desde_apertura,creado_en",
    fecha: "creado_en",
  },
  alertas: {
    tabla: "cp_alertas",
    columnas: "id,regla,gravedad,estado,grupo_id,sesion_id,fecha_clase,resumen,contacto_posible,creado_en,vence_en,primer_contacto_en,resuelta_en",
    fecha: "creado_en",
  },
  acciones: {
    tabla: "cp_acciones",
    columnas: "id,grupo_id,mentor_id,tipo_sesion,problema,porques,accion,responsable,fecha_compromiso,estado,metrica,fecha_inicio,ventana_dias,metrica_antes,metrica_despues,publicar,creado_en,actualizado_en",
    fecha: "creado_en",
  },
  sesiones: {
    tabla: "cp_sesiones",
    columnas: "id,grupo_id,tipo_sesion,fecha_clase,rango,abierta_en,cierra_en,estado,cerrada_en,correos_enviados",
    fecha: "abierta_en",
  },
} as const;

export async function GET(request: NextRequest) {
  const { supabase, acceso } = await obtenerSesion();
  if (acceso?.rol !== "super_admin") return NextResponse.json({ error: "sin permiso" }, { status: 403 });
  const p = request.nextUrl.searchParams;
  const tipo = (p.get("tipo") ?? "respuestas") as keyof typeof CONSULTAS;
  const q = CONSULTAS[tipo];
  if (!q) return NextResponse.json({ error: "tipo inválido" }, { status: 400 });
  const desde = FECHA.test(p.get("desde") ?? "") ? p.get("desde")! : "2000-01-01";
  const hasta = FECHA.test(p.get("hasta") ?? "") ? p.get("hasta")! : "2999-12-31";

  // Solo filas del mismo mundo (prueba o real) que la cuenta.
  const esPrueba = acceso.es_prueba;
  // Tipos anchos a propósito: la tabla y las columnas se eligen en tiempo de ejecución.
  const tabla: string = q.tabla;
  const columnas: string = q.columnas;
  const { data, error } = await supabase
    .from(tabla)
    .select(columnas)
    .eq("es_prueba", esPrueba)
    .gte(q.fecha, `${desde}T00:00:00-05:00`)
    .lte(q.fecha, `${hasta}T23:59:59-05:00`)
    .order(q.fecha)
    .limit(50000)
    .returns<Record<string, unknown>[]>();
  if (error) return NextResponse.json({ error: "no se pudo exportar" }, { status: 500 });
  await supabase.rpc("cp_auditar", { p_accion: "exportar_csv", p_objeto: q.tabla, p_detalle: { desde, hasta, filas: data?.length ?? 0 } });

  const cols = q.columnas.split(",");
  const csv = "﻿" + [cols.join(","), ...(data ?? []).map((f) => cols.map((c) => celda(f[c])).join(","))].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="classpulse_${tipo}_${desde}_${hasta}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
