import Link from "next/link";
import { ESTADO_PDCA, METRICA, formatoMetrica, mejoro, type Medicion } from "@/lib/kaizen";
import { TIPO_SESION } from "@/lib/sesiones";
import type { Accion } from "@/types/database";

// Tarjeta de una acción PDCA con su métrica antes y después.
export function TarjetaAccion({
  a,
  medicion,
  grupo,
  mentor,
  enlace,
}: {
  a: Accion;
  medicion: { antes: Medicion; despues: Medicion } | null;
  grupo?: string;
  mentor?: string;
  enlace?: boolean;
}) {
  const m = medicion ?? { antes: a.metrica_antes, despues: a.metrica_despues };
  const cambio = mejoro(a.metrica, m.antes, m.despues);
  const pocos = (x: Medicion) => !x || x.n < 15;
  const cuerpo = (
    <>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-cian-400/40 px-2.5 py-0.5 font-semibold text-cian-300">{ESTADO_PDCA[a.estado]}</span>
        {a.publicar && <span className="rounded-full border border-matcha/40 px-2.5 py-0.5 text-matcha">Dijiste, hicimos</span>}
        <span className="text-washi/45">
          {[grupo ?? "Toda la academia", mentor, a.tipo_sesion ? TIPO_SESION[a.tipo_sesion] : null].filter(Boolean).join(" · ")}
        </span>
      </div>
      <p className="font-medium text-washi/90">{a.problema}</p>
      {a.porques.length > 0 && (
        <ol className="flex list-decimal flex-col gap-0.5 pl-5 text-xs text-washi/50">
          {a.porques.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ol>
      )}
      <p className="text-sm text-washi/70">
        <span className="text-cian-300">Acción:</span> {a.accion}
      </p>
      <p className="text-xs text-washi/45">
        {a.responsable ? `Responsable: ${a.responsable}` : "Sin responsable"}
        {a.fecha_compromiso ? ` · compromiso ${a.fecha_compromiso}` : ""}
      </p>
      <div className="grid grid-cols-2 gap-2 text-sm tabular-nums">
        {(["antes", "despues"] as const).map((k) => (
          <div key={k} className={`rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 ${pocos(m[k]) ? "opacity-60" : ""}`}>
            <span className="block text-xs text-washi/45">
              {METRICA[a.metrica].texto} {k === "antes" ? "antes" : "después"}
            </span>
            <span className="text-lg font-semibold">{formatoMetrica(a.metrica, m[k]?.valor)}</span>
            <span className="ml-2 text-xs text-washi/45">
              n = {m[k]?.n ?? 0}
              {pocos(m[k]) ? " · muestra pequeña" : ""}
            </span>
          </div>
        ))}
      </div>
      {cambio !== null && (
        <span className={`text-xs font-medium ${cambio ? "text-matcha" : "text-shu-400"}`}>{cambio ? "✓ Mejoró" : "! No mejoró"}</span>
      )}
    </>
  );
  return enlace ? (
    <Link href={`/kaizen/${a.id}`} className="tarjeta-interactiva flex flex-col gap-2.5 p-4">
      {cuerpo}
    </Link>
  ) : (
    <div className="flex flex-col gap-2.5">{cuerpo}</div>
  );
}
