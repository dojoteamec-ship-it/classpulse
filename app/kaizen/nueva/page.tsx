import Link from "next/link";
import { Contenedor } from "@/components/contenedor";
import { Rotulo } from "@/components/rotulo";
import { requerirCoach } from "@/lib/auth";
import { hoyEnEcuador } from "@/lib/fecha";
import type { Grupo, PersonaDirectorio } from "@/types/database";
import { FormularioAccion } from "../formulario-accion";

const t = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

// Nueva acción PDCA. Puede venir precargada desde una alerta (R7, por ejemplo).
export default async function NuevaAccionPage({ searchParams }: PageProps<"/kaizen/nueva">) {
  const sp = await searchParams;
  const { supabase, mentor, acceso } = await requerirCoach();
  const [{ data: grupos }, { data: dir }] = await Promise.all([
    supabase.from("cp_grupos").select("*").eq("activo", true).order("orden").returns<Grupo[]>(),
    supabase.rpc("cp_directorio"),
  ]);
  return (
    <Contenedor mentor={mentor} acceso={acceso} ancho="max-w-3xl">
      <Link href="/kaizen" className="text-sm text-washi/50 hover:text-cian-300">
        ← Kaizen
      </Link>
      <section className="flex flex-col gap-2">
        <Rotulo kanji="計">Nueva acción PDCA</Rotulo>
        <h1 className="titular text-3xl">¿Qué vamos a mejorar?</h1>
      </section>
      <section className="tarjeta p-6 sm:p-8">
        <FormularioAccion
          grupos={grupos ?? []}
          personas={(dir ?? []) as PersonaDirectorio[]}
          inicial={{
            problema: t(sp.problema),
            alerta: t(sp.alerta),
            grupo: t(sp.grupo),
            mentor: t(sp.mentor),
            tipo: t(sp.tipo),
            enlace: t(sp.enlace),
            inicio: hoyEnEcuador(),
            ventana: "30",
            estado: "planificar",
          }}
        />
      </section>
    </Contenedor>
  );
}
