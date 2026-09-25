import Link from "next/link";
import { notFound } from "next/navigation";
import { Contenedor } from "@/components/contenedor";
import { Rotulo } from "@/components/rotulo";
import { TarjetaAlerta } from "@/components/tarjeta-alerta";
import { requerirCoach } from "@/lib/auth";
import { abierta } from "@/lib/alertas";
import { fechaHoraCorta } from "@/lib/fecha";
import type { AlertaBandeja } from "@/types/database";
import { actualizarAlerta } from "../../acciones-alertas";
import { RevelarIdentidad } from "./revelar-identidad";

export default async function AlertaPage({ params }: PageProps<"/coach/alerta/[id]">) {
  const { id } = await params;
  const { supabase, mentor, acceso } = await requerirCoach();
  const { data } = await supabase.rpc("cp_bandeja", { p_prueba: acceso.es_prueba });
  const a = ((data ?? []) as AlertaBandeja[]).find((x) => x.id === id);
  if (!a) notFound();

  const botones: [string, string][] = abierta(a.estado)
    ? [
        ...(a.estado === "nueva" && a.contacto_posible ? ([["en_contacto", "Marcar en contacto"]] as [string, string][]) : []),
        ["resuelta", "Resuelta"],
        ["descartada", "Descartar"],
      ]
    : [["nueva", "Reabrir"]];

  return (
    <Contenedor mentor={mentor} acceso={acceso} ancho="max-w-3xl">
      <Link href="/coach" className="text-sm text-washi/50 hover:text-cian-300">
        ← Bandeja
      </Link>
      <section className="tarjeta animate-aparecer p-5 sm:p-6">
        <TarjetaAlerta a={a} enlace={false} />
      </section>

      {a.regla === "R7" && (
        <Link
          href={`/kaizen/nueva?alerta=${a.id}&problema=${encodeURIComponent(a.resumen ?? "")}&enlace=${encodeURIComponent("/coach/tablero")}`}
          className="boton-primario self-start"
        >
          Crear acción PDCA
        </Link>
      )}

      {a.respuesta_id && (
        <section className="tarjeta flex flex-col gap-3 p-5 sm:p-6">
          <Rotulo kanji="人">Alumno</Rotulo>
          <RevelarIdentidad respuestaId={a.respuesta_id} />
        </section>
      )}

      <section className="tarjeta flex flex-col gap-4 p-5 sm:p-6">
        <Rotulo kanji="記">Seguimiento</Rotulo>
        {a.notas.length > 0 && (
          <ul className="flex flex-col gap-2 text-sm">
            {a.notas.map((n, i) => (
              <li key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5">
                <span className="text-xs text-washi/45">
                  {n.autor ?? "Equipo"} · {fechaHoraCorta(n.en)}
                </span>
                <p>{n.texto}</p>
              </li>
            ))}
          </ul>
        )}
        <form action={actualizarAlerta} className="flex flex-col gap-3">
          <input type="hidden" name="alerta" value={a.id} />
          <label className="flex flex-col gap-1.5 text-sm text-washi/70">
            Nota (opcional)
            <textarea name="nota" rows={3} maxLength={2000} className="campo" placeholder="Qué hiciste, qué acordaron, próximos pasos" />
          </label>
          <div className="flex flex-wrap gap-2">
            {botones.map(([estado, texto], i) => (
              <button key={estado} type="submit" name="estado" value={estado} className={i === 0 ? "boton-primario" : "boton-secundario"}>
                {texto}
              </button>
            ))}
            {abierta(a.estado) && (
              <button type="submit" name="estado" value={a.estado} className="boton-secundario">
                Solo guardar nota
              </button>
            )}
          </div>
        </form>
      </section>
    </Contenedor>
  );
}
