import Link from "next/link";
import { notFound } from "next/navigation";
import { Contenedor } from "@/components/contenedor";
import { CopiarEnlace } from "@/components/copiar-enlace";
import { CuentaRegresiva } from "@/components/cuenta-regresiva";
import { EstadoSesion, EtiquetaGrupo, MarcaPrueba } from "@/components/etiquetas";
import { Rotulo } from "@/components/rotulo";
import { requerirRol } from "@/lib/auth";
import { fechaHoraCorta, formatearClase } from "@/lib/fecha";
import { TIPO_SESION, segundosUnix } from "@/lib/sesiones";
import type { Grupo, PersonaDirectorio, Sesion, SesionMentor } from "@/types/database";
import { Bandas, Cifra, Distribucion, num, pct } from "@/components/graficos";
import { resumenClase } from "@/lib/metricas";
import type { RespuestaTablero } from "@/lib/tablero";
import { cerrarSesion } from "../../acciones";

type Detalle = Sesion & { cp_grupos: Grupo; cp_sesion_mentores: SesionMentor[] };

export default async function SesionPage({ params, searchParams }: PageProps<"/panel/sesion/[id]">) {
  const { id } = await params;
  const { nueva } = await searchParams;
  const { supabase, mentor, acceso } = await requerirRol();

  // RLS: el mentor solo ve las sesiones que dio o abrió; el coach, todas.
  const { data: s } = await supabase
    .from("cp_sesiones")
    .select("*, cp_grupos(*), cp_sesion_mentores(*)")
    .eq("id", id)
    .maybeSingle<Detalle>();
  if (!s) notFound();
  // RLS: respuestas sin identidad de esta sesión (el mentor solo ve las suyas).
  const [{ data }, { data: filas }] = await Promise.all([
    supabase.rpc("cp_directorio"),
    supabase
      .from("cp_respuestas")
      .select("csat, distintiva_banda, asistencia, motivo_inasistencia, chips, tipo_sesion, fecha_clase, canal_entrada, texto_mantener, texto_cambiar, creado_en")
      .eq("sesion_id", id)
      .order("creado_en", { ascending: false })
      .returns<RespuestaTablero[]>(),
  ]);
  const lista = filas ?? [];
  const respuestas = lista.length;
  const resumen = resumenClase(lista);
  const comentarios = lista.filter((r) => r.texto_mantener || r.texto_cambiar);
  const personas = (data ?? []) as PersonaDirectorio[];
  const nombre = (mid: string) => personas.find((p) => p.mentor_id === mid)?.nombre ?? "Mentor";
  const mentores = [...s.cp_sesion_mentores].sort((a, b) => Number(b.principal) - Number(a.principal));
  const abierta = s.estado === "abierta";
  const ruta = `/g/${s.cp_grupos.slug}${s.es_prueba ? "?prueba=1" : ""}`;

  return (
    <Contenedor mentor={mentor} acceso={acceso} ancho="max-w-3xl">
      <section className="flex animate-aparecer flex-col gap-4">
        <Link href="/panel" className="text-sm text-washi/50 hover:text-cian-300">
          ← Panel
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <EtiquetaGrupo grupo={s.cp_grupos} tamano="md" />
          <EstadoSesion abierta={abierta} />
          {s.es_prueba && <MarcaPrueba />}
        </div>
        <h1 className="titular text-3xl first-letter:uppercase sm:text-4xl">
          {TIPO_SESION[s.tipo_sesion]} · {formatearClase(s.fecha_clase, null)}
        </h1>
        <p className="text-washi/55">
          {mentores.map((m) => nombre(m.mentor_id)).join(" y ")}
          {s.rango ? ` · ${s.rango}` : ""}
        </p>
      </section>

      {nueva && abierta && (
        <p className="animate-aparecer rounded-xl border border-matcha/30 bg-matcha/10 px-4 py-3 text-sm text-matcha">
          Sesión abierta. Pega el enlace general en el chat de la clase.
        </p>
      )}

      <section className="tarjeta flex animate-aparecer flex-col gap-5 p-6 [animation-delay:100ms] sm:p-8">
        <div className="flex items-baseline gap-3">
          <span className="titular text-5xl tabular-nums">{respuestas}</span>
          <span className="text-washi/55">{respuestas === 1 ? "respuesta" : "respuestas"}</span>
          <span className="ml-auto text-sm text-washi/45">
            {s.correos_enviados > 0 ? `${s.correos_enviados} correos enviados` : s.cp_grupos.enviar_correo || s.es_prueba ? "Correos en camino…" : "Correo apagado en este Grupo"}
          </span>
        </div>
        <Rotulo kanji="鎖">Enlace general del Grupo</Rotulo>
        <CopiarEnlace ruta={ruta} />
        {s.es_prueba && (
          <p className="text-xs text-washi/45">
            Sesión de prueba: solo aparece en el enlace con <code>?prueba=1</code>. Los alumnos no la ven.
          </p>
        )}
        {abierta ? (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-sm text-washi/55">Se cierra sola en</span>
              <CuentaRegresiva objetivo={segundosUnix(s.cierra_en)} textoFin="La sesión se está cerrando…" />
            </div>
            <form action={cerrarSesion}>
              <input type="hidden" name="sesion" value={s.id} />
              <button type="submit" className="boton-secundario">
                Cerrar ahora
              </button>
            </form>
          </>
        ) : (
          <p className="text-sm text-washi/55">
            Cerrada el {fechaHoraCorta(s.cerrada_en ?? s.cierra_en)}. El enlace general ya no la muestra.
          </p>
        )}
      </section>
      {respuestas > 0 && (
        <section className="tarjeta flex animate-aparecer flex-col gap-5 p-6 [animation-delay:140ms] sm:p-8">
          <Rotulo kanji="評">Resultados</Rotulo>
          <p className="text-xs text-washi/45">
            Una sola clase no alcanza para juzgar: lee tu tendencia de 90 días en Mi tablero.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Cifra etiqueta="CSAT medio" valor={num(resumen.csatMedio)} n={resumen.n} />
            <Cifra etiqueta="Top 2" valor={pct(resumen.top2)} n={resumen.n} />
            <Cifra etiqueta="Distintiva en rojo" valor={pct(resumen.bandas.n ? resumen.bandas.roja / resumen.bandas.n : null)} n={resumen.bandas.n} />
            <Cifra etiqueta="No pudo asistir" valor={pct(resumen.inasistencia)} n={resumen.total} />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <Distribucion distribucion={resumen.distribucion} n={resumen.n} />
            <Bandas bandas={resumen.bandas} />
          </div>
          {comentarios.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-washi/80">Comentarios (sin nombre)</h2>
              <ul className="flex flex-col gap-2">
                {comentarios.map((c, i) => (
                  <li key={i} className="flex flex-col gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm">
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
            </div>
          )}
        </section>
      )}
    </Contenedor>
  );
}
