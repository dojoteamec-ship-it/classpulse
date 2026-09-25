import Link from "next/link";
import { Contenedor } from "@/components/contenedor";
import { Rotulo } from "@/components/rotulo";
import { esCoach, requerirRol } from "@/lib/auth";
import { hoyEnEcuador, sumarDias } from "@/lib/fecha";
import { gruposQuePuedoAbrir } from "@/lib/grupos";
import type { Horario, PersonaDirectorio, TipoSesion } from "@/types/database";
import { FormularioAbrir } from "./formulario-abrir";

export default async function AbrirPage({ searchParams }: PageProps<"/panel/abrir">) {
  const { grupo: slug } = await searchParams;
  const { supabase, mentor, acceso } = await requerirRol();
  const grupos = await gruposQuePuedoAbrir(supabase, mentor.id, acceso);
  const hoy = hoyEnEcuador();

  // Tipo sugerido: el de la franja de hoy en el cronograma, si tiene uno.
  const dia = new Date(`${hoy}T12:00:00Z`).getUTCDay();
  const [{ data: horarios }, { data: semana }, { data: personas }] = await Promise.all([
    supabase.from("cp_horarios").select("*").eq("dia_semana", dia).eq("activo", true).returns<Horario[]>(),
    supabase.rpc("cp_semana_ab", { p_fecha: hoy }),
    supabase.rpc("cp_directorio"),
  ]);
  const tipoSugerido: Record<string, TipoSesion | undefined> = {};
  for (const h of horarios ?? []) {
    if (h.tipo_sesion && (h.semana === "todas" || h.semana === semana)) tipoSugerido[h.grupo_id] = h.tipo_sesion;
  }
  const inicial = grupos.find((g) => g.slug === slug)?.id ?? grupos[0]?.id ?? "";

  return (
    <Contenedor mentor={mentor} acceso={acceso} ancho="max-w-2xl">
      <section className="flex animate-aparecer flex-col gap-3">
        <Link href="/panel" className="text-sm text-washi/50 hover:text-cian-300">
          ← Panel
        </Link>
        <Rotulo kanji="開">Abrir feedback</Rotulo>
        <h1 className="titular text-3xl sm:text-4xl">¿Qué clase terminó?</h1>
        <p className="leading-relaxed text-washi/55">
          La sesión queda abierta 24 horas. Al abrirla verás el enlace general para pegar en el chat de la clase.
        </p>
      </section>
      <section className="tarjeta animate-aparecer p-6 [animation-delay:100ms] sm:p-8">
        {grupos.length === 0 ? (
          <p className="text-washi/60">No tienes Grupos asignados. Pídele a Santi que te asigne uno.</p>
        ) : (
          <FormularioAbrir
            grupos={grupos}
            grupoInicial={inicial}
            tipoSugerido={tipoSugerido}
            personas={(personas ?? []) as PersonaDirectorio[]}
            yo={mentor.id}
            esCoach={esCoach(acceso.rol)}
            hoy={hoy}
            minimo={sumarDias(hoy, -3)}
          />
        )}
      </section>
    </Contenedor>
  );
}
