import Link from "next/link";
import { REGLA, ESTADO, GRAVEDAD, estadoSla } from "@/lib/alertas";
import { fechaHoraCorta, formatearClase } from "@/lib/fecha";
import { TIPO_SESION } from "@/lib/sesiones";
import type { AlertaBandeja } from "@/types/database";

const TONO = {
  bien: "border-matcha/30 bg-matcha/10 text-matcha",
  mal: "border-shu-500/40 bg-shu-500/10 text-shu-400",
  alerta: "border-[#b38c26]/50 bg-[#b38c26]/10 text-[#e2b53a]",
  neutro: "border-white/10 bg-white/5 text-washi/60",
};
const GRAV = {
  alta: "border-shu-500/40 text-shu-400",
  media: "border-[#b38c26]/50 text-[#e2b53a]",
  operativa: "border-white/15 text-washi/60",
  kaizen: "border-ai-400/50 text-cian-300",
};

export function Insignia({ tono, children }: { tono: keyof typeof TONO; children: React.ReactNode }) {
  return <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONO[tono]}`}>{children}</span>;
}

// Tarjeta de una alerta en la bandeja (sin identidad).
export function TarjetaAlerta({ a, enlace = true }: { a: AlertaBandeja; enlace?: boolean }) {
  const sla = estadoSla(a.vence_en, a.primer_contacto_en);
  const texto = [a.texto_cambiar, a.texto_mantener, a.texto_cambio_nivel, a.texto_buzon].filter(Boolean).join(" · ");
  const cuerpo = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${GRAV[a.gravedad]}`}>
          {GRAVEDAD[a.gravedad]} · {a.regla}
        </span>
        <span className="text-sm font-medium text-washi/90">{REGLA[a.regla] ?? a.regla}</span>
        <span className="ml-auto text-xs text-washi/45">{ESTADO[a.estado]}</span>
      </div>
      {a.resumen && <p className="text-sm text-washi/75">{a.resumen}</p>}
      {texto && <p className="line-clamp-2 text-sm text-washi/55">«{texto}»</p>}
      <div className="flex flex-wrap items-center gap-2 text-xs text-washi/45">
        {a.grupo && <span>{a.grupo}</span>}
        {a.tipo_sesion && <span>· {TIPO_SESION[a.tipo_sesion]}</span>}
        {a.fecha_clase && <span className="first-letter:uppercase">· {formatearClase(a.fecha_clase, a.hora_local)}</span>}
        {a.mentor && <span>· {a.mentor}</span>}
        <span>· creada {fechaHoraCorta(a.creado_en)}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Insignia tono={sla.tono}>{sla.texto}</Insignia>
        {a.respuesta_id && !a.contacto_posible && <Insignia tono="neutro">Anónima: sin contacto posible</Insignia>}
      </div>
    </>
  );
  return enlace ? (
    <Link href={`/coach/alerta/${a.id}`} className="tarjeta-interactiva flex flex-col gap-2.5 p-4">
      {cuerpo}
    </Link>
  ) : (
    <div className="flex flex-col gap-2.5">{cuerpo}</div>
  );
}
