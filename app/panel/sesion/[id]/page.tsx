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
  const { data } = await supabase.rpc("cp_directorio");
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
    </Contenedor>
  );
}
