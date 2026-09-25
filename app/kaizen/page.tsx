import Link from "next/link";
import { Contenedor } from "@/components/contenedor";
import { Rotulo } from "@/components/rotulo";
import { TarjetaAccion } from "@/components/tarjeta-accion";
import { esCoach, requerirRol } from "@/lib/auth";
import { accionesConMedicion } from "@/lib/acciones-kaizen";
import { ESTADO_PDCA, ORDEN_PDCA } from "@/lib/kaizen";
import type { Grupo, PersonaDirectorio } from "@/types/database";

// Tablero Kaizen (plan 6): el coach y el super admin ven y gestionan todas; un mentor, las suyas.
export default async function KaizenPage({ searchParams }: PageProps<"/kaizen">) {
  const { estado } = await searchParams;
  const { supabase, mentor, acceso } = await requerirRol();
  const coach = esCoach(acceso.rol);
  const [lista, { data: grupos }, { data: dir }] = await Promise.all([
    accionesConMedicion(supabase, acceso.es_prueba),
    supabase.from("cp_grupos").select("id, nombre").returns<Pick<Grupo, "id" | "nombre">[]>(),
    supabase.rpc("cp_directorio"),
  ]);
  const personas = (dir ?? []) as PersonaDirectorio[];
  const filtro = typeof estado === "string" && estado in ESTADO_PDCA ? estado : null;
  const visibles = lista.filter((x) => !filtro || x.accion.estado === filtro);
  const verificadas = lista.filter((x) => ["verificar", "estandarizar"].includes(x.accion.estado)).length;

  return (
    <Contenedor mentor={mentor} acceso={acceso}>
      <section className="flex animate-aparecer flex-col gap-3">
        <Rotulo kanji="改">Kaizen</Rotulo>
        <h1 className="titular text-4xl">Mejorar un poco, cada semana</h1>
        <p className="max-w-2xl leading-relaxed text-washi/55">
          {coach
            ? "Acciones PDCA con su causa raíz y su métrica antes y después, que la app calcula sola."
            : "Las acciones de mejora que te involucran y cómo van."}
        </p>
        {coach && (
          <div className="flex flex-wrap gap-2">
            <Link href="/kaizen/nueva" className="boton-primario">
              Nueva acción
            </Link>
            <Link href="/kaizen/dijimos" className="boton-secundario">
              Dijiste, hicimos
            </Link>
          </div>
        )}
      </section>

      <p className="text-sm text-washi/55">
        {lista.length} acciones · {lista.filter((x) => !["estandarizar", "descartar"].includes(x.accion.estado)).length} abiertas ·{" "}
        {verificadas} verificadas con datos
      </p>
      <nav className="flex flex-wrap gap-2" aria-label="Filtrar por estado">
        {[["", "Todas"], ...ORDEN_PDCA.map((e) => [e, ESTADO_PDCA[e]])].map(([k, t]) => (
          <Link
            key={k}
            href={k ? `/kaizen?estado=${k}` : "/kaizen"}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium ${(filtro ?? "") === k ? "border-cian-400/50 bg-cian-400/15 text-cian-300" : "border-white/10 text-washi/55 hover:text-washi"}`}
          >
            {t}
          </Link>
        ))}
      </nav>

      {visibles.length === 0 ? (
        <p className="tarjeta p-6 text-washi/55">No hay acciones en este filtro.</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {visibles.map(({ accion, medicion }) => (
            <li key={accion.id}>
              <TarjetaAccion
                a={accion}
                medicion={medicion}
                enlace
                grupo={(grupos ?? []).find((g) => g.id === accion.grupo_id)?.nombre}
                mentor={personas.find((p) => p.mentor_id === accion.mentor_id)?.nombre}
              />
            </li>
          ))}
        </ul>
      )}
    </Contenedor>
  );
}
