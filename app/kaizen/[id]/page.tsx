import Link from "next/link";
import { notFound } from "next/navigation";
import { Contenedor } from "@/components/contenedor";
import { Rotulo } from "@/components/rotulo";
import { TarjetaAccion } from "@/components/tarjeta-accion";
import { esCoach, requerirRol } from "@/lib/auth";
import { accionesConMedicion } from "@/lib/acciones-kaizen";
import type { Grupo, PersonaDirectorio } from "@/types/database";
import { FormularioAccion } from "../formulario-accion";

export default async function AccionPage({ params, searchParams }: PageProps<"/kaizen/[id]">) {
  const { id } = await params;
  const { guardada } = await searchParams;
  const { supabase, mentor, acceso } = await requerirRol();
  const [lista, { data: grupos }, { data: dir }] = await Promise.all([
    accionesConMedicion(supabase, acceso.es_prueba, { id }),
    supabase.from("cp_grupos").select("*").order("orden").returns<Grupo[]>(),
    supabase.rpc("cp_directorio"),
  ]);
  const item = lista[0];
  if (!item) notFound(); // RLS: un mentor solo ve las suyas.
  const a = item.accion;
  const personas = (dir ?? []) as PersonaDirectorio[];

  return (
    <Contenedor mentor={mentor} acceso={acceso} ancho="max-w-3xl">
      <Link href="/kaizen" className="text-sm text-washi/50 hover:text-cian-300">
        ← Kaizen
      </Link>
      {guardada && <p className="rounded-xl border border-matcha/30 bg-matcha/10 px-4 py-3 text-sm text-matcha">Acción guardada.</p>}
      <section className="tarjeta p-5 sm:p-6">
        <TarjetaAccion
          a={a}
          medicion={item.medicion}
          grupo={(grupos ?? []).find((g) => g.id === a.grupo_id)?.nombre}
          mentor={personas.find((p) => p.mentor_id === a.mentor_id)?.nombre}
        />
      </section>
      {esCoach(acceso.rol) && (
        <section className="tarjeta flex flex-col gap-4 p-6 sm:p-8">
          <Rotulo kanji="改">Editar</Rotulo>
          <FormularioAccion
            grupos={(grupos ?? []).filter((g) => g.activo)}
            personas={personas}
            inicial={{
              id: a.id,
              alerta: a.alerta_id ?? "",
              problema: a.problema,
              enlace: a.enlace_datos ?? "",
              p1: a.porques[0] ?? "",
              p2: a.porques[1] ?? "",
              p3: a.porques[2] ?? "",
              p4: a.porques[3] ?? "",
              p5: a.porques[4] ?? "",
              accion: a.accion,
              responsable: a.responsable ?? "",
              compromiso: a.fecha_compromiso ?? "",
              grupo: a.grupo_id ?? "",
              mentor: a.mentor_id ?? "",
              tipo: a.tipo_sesion ?? "",
              metrica: a.metrica,
              inicio: a.fecha_inicio,
              ventana: String(a.ventana_dias),
              estado: a.estado,
              publicar: a.publicar ? "on" : "",
            }}
          />
        </section>
      )}
    </Contenedor>
  );
}
