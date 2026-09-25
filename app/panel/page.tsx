import { Contenedor } from "@/components/contenedor";
import { Obi } from "@/components/obi";
import { Rotulo } from "@/components/rotulo";
import { ETIQUETA_ROL, esCoach, requerirCuenta } from "@/lib/auth";
import type { Grupo } from "@/types/database";

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

  // RLS: el mentor solo ve sus asignaciones; coach y super admin, todas.
  const { data: grupos } = await supabase
    .from("cp_grupos")
    .select("*, cp_mentor_grupos(mentor_id)")
    .eq("activo", true)
    .order("orden")
    .returns<(Grupo & { cp_mentor_grupos: { mentor_id: string }[] })[]>();
  const misGrupos = esCoach(acceso.rol)
    ? (grupos ?? [])
    : (grupos ?? []).filter((g) => g.cp_mentor_grupos.some((a) => a.mentor_id === mentor.id));

  return (
    <Contenedor mentor={mentor} acceso={acceso}>
      <section className="flex animate-aparecer flex-col gap-3">
        <Rotulo kanji="脈">{ETIQUETA_ROL[acceso.rol]}</Rotulo>
        <h1 className="titular text-4xl sm:text-5xl">
          Hola, <span className="texto-acento">{mentor.nombre.split(" ")[0]}.</span>
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-washi/55">
          Aquí abrirás el feedback de tus clases y verás lo que dicen tus alumnos.
        </p>
      </section>

      <section className="flex animate-aparecer flex-col gap-4 [animation-delay:100ms]">
        <Rotulo kanji="組">{esCoach(acceso.rol) ? "Todos los Grupos" : "Tus Grupos"}</Rotulo>
        {misGrupos.length === 0 ? (
          <p className="tarjeta p-6 text-washi/55">
            Todavía no tienes Grupos asignados. El administrador te los asigna.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {misGrupos.map((g) => (
              <li key={g.id} className="tarjeta flex flex-col gap-3 p-5">
                {g.tipo === "cinturon" ? (
                  <Obi slug={g.slug} nombre={g.nombre} tamano="sm" />
                ) : (
                  <span className="rotulo">{g.nombre}</span>
                )}
                <p className="text-sm text-washi/45">Sin sesiones todavía.</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Contenedor>
  );
}
