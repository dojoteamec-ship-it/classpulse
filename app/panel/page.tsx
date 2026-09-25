import Link from "next/link";
import { Contenedor } from "@/components/contenedor";
import { CuentaRegresiva } from "@/components/cuenta-regresiva";
import { EstadoSesion, EtiquetaGrupo, MarcaPrueba } from "@/components/etiquetas";
import { Rotulo } from "@/components/rotulo";
import { ETIQUETA_ROL, esCoach, requerirCuenta } from "@/lib/auth";
import { formatearClase } from "@/lib/fecha";
import { gruposQuePuedoAbrir } from "@/lib/grupos";
import { TIPO_SESION, segundosUnix } from "@/lib/sesiones";
import type { Alerta, Grupo, Sesion } from "@/types/database";

type SesionConGrupo = Sesion & { cp_grupos: Grupo };
const RECIENTES = 8;

export default async function PanelPage() {
  const { supabase, mentor, acceso } = await requerirCuenta();

  if (!acceso) {
    return (
      <Contenedor mentor={mentor} acceso={null} ancho="max-w-2xl">
        <section className="tarjeta flex animate-aparecer flex-col gap-3 p-8">
          <Rotulo kanji="門">Sin acceso</Rotulo>
          <h1 className="titular text-3xl">Tu cuenta todavía no tiene acceso a ClassPulse</h1>
          <p className="leading-relaxed text-washi/60">
            Usas la misma cuenta de ClassVote, pero el acceso a ClassPulse lo da el administrador por separado.
            Pídele a Santi que te habilite.
          </p>
        </section>
      </Contenedor>
    );
  }

  const coach = esCoach(acceso.rol);
  // RLS: el mentor solo ve sus sesiones; el coach, todas. Las de prueba solo
  // las ven las cuentas de prueba.
  const consulta = () => {
    const q = supabase.from("cp_sesiones").select("*, cp_grupos(*)");
    return acceso.es_prueba ? q : q.eq("es_prueba", false);
  };
  const [misGrupos, { data: abiertas }, { data: recientes }, { data: avisos }] = await Promise.all([
    gruposQuePuedoAbrir(supabase, mentor.id, acceso),
    consulta().eq("estado", "abierta").order("abierta_en", { ascending: false }).returns<SesionConGrupo[]>(),
    consulta()
      .eq("estado", "cerrada")
      .order("fecha_clase", { ascending: false })
      .limit(RECIENTES)
      .returns<SesionConGrupo[]>(),
    coach
      ? supabase
          .from("cp_alertas")
          .select("*, cp_grupos(*)")
          .eq("regla", "R6")
          .eq("estado", "nueva")
          .eq("es_prueba", false)
          .order("fecha_clase", { ascending: false })
          .returns<(Alerta & { cp_grupos: Grupo | null })[]>()
      : Promise.resolve({ data: [] as (Alerta & { cp_grupos: Grupo | null })[] }),
  ]);

  return (
    <Contenedor mentor={mentor} acceso={acceso}>
      <section className="flex animate-aparecer flex-col gap-3">
        <Rotulo kanji="脈">{ETIQUETA_ROL[acceso.rol]}</Rotulo>
        <h1 className="titular text-4xl sm:text-5xl">
          Hola, <span className="texto-acento">{mentor.nombre.split(" ")[0]}.</span>
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-washi/55">
          Al terminar tu clase, abre el feedback y pega el enlace en el chat.
        </p>
        {misGrupos.length > 0 && (
          <Link href="/panel/abrir" className="boton-primario mt-2 w-full sm:w-auto sm:self-start">
            Abrir feedback
          </Link>
        )}
      </section>

      {(avisos ?? []).length > 0 && (
        <section className="flex animate-aparecer flex-col gap-3 [animation-delay:60ms]">
          <Rotulo kanji="警">Clases sin feedback abierto</Rotulo>
          <ul className="flex flex-col gap-2">
            {avisos!.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-shu-500/25 bg-shu-500/[0.07] px-4 py-3"
              >
                <div className="flex flex-col gap-1">
                  {a.cp_grupos && <EtiquetaGrupo grupo={a.cp_grupos} />}
                  <span className="text-sm text-washi/70 first-letter:uppercase">
                    {a.fecha_clase && formatearClase(a.fecha_clase, a.hora_local)}
                  </span>
                </div>
                {a.cp_grupos && (
                  <Link href={`/panel/abrir?grupo=${a.cp_grupos.slug}`} className="boton-secundario py-1.5 text-xs">
                    Abrir en nombre del mentor
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex animate-aparecer flex-col gap-3 [animation-delay:80ms]">
        <Rotulo kanji="開">Sesiones abiertas</Rotulo>
        {(abiertas ?? []).length === 0 ? (
          <p className="tarjeta p-5 text-sm text-washi/55">No hay sesiones abiertas.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {abiertas!.map((s) => (
              <li key={s.id}>
                <Link href={`/panel/sesion/${s.id}`} className="tarjeta-interactiva flex flex-col gap-3 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <EtiquetaGrupo grupo={s.cp_grupos} />
                    {s.es_prueba && <MarcaPrueba />}
                  </div>
                  <span className="font-medium first-letter:uppercase">
                    {TIPO_SESION[s.tipo_sesion]} · {formatearClase(s.fecha_clase, null)}
                  </span>
                  <span className="flex items-center gap-2 text-sm text-washi/55">
                    <EstadoSesion abierta /> se cierra en{" "}
                    <CuentaRegresiva objetivo={segundosUnix(s.cierra_en)} compacta />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex animate-aparecer flex-col gap-4 [animation-delay:100ms]">
        <Rotulo kanji="組">{coach ? "Todos los Grupos" : "Tus Grupos"}</Rotulo>
        {misGrupos.length === 0 ? (
          <p className="tarjeta p-6 text-washi/55">Todavía no tienes Grupos asignados. El administrador te los asigna.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {misGrupos.map((g) => {
              const n = (abiertas ?? []).filter((s) => s.grupo_id === g.id).length;
              return (
                <li key={g.id} className="tarjeta flex flex-col gap-3 p-5">
                  <EtiquetaGrupo grupo={g} />
                  <p className="text-sm text-washi/45">
                    {n === 0 ? "Sin sesiones abiertas." : n === 1 ? "1 sesión abierta." : `${n} sesiones abiertas.`}
                  </p>
                  <Link
                    href={`/panel/abrir?grupo=${g.slug}`}
                    className="text-sm font-medium text-cian-300/85 transition-colors hover:text-cian-200"
                  >
                    Abrir feedback →
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {(recientes ?? []).length > 0 && (
        <section className="flex animate-aparecer flex-col gap-3 [animation-delay:120ms]">
          <Rotulo kanji="史">Sesiones recientes</Rotulo>
          <ul className="flex flex-col gap-2">
            {recientes!.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/panel/sesion/${s.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm transition-colors hover:border-white/15"
                >
                  <span className="flex items-center gap-2">
                    <EtiquetaGrupo grupo={s.cp_grupos} />
                    {s.es_prueba && <MarcaPrueba />}
                  </span>
                  <span className="text-washi/60 first-letter:uppercase">
                    {TIPO_SESION[s.tipo_sesion]} · {formatearClase(s.fecha_clase, null)}
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
