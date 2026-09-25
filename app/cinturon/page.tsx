import { EncuestaCinturon } from "@/components/encuesta-cinturon";
import { Aviso, MarcoAlumno } from "@/components/marco-alumno";
import { leerConfig } from "@/lib/config";
import { obtenerContacto } from "@/lib/ghl";
import { createAdminClient } from "@/lib/supabase/admin";

// NPS de Cinturón: /cinturon?c={{contact.id}}&n=N. Lo envía la acción Send Email
// del Workflow de gate de GHL al aprobar el Nivel N (plan 2.2).
export default async function CinturonPage({ searchParams }: PageProps<"/cinturon">) {
  const { c, n } = await searchParams;
  const nivel = Number(n);
  const contacto = typeof c === "string" ? await obtenerContacto(c).catch(() => null) : null;
  const admin = createAdminClient();
  const { data: grupo } =
    admin && Number.isInteger(nivel)
      ? await admin.from("cp_grupos").select("nombre").eq("tipo", "cinturon").eq("nivel", nivel).maybeSingle<{ nombre: string }>()
      : { data: null };

  if (!contacto || !grupo || !admin) {
    return (
      <MarcoAlumno>
        <Aviso kanji="鍵" rotulo="Encuesta de Cinturón" titulo="No pudimos reconocer tu enlace">
          Revisa que hayas abierto el enlace completo del correo que te llegó al aprobar tu nivel.
        </Aviso>
      </MarcoAlumno>
    );
  }
  const rangos = (await leerConfig<Record<string, string[]>>(admin, "rangos_por_nivel"))?.[String(nivel)] ?? [];
  // El nombre del Grupo lleva «Cinturón X · Nivel N»; al alumno le mostramos «Cinturón X».
  const cinturon = grupo.nombre.split(" · ")[0];

  return (
    <MarcoAlumno>
      <EncuestaCinturon contacto={{ id: contacto.id, nombre: contacto.nombre }} nivel={nivel} grupo={cinturon} rangos={rangos} />
    </MarcoAlumno>
  );
}
