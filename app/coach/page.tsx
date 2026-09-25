import Link from "next/link";
import { Contenedor } from "@/components/contenedor";
import { Cifra, pct } from "@/components/graficos";
import { Rotulo } from "@/components/rotulo";
import { TarjetaAlerta } from "@/components/tarjeta-alerta";
import { requerirCoach } from "@/lib/auth";
import { abierta, ESTADO } from "@/lib/alertas";
import { leerConfig } from "@/lib/config";
import { hoyEnEcuador, sumarDias } from "@/lib/fecha";
import type { Metas } from "@/lib/tablero";
import type { AlertaBandeja, AlertaEstado } from "@/types/database";

type Sla = { con_sla: number; en_plazo: number; vencidas_abiertas: number; mediana_horas: number | null; p90_horas: number | null };

// Bandeja de casos de Mike (plan 4.3): primera pantalla del coach.
export default async function BandejaPage({ searchParams }: PageProps<"/coach">) {
  const { estado } = await searchParams;
  const { supabase, mentor, acceso } = await requerirCoach();
  const hace30 = `${sumarDias(hoyEnEcuador(), -30)}T00:00:00-05:00`;
  const [{ data: bandeja }, { data: sla }, { data: riesgo }, metas] = await Promise.all([
    supabase.rpc("cp_bandeja", { p_prueba: acceso.es_prueba }),
    supabase.rpc("cp_metricas_sla", { p_desde: hace30, p_prueba: acceso.es_prueba }),
    supabase.rpc("cp_alumnos_en_riesgo", { p_prueba: acceso.es_prueba }),
    leerConfig<Metas>(supabase, "metas"),
  ]);
  const todas = (bandeja ?? []) as AlertaBandeja[];
  const filtro = (typeof estado === "string" ? estado : "abiertas") as AlertaEstado | "abiertas" | "todas";
  const lista = todas.filter((a) => (filtro === "todas" ? true : filtro === "abiertas" ? abierta(a.estado) : a.estado === filtro));
  const s = ((sla ?? []) as Sla[])[0];
  const cumplimiento = s && Number(s.con_sla) ? Number(s.en_plazo) / Number(s.con_sla) : null;
  const enRiesgo = (riesgo ?? []) as { respuesta_id: string; alertas: number; ultima: string; reglas: string }[];
  const alertaDe = (respuestaId: string) => todas.find((a) => a.respuesta_id === respuestaId)?.id;
  const filtros: [string, string][] = [["abiertas", "Abiertas"], ["todas", "Todas"], ...Object.entries(ESTADO)];

  return (
    <Contenedor mentor={mentor} acceso={acceso} ancho="max-w-5xl">
      <section className="flex animate-aparecer flex-col gap-3">
        <Rotulo kanji="箱">Bandeja de casos</Rotulo>
        <h1 className="titular text-4xl">Lo que necesita a una persona</h1>
        <p className="max-w-3xl leading-relaxed text-washi/55">
          Ordenado por gravedad y vencimiento del SLA (horas hábiles). Ninguna alerta hace algo automático: tú decides.
          La identidad del alumno solo se ve dentro de cada caso, y queda registrado.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Cifra etiqueta="Cumplimiento del SLA (30 días)" valor={pct(cumplimiento)} n={Number(s?.con_sla ?? 0)} minima={1} crudo={cumplimiento} meta={metas?.sla_cumplimiento ? { valor: metas.sla_cumplimiento, tipo: "min", texto: `≥ ${pct(metas.sla_cumplimiento)}` } : null} />
        <Cifra etiqueta="Tiempo hasta el contacto (mediana)" valor={s?.mediana_horas != null ? `${String(s.mediana_horas).replace(".", ",")} h` : "—"} n={Number(s?.en_plazo ?? 0)} minima={1} />
        <Cifra etiqueta="Tiempo hasta el contacto (p90)" valor={s?.p90_horas != null ? `${String(s.p90_horas).replace(".", ",")} h` : "—"} n={Number(s?.en_plazo ?? 0)} minima={1} />
        <Cifra etiqueta="Vencidas sin contacto" valor={String(s?.vencidas_abiertas ?? 0)} n={todas.filter((a) => abierta(a.estado)).length} minima={1} />
      </section>

      <nav className="flex flex-wrap gap-2" aria-label="Filtrar por estado">
        {filtros.map(([k, t]) => (
          <Link
            key={k}
            href={`/coach?estado=${k}`}
            aria-current={filtro === k ? "page" : undefined}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium ${filtro === k ? "border-cian-400/50 bg-cian-400/15 text-cian-300" : "border-white/10 text-washi/55 hover:text-washi"}`}
          >
            {t} ({k === "todas" ? todas.length : k === "abiertas" ? todas.filter((a) => abierta(a.estado)).length : todas.filter((a) => a.estado === k).length})
          </Link>
        ))}
      </nav>

      {lista.length === 0 ? (
        <p className="tarjeta p-6 text-washi/55">No hay casos en este filtro.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lista.map((a) => (
            <li key={a.id}>
              <TarjetaAlerta a={a} />
            </li>
          ))}
        </ul>
      )}

      {enRiesgo.length > 0 && (
        <section className="tarjeta flex flex-col gap-3 p-5">
          <Rotulo kanji="注">Alumnos con varias alertas (90 días)</Rotulo>
          <ul className="flex flex-col gap-2 text-sm">
            {enRiesgo.map((r) => (
              <li key={r.respuesta_id} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-2">
                <span className="text-washi/70">
                  Alumno con {r.alertas} alertas ({r.reglas})
                </span>
                {alertaDe(r.respuesta_id) && (
                  <Link href={`/coach/alerta/${alertaDe(r.respuesta_id)}`} className="text-xs font-medium text-cian-300/85 hover:text-cian-200">
                    Abrir caso →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </Contenedor>
  );
}
