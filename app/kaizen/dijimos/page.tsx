import Link from "next/link";
import { Contenedor } from "@/components/contenedor";
import { CopiarTexto } from "@/components/copiar-texto";
import { Rotulo } from "@/components/rotulo";
import { requerirCoach } from "@/lib/auth";
import { hoyEnEcuador } from "@/lib/fecha";
import { dijisteHicimos } from "@/lib/kaizen";
import type { Accion, Grupo } from "@/types/database";

// Generador mensual de «Dijiste, hicimos» por Grupo (plan 6). Sin guiones: lo publica Anita.
export default async function DijimosPage({ searchParams }: PageProps<"/kaizen/dijimos">) {
  const sp = await searchParams;
  const { supabase, mentor, acceso } = await requerirCoach();
  const mes = typeof sp.mes === "string" && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : hoyEnEcuador().slice(0, 7);
  const { data: grupos } = await supabase.from("cp_grupos").select("*").eq("activo", true).order("orden").returns<Grupo[]>();
  const grupo = (grupos ?? []).find((g) => g.slug === sp.grupo) ?? (grupos ?? [])[0];
  const [a, m] = mes.split("-").map(Number);
  const siguiente = `${m === 12 ? a + 1 : a}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`;
  // Acciones marcadas para publicar, en marcha o ya verificadas, movidas en el mes. Las de
  // toda la academia se incluyen en cada Grupo.
  const { data } = grupo
    ? await supabase
        .from("cp_acciones")
        .select("*")
        .eq("publicar", true)
        .eq("es_prueba", acceso.es_prueba)
        .in("estado", ["hacer", "verificar", "estandarizar"])
        .or(`grupo_id.eq.${grupo.id},grupo_id.is.null`)
        .gte("actualizado_en", `${mes}-01T00:00:00-05:00`)
        .lt("actualizado_en", `${siguiente}T00:00:00-05:00`)
        .order("actualizado_en")
        .returns<Accion[]>()
    : { data: [] };
  const texto = grupo ? dijisteHicimos(grupo.nombre, mes, data ?? []) : "";

  return (
    <Contenedor mentor={mentor} acceso={acceso} ancho="max-w-3xl">
      <Link href="/kaizen" className="text-sm text-washi/50 hover:text-cian-300">
        ← Kaizen
      </Link>
      <section className="flex flex-col gap-2">
        <Rotulo kanji="声">Dijiste, hicimos</Rotulo>
        <h1 className="titular text-3xl">El texto del mes para cada Grupo</h1>
        <p className="text-washi/55">Incluye las acciones marcadas para publicar. Sale sin guiones, listo para la Comunidad.</p>
      </section>
      <form method="get" className="tarjeta flex flex-wrap items-end gap-3 p-4">
        <label className="flex flex-col gap-1 text-xs text-washi/60">
          Grupo
          <select name="grupo" defaultValue={grupo?.slug} className="campo py-2 text-sm">
            {(grupos ?? []).map((g) => (
              <option key={g.id} value={g.slug}>
                {g.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-washi/60">
          Mes
          <input type="month" name="mes" defaultValue={mes} className="campo py-2 text-sm" />
        </label>
        <button type="submit" className="boton-secundario py-2">
          Generar
        </button>
      </form>
      <section className="tarjeta flex flex-col gap-3 p-5">
        <textarea readOnly value={texto} rows={14} className="campo font-normal whitespace-pre-wrap" aria-label="Texto de Dijiste, hicimos" />
        <CopiarTexto texto={texto} />
      </section>
    </Contenedor>
  );
}
