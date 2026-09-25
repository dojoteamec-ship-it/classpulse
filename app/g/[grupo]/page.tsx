import { Marca } from "@/components/marca";
import { Rotulo } from "@/components/rotulo";
import { formatearClase } from "@/lib/fecha";
import { TIPO_SESION } from "@/lib/sesiones";
import { createClient } from "@/lib/supabase/server";
import type { SesionPublica } from "@/types/database";

// Enlace general del Grupo (lo pega el mentor en el chat de la clase). Solo lee
// cp_sesiones_abiertas, que devuelve datos no sensibles. Las sesiones de prueba
// aparecen únicamente con ?prueba=1. Textos sin guiones: los lee el alumno.
export default async function EnlaceGeneralPage({ params, searchParams }: PageProps<"/g/[grupo]">) {
  const { grupo } = await params;
  const { prueba } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .rpc("cp_sesiones_abiertas", { p_slug: grupo, p_incluir_prueba: prueba === "1" });
  const sesiones = (data ?? []) as SesionPublica[];

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 py-10">
      <div className="animate-aparecer">
        <Marca />
      </div>
      {sesiones.length === 0 ? (
        <section className="tarjeta flex animate-aparecer flex-col gap-3 p-6 [animation-delay:100ms]">
          <Rotulo kanji="閉">Sin clase abierta</Rotulo>
          <h1 className="titular text-3xl">Ahora no hay una clase abierta para feedback</h1>
          <p className="leading-relaxed text-washi/55">
            Tu mentor abre el feedback al terminar la clase y queda disponible 24 horas. Vuelve a entrar desde el enlace del chat.
          </p>
        </section>
      ) : (
        <section className="flex animate-aparecer flex-col gap-4 [animation-delay:100ms]">
          <Rotulo kanji="脈">{sesiones[0].grupo_nombre}</Rotulo>
          <h1 className="titular text-3xl sm:text-4xl">
            {sesiones.length === 1 ? "¿Cómo te fue en la clase?" : "¿De qué clase nos quieres contar?"}
          </h1>
          <ul className="flex flex-col gap-3">
            {sesiones.map((s) => (
              <li key={s.id} className="tarjeta flex flex-col gap-2 p-5">
                <span className="font-medium first-letter:uppercase">
                  {TIPO_SESION[s.tipo_sesion]} · {formatearClase(s.fecha_clase, null)}
                </span>
                {s.mentores && <span className="text-sm text-washi/55">Con {s.mentores}</span>}
                <span className="text-xs text-washi/40">La encuesta estará disponible muy pronto.</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
