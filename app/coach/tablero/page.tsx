import Link from "next/link";
import { Contenedor } from "@/components/contenedor";
import { Bandas, ChipsSeeq, Cifra, Distribucion, num, pct } from "@/components/graficos";
import { Rotulo } from "@/components/rotulo";
import { requerirCoach } from "@/lib/auth";
import { leerConfig } from "@/lib/config";
import { DIMENSION, MOTIVOS_INASISTENCIA } from "@/lib/encuesta";
import { hoyEnEcuador, sumarDias } from "@/lib/fecha";
import { esMuestraPequena, resumenClase, tasaRespuesta } from "@/lib/metricas";
import { TIPO_SESION } from "@/lib/sesiones";
import { TEXTO_CHIP, chipsSeeq, mentoresDe, respuestasClase, type Metas } from "@/lib/tablero";
import type { Grupo, PersonaDirectorio, TipoSesion } from "@/types/database";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

// Tablero de Mike y Santi (plan 4.3 y 4.4): vista global con filtros.
export default async function CoachPage({ searchParams }: PageProps<"/coach/tablero">) {
  const sp = await searchParams;
  const { supabase, mentor, acceso } = await requerirCoach();
  const hoy = hoyEnEcuador();
  const desde = FECHA.test(texto(sp.desde)) ? texto(sp.desde) : sumarDias(hoy, -30);
  const hasta = FECHA.test(texto(sp.hasta)) ? texto(sp.hasta) : hoy;
  const f = { grupo: texto(sp.grupo), mentor: texto(sp.mentor), tipo: texto(sp.tipo) };

  const [filas, { data: grupos }, { data: dir }, metas, minima, { data: sesiones }] = await Promise.all([
    respuestasClase(supabase, { desde, hasta, prueba: acceso.es_prueba }),
    supabase.from("cp_grupos").select("*").order("orden").returns<Grupo[]>(),
    supabase.rpc("cp_directorio"),
    leerConfig<Metas>(supabase, "metas"),
    leerConfig<number>(supabase, "muestra_minima"),
    supabase
      .from("cp_sesiones")
      .select("id, grupo_id, tipo_sesion, correos_enviados, cp_sesion_mentores(mentor_id)")
      .eq("es_prueba", acceso.es_prueba)
      .gte("fecha_clase", desde)
      .lte("fecha_clase", hasta)
      .returns<{ id: string; grupo_id: string; tipo_sesion: TipoSesion; correos_enviados: number; cp_sesion_mentores: { mentor_id: string }[] }[]>(),
  ]);
  const personas = (dir ?? []) as PersonaDirectorio[];
  const nombre = (id: string) => personas.find((p) => p.mentor_id === id)?.nombre ?? "Mentor";
  const grupo = (grupos ?? []).find((g) => g.slug === f.grupo);
  const min = Number(minima ?? 15);

  const visibles = filas.filter(
    (r) =>
      (!grupo || r.grupo_id === grupo.id) &&
      (!f.tipo || r.tipo_sesion === f.tipo) &&
      (!f.mentor || mentoresDe(r).includes(f.mentor)),
  );
  const s = resumenClase(visibles);
  const sesionesFiltradas = (sesiones ?? []).filter(
    (x) =>
      (!grupo || x.grupo_id === grupo.id) &&
      (!f.tipo || x.tipo_sesion === f.tipo) &&
      (!f.mentor || x.cp_sesion_mentores.some((m) => m.mentor_id === f.mentor)),
  );
  const correos = sesionesFiltradas.reduce((a, x) => a + x.correos_enviados, 0);
  const personales = visibles.filter((r) => r.canal_entrada === "personal").length;
  const tasa = tasaRespuesta(personales, correos);
  const roja = s.bandas.n ? s.bandas.roja / s.bandas.n : null;

  // Por tipo de sesión y mentor (nunca se comparan tipos distintos).
  const tipos = (Object.keys(TIPO_SESION) as TipoSesion[]).filter((t) => visibles.some((r) => r.tipo_sesion === t));
  const porTipo = tipos.map((t) => {
    const delTipo = visibles.filter((r) => r.tipo_sesion === t);
    const ids = [...new Set(delTipo.flatMap(mentoresDe))];
    return {
      tipo: t,
      general: resumenClase(delTipo),
      mentores: ids
        .map((id) => ({ id, r: resumenClase(delTipo.filter((x) => mentoresDe(x).includes(id))) }))
        .sort((a, b) => b.r.n - a.r.n),
    };
  });

  // Motivos de inasistencia por nivel.
  const niveles = [...new Set(visibles.filter((r) => r.asistencia === "no_asistio").map((r) => r.nivel))].sort();
  const comentarios = visibles.filter((r) => r.texto_mantener || r.texto_cambiar).slice(0, 20);
  const nombreGrupo = (id: string | null) => (grupos ?? []).find((g) => g.id === id)?.nombre ?? "";

  return (
    <Contenedor mentor={mentor} acceso={acceso} ancho="max-w-6xl">
      <section className="flex animate-aparecer flex-col gap-3">
        <Rotulo kanji="全">Vista global</Rotulo>
        <h1 className="titular text-4xl">Tablero de la academia</h1>
        <p className="max-w-3xl leading-relaxed text-washi/55">
          Cada cifra lleva su n; con menos de {min} respuestas se ve atenuada. Los mentores se comparan solo dentro del
          mismo tipo de sesión.
        </p>
      </section>

      <form className="tarjeta flex flex-wrap items-end gap-3 p-4 text-sm" method="get">
        <label className="flex flex-col gap-1 text-xs text-washi/60">
          Grupo
          <select name="grupo" defaultValue={f.grupo} className="campo py-2 text-sm">
            <option value="">Todos</option>
            {(grupos ?? []).map((g) => (
              <option key={g.id} value={g.slug}>
                {g.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-washi/60">
          Mentor
          <select name="mentor" defaultValue={f.mentor} className="campo py-2 text-sm">
            <option value="">Todos</option>
            {personas.map((p) => (
              <option key={p.mentor_id} value={p.mentor_id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-washi/60">
          Tipo de sesión
          <select name="tipo" defaultValue={f.tipo} className="campo py-2 text-sm">
            <option value="">Todos</option>
            {(Object.keys(TIPO_SESION) as TipoSesion[]).map((t) => (
              <option key={t} value={t}>
                {TIPO_SESION[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-washi/60">
          Desde
          <input type="date" name="desde" defaultValue={desde} className="campo py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-washi/60">
          Hasta
          <input type="date" name="hasta" defaultValue={hasta} className="campo py-2 text-sm" />
        </label>
        <button type="submit" className="boton-secundario py-2">
          Filtrar
        </button>
        <Link href="/coach/tablero" className="py-2 text-xs text-washi/50 hover:text-cian-300">
          Limpiar
        </Link>
      </form>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Cifra etiqueta="CSAT medio" valor={num(s.csatMedio)} n={s.n} minima={min} crudo={s.csatMedio} meta={metas?.csat_medio ? { valor: metas.csat_medio, tipo: "min", texto: `≥ ${num(metas.csat_medio, 1)}` } : null} />
        <Cifra etiqueta="Top 2" valor={pct(s.top2)} n={s.n} minima={min} crudo={s.top2} meta={metas?.top2 ? { valor: metas.top2, tipo: "min", texto: `≥ ${pct(metas.top2)}` } : null} />
        <Cifra etiqueta="Bottom 2" valor={pct(s.bottom2)} n={s.n} minima={min} crudo={s.bottom2} meta={metas?.bottom2 !== undefined ? { valor: metas.bottom2, tipo: "max", texto: `≤ ${pct(metas.bottom2)}` } : null} />
        <Cifra etiqueta="Distintiva en rojo" valor={pct(roja)} n={s.bandas.n} minima={min} crudo={roja} meta={metas?.distintiva_roja !== undefined ? { valor: metas.distintiva_roja, tipo: "max", texto: `≤ ${pct(metas.distintiva_roja)}` } : null} />
        <Cifra etiqueta="Tasa de respuesta (correo)" valor={pct(tasa)} n={correos} minima={min} crudo={tasa} meta={metas?.tasa_respuesta ? { valor: metas.tasa_respuesta, tipo: "min", texto: `≥ ${pct(metas.tasa_respuesta)}` } : null} />
        <Cifra etiqueta="No pudo asistir" valor={pct(s.inasistencia)} n={s.total} minima={min} />
      </section>

      <section className="tarjeta grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
        <Distribucion distribucion={s.distribucion} n={s.n} />
        <Bandas bandas={s.bandas} />
      </section>

      {porTipo.map(({ tipo, general, mentores }) => (
        <section key={tipo} className="tarjeta flex flex-col gap-3 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">
            {TIPO_SESION[tipo]} <span className="text-sm font-normal text-washi/50">· CSAT {num(general.csatMedio)} · n = {general.n}</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm tabular-nums">
              <thead className="text-xs text-washi/45">
                <tr>
                  <th className="py-1.5 font-medium">Mentor</th>
                  <th className="font-medium">n</th>
                  <th className="font-medium">CSAT</th>
                  <th className="font-medium">Top 2</th>
                  <th className="font-medium">Bottom 2</th>
                  <th className="font-medium">Distintiva en rojo</th>
                </tr>
              </thead>
              <tbody>
                {mentores.map(({ id, r }) => (
                  <tr key={id} className={`border-t border-white/[0.06] ${esMuestraPequena(r.n, min) ? "opacity-55" : ""}`}>
                    <td className="py-2">
                      <Link href={`/coach/tablero?mentor=${id}&tipo=${tipo}&desde=${desde}&hasta=${hasta}`} className="hover:text-cian-300">
                        {nombre(id)}
                      </Link>
                      {esMuestraPequena(r.n, min) && <span className="ml-2 text-xs text-washi/50">muestra pequeña</span>}
                    </td>
                    <td>{r.n}</td>
                    <td>{num(r.csatMedio)}</td>
                    <td>{pct(r.top2)}</td>
                    <td>{pct(r.bottom2)}</td>
                    <td>{pct(r.bandas.n ? r.bandas.roja / r.bandas.n : null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="tarjeta flex flex-col gap-3 p-5 sm:p-6">
          <Rotulo kanji="欠">Motivos de inasistencia por nivel</Rotulo>
          {niveles.length === 0 ? (
            <p className="text-sm text-washi/45">Nadie declaró inasistencia en este rango.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm tabular-nums">
                <thead className="text-xs text-washi/45">
                  <tr>
                    <th className="py-1.5 font-medium">Nivel</th>
                    {MOTIVOS_INASISTENCIA.map((m) => (
                      <th key={m.codigo} className="font-medium">
                        {m.texto}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {niveles.map((n) => {
                    const r = resumenClase(visibles.filter((x) => x.nivel === n));
                    return (
                      <tr key={String(n)} className="border-t border-white/[0.06]">
                        <td className="py-2">{n === null ? "Comunidad" : `Nivel ${n}`}</td>
                        {MOTIVOS_INASISTENCIA.map((m) => (
                          <td key={m.codigo}>{r.motivos[m.codigo] ?? 0}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="tarjeta flex flex-col gap-3 p-5 sm:p-6">
          <Rotulo kanji="評">Chips por dimensión</Rotulo>
          <ChipsSeeq datos={chipsSeeq(visibles)} nombres={DIMENSION} textoChip={TEXTO_CHIP} />
        </section>
      </div>

      <section className="tarjeta flex flex-col gap-3 p-5 sm:p-6">
        <Rotulo kanji="声">Comentarios recientes (sin nombre)</Rotulo>
        {comentarios.length === 0 ? (
          <p className="text-sm text-washi/45">Sin comentarios en este rango.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {comentarios.map((c) => (
              <li key={c.id} className="flex flex-col gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm">
                <span className="text-xs text-washi/45">
                  {nombreGrupo(c.grupo_id)} · {c.tipo_sesion ? TIPO_SESION[c.tipo_sesion as TipoSesion] : ""} · {c.fecha_clase} · CSAT {c.csat ?? "—"}
                </span>
                {c.texto_mantener && (
                  <p>
                    <span className="text-matcha">Mantener:</span> {c.texto_mantener}
                  </p>
                )}
                {c.texto_cambiar && (
                  <p>
                    <span className="text-cian-300">Cambiar:</span> {c.texto_cambiar}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Contenedor>
  );
}
