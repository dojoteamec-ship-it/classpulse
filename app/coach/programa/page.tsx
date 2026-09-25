import { Contenedor } from "@/components/contenedor";
import { Cifra, num, pct } from "@/components/graficos";
import { Rotulo } from "@/components/rotulo";
import { requerirSuperAdmin } from "@/lib/auth";
import { leerConfig } from "@/lib/config";
import { APLICACION, CLIENTES_ACTIVOS, NES, NES_SUPERIORES } from "@/lib/encuesta-cinturon";
import { hoyEnEcuador, sumarDias } from "@/lib/fecha";
import { resumenCinturon, type FilaCinturon } from "@/lib/metricas";
import type { Metas } from "@/lib/tablero";
import type { Grupo } from "@/types/database";
import { FormularioAprobaciones } from "./formulario-aprobaciones";

type Aprobacion = { nivel: number; rango: string; periodo: string; presentados: number; aprobados: number };

// Vista de programa del super admin (plan 4.4): NPS, NES, CES, aplicación y clientes
// activos por Cinturón, junto a la tasa de aprobación por Rango. Últimos 12 meses.
export default async function ProgramaPage() {
  const { supabase, mentor, acceso } = await requerirSuperAdmin();
  const desde = sumarDias(hoyEnEcuador(), -365);
  const [{ data: filas }, { data: grupos }, { data: aprob }, metas, minima] = await Promise.all([
    supabase
      .from("cp_respuestas")
      .select("nivel, nps, nes, aplicacion, dificultad, ces, clientes_activos")
      .eq("encuesta", "cinturon")
      .eq("es_prueba", acceso.es_prueba)
      .gte("creado_en", desde)
      .returns<(FilaCinturon & { nivel: number })[]>(),
    supabase.from("cp_grupos").select("*").eq("tipo", "cinturon").order("orden").returns<Grupo[]>(),
    supabase
      .from("cp_aprobaciones")
      .select("nivel, rango, periodo, presentados, aprobados")
      .eq("es_prueba", acceso.es_prueba)
      .order("periodo", { ascending: false })
      .returns<Aprobacion[]>(),
    leerConfig<Metas>(supabase, "metas"),
    leerConfig<number>(supabase, "muestra_minima"),
  ]);
  const min = Number(minima ?? 15);
  const todos = resumenCinturon(filas ?? [], NES_SUPERIORES);
  const texto = (lista: { codigo: string; texto: string }[], c: Record<string, number>) =>
    lista.filter((o) => c[o.codigo]).map((o) => `${o.texto}: ${c[o.codigo]}`).join(" · ") || "—";

  return (
    <Contenedor mentor={mentor} acceso={acceso} ancho="max-w-6xl">
      <section className="flex animate-aparecer flex-col gap-3">
        <Rotulo kanji="道">Vista de programa</Rotulo>
        <h1 className="titular text-4xl">Cada Cinturón, de punta a punta</h1>
        <p className="max-w-3xl leading-relaxed text-washi/55">
          Encuesta al aprobar cada nivel (últimos 12 meses) y tasa de aprobación por Rango. Para un NPS con un margen de
          ±15 puntos hacen falta unas 126 respuestas.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Cifra etiqueta="NPS de Cinturón" valor={todos.nps === null ? "—" : String(todos.nps)} n={todos.n} minima={min} crudo={todos.nps} meta={metas?.nps ? { valor: metas.nps, tipo: "min", texto: `≥ ${metas.nps}` } : null} />
        <Cifra etiqueta="NES en las 2 superiores" valor={pct(todos.nesTop2)} n={todos.nNes} minima={min} crudo={todos.nesTop2} meta={metas?.nes_top2 ? { valor: metas.nes_top2, tipo: "min", texto: `≥ ${pct(metas.nes_top2)}` } : null} />
        <Cifra etiqueta="CES (1 a 7)" valor={num(todos.ces)} n={todos.nCes} minima={min} crudo={todos.ces} meta={metas?.ces ? { valor: metas.ces, tipo: "min", texto: `≥ ${num(metas.ces, 1)}` } : null} />
        <Cifra etiqueta="Dificultad (1 a 5)" valor={num(todos.dificultad)} n={todos.n} minima={min} />
      </section>

      <section className="tarjeta flex flex-col gap-3 p-5 sm:p-6">
        <Rotulo kanji="帯">Por Cinturón</Rotulo>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-left text-sm tabular-nums">
            <thead className="text-xs text-washi/45">
              <tr>
                <th className="py-1.5 font-medium">Cinturón</th>
                <th className="font-medium">n</th>
                <th className="font-medium">NPS</th>
                <th className="font-medium">Promotores · Pasivos · Detractores</th>
                <th className="font-medium">NES top 2</th>
                <th className="font-medium">CES</th>
                <th className="font-medium">Aplicación</th>
                <th className="font-medium">Clientes activos</th>
                <th className="font-medium">Aprobación por Rango</th>
              </tr>
            </thead>
            <tbody>
              {(grupos ?? []).map((g) => {
                const r = resumenCinturon((filas ?? []).filter((x) => x.nivel === g.nivel), NES_SUPERIORES);
                const ap = (aprob ?? []).filter((a) => a.nivel === g.nivel);
                const ultimos = [...new Map(ap.map((a) => [a.rango, a])).values()];
                return (
                  <tr key={g.id} className={`border-t border-white/[0.06] align-top ${r.n < min ? "opacity-60" : ""}`}>
                    <td className="py-2 pr-2">{g.nombre}</td>
                    <td>{r.n}</td>
                    <td>{r.nps ?? "—"}</td>
                    <td>
                      {r.promotores} · {r.pasivos} · {r.detractores}
                    </td>
                    <td>{pct(r.nesTop2)}</td>
                    <td>{num(r.ces)}</td>
                    <td className="max-w-[14rem] text-xs text-washi/60">{texto(APLICACION, r.aplicacion)}</td>
                    <td className="text-xs text-washi/60">{(g.nivel ?? 0) >= 3 ? texto(CLIENTES_ACTIVOS, r.clientes) : "No aplica"}</td>
                    <td className="text-xs text-washi/60">
                      {ultimos.length === 0
                        ? "Sin datos"
                        : ultimos.map((a) => `${a.rango}: ${pct(a.presentados ? a.aprobados / a.presentados : null)} (${a.aprobados}/${a.presentados}, ${a.periodo.slice(0, 7)})`).join(" · ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <details className="text-xs text-washi/55">
          <summary className="cursor-pointer hover:text-cian-300">Opciones del NES</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {NES.map((o) => (
              <li key={o.codigo}>
                {o.texto}: {todos.nes[o.codigo] ?? 0}
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section className="tarjeta flex flex-col gap-3 p-5 sm:p-6">
        <Rotulo kanji="録">Tasa de aprobación por Rango</Rotulo>
        <p className="text-sm text-washi/55">Carga manual en la v1. Si repites nivel, Rango y mes, se actualiza.</p>
        <FormularioAprobaciones />
      </section>
    </Contenedor>
  );
}
