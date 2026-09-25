import { EncuestaClase } from "@/components/encuesta-clase";
import { Aviso, ElegirSesion, MarcoAlumno, SIN_CLASE } from "@/components/marco-alumno";
import { createClient } from "@/lib/supabase/server";
import type { SesionPublica } from "@/types/database";

// Enlace general del Grupo (lo pega el mentor en el chat de la clase). Solo lee
// cp_sesiones_abiertas, que devuelve datos no sensibles. Las sesiones de prueba
// aparecen únicamente con ?prueba=1.
export default async function EnlaceGeneralPage({ params, searchParams }: PageProps<"/g/[grupo]">) {
  const { grupo } = await params;
  const { prueba, s } = await searchParams;
  const conPrueba = prueba === "1";
  const supabase = await createClient();
  const { data } = await supabase.rpc("cp_sesiones_abiertas", { p_slug: grupo, p_incluir_prueba: conPrueba });
  const sesiones = ((data ?? []) as SesionPublica[]).filter((x) => !conPrueba || x.es_prueba);
  const elegida = sesiones.length === 1 ? sesiones[0] : sesiones.find((x) => x.id === s);

  return (
    <MarcoAlumno>
      {sesiones.length === 0 ? (
        <Aviso kanji="閉" rotulo="Sin clase abierta" titulo="Ahora no hay una clase abierta para feedback">
          {SIN_CLASE}
        </Aviso>
      ) : elegida ? (
        <EncuestaClase sesion={elegida} contacto={null} />
      ) : (
        <ElegirSesion sesiones={sesiones} href={(id) => `?s=${id}${conPrueba ? "&prueba=1" : ""}`} />
      )}
    </MarcoAlumno>
  );
}
