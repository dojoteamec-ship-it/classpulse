import Link from "next/link";
import { Contenedor } from "@/components/contenedor";
import { Bandas, ChipsSeeq, Cifra, Distribucion, Tendencia, num, pct } from "@/components/graficos";
import { Rotulo } from "@/components/rotulo";
import { requerirRol } from "@/lib/auth";
import { DIMENSION } from "@/lib/encuesta";
import { formatearClase } from "@/lib/fecha";
import { resumenClase, tendenciaSemanal } from "@/lib/metricas";
import { TIPO_SESION } from "@/lib/sesiones";
import { TEXTO_CHIP, chipsSeeq, mentoresDe, referenciaAcademia, referenciaAlineada, respuestasClase, ventana90 } from "@/lib/tablero";
import type { TipoSesion } from "@/types/database";

// Tablero del mentor (plan 4.2): solo las clases que dio, en ventana de 90 días,
// por tipo de sesión y con la academia como referencia. Sin identidades.
export default async function TableroMentorPage() {
  const { supabase, mentor, acceso } = await requerirRol();
  const { hoy, desde } = ventana90();
  const [todas, ref] = await Promise.all([
    respuestasClase(supabase, { desde, prueba: acceso.es_prueba }),
    referenciaAcademia(supabase, desde, acceso.es_prueba),
  ]);
  const mias = todas.filter((r) => mentoresDe(r).includes(mentor.id));
  const tipos = (Object.keys(TIPO_SESION) as TipoSesion[]).filter((t) => mias.some((r) => r.tipo_sesion === t));

  // Sesiones con su resumen (tarjetas).
  const porSesion = new Map<string, typeof mias>();
  for (const r of mias) if (r.sesion_id) porSesion.set(r.sesion_id, [...(porSesion.get(r.sesion_id) ?? []), r]);
  const sesiones = [...porSesion.entries()]
    .map(([id, filas]) => ({ id, filas, resumen: resumenClase(filas), tipo: filas[0].tipo_sesion as TipoSesion, fecha: filas[0].fecha_clase! }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <Contenedor mentor={mentor} acceso={acceso}>
      <section className="flex animate-aparecer flex-col gap-3">
        <Rotulo kanji="鏡">Mi tablero</Rotulo>
        <h1 className="titular text-4xl">Lo que dicen tus alumnos</h1>
        <p className="max-w-2xl leading-relaxed text-washi/55">
          Últimos 90 días, solo de las clases que diste. Cada tipo de sesión se lee por separado y se compara con el
          promedio de la academia para ese mismo tipo. Los comentarios llegan sin nombre.
        </p>
      </section>

      {mias.length === 0 && <p className="tarjeta p-6 text-washi/55">Todavía no hay respuestas de tus clases en los últimos 90 días.</p>}

      {tipos.map((tipo) => {
        const filas = mias.filter((r) => r.tipo_sesion === tipo);
        const r = resumenClase(filas);
        const serie = tendenciaSemanal(filas, hoy);
        return (
          <section key={tipo} className="tarjeta flex animate-aparecer flex-col gap-5 p-5 sm:p-6">
            <h2 className="text-xl font-semibold">{TIPO_SESION[tipo]}</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Cifra etiqueta="CSAT medio (1 a 5)" valor={num(r.csatMedio)} n={r.n} />
              <Cifra etiqueta="Top 2 (4 y 5)" valor={pct(r.top2)} n={r.n} />
              <Cifra etiqueta="Bottom 2 (1 y 2)" valor={pct(r.bottom2)} n={r.n} />
              <Cifra etiqueta="Distintiva en rojo" valor={pct(r.bandas.n ? r.bandas.roja / r.bandas.n : null)} n={r.bandas.n} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Distribucion distribucion={r.distribucion} n={r.n} />
              <Bandas bandas={r.bandas} />
            </div>
            <Tendencia serie={serie} referencia={referenciaAlineada(ref, tipo, serie.map((s) => s.semana))} />
          </section>
        );
      })}

      {mias.length > 0 && (
        <section className="tarjeta flex flex-col gap-4 p-5 sm:p-6">
          <Rotulo kanji="評">Lo más elegido, por dimensión</Rotulo>
          <ChipsSeeq datos={chipsSeeq(mias)} nombres={DIMENSION} textoChip={TEXTO_CHIP} />
        </section>
      )}

      {sesiones.length > 0 && (
        <section className="flex flex-col gap-3">
          <Rotulo kanji="史">Tus sesiones</Rotulo>
          <ul className="grid gap-3 sm:grid-cols-2">
            {sesiones.map((s) => (
              <li key={s.id}>
                <Link href={`/panel/sesion/${s.id}`} className="tarjeta-interactiva flex flex-col gap-2 p-4">
                  <span className="text-sm font-medium first-letter:uppercase">
                    {TIPO_SESION[s.tipo]} · {formatearClase(s.fecha, null)}
                  </span>
                  <span className="text-sm text-washi/55 tabular-nums">
                    CSAT {num(s.resumen.csatMedio)} · n = {s.resumen.n} · {s.resumen.total} respuestas
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Contenedor>
  );
}
