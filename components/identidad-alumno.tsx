"use client";

import {
  AVISO_ANONIMO,
  AVISO_MENTOR,
  CANALES_CONTACTO,
  MODOS,
  MOTIVOS_CONTACTO,
  type ModoIdentidad,
} from "@/lib/encuesta";

// Piezas compartidas por las encuestas del alumno. Textos sin guiones.
export function Opcion({ activa, onClick, children }: { activa?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={`w-full rounded-2xl border px-4 py-3.5 text-left text-base font-medium transition-colors ${
        activa
          ? "border-cian-400/60 bg-cian-400/15 text-cian-200"
          : "border-white/10 bg-white/[0.04] text-washi/85 hover:border-white/25 active:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

export function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
        activo ? "border-cian-400/60 bg-cian-400/15 text-cian-200" : "border-white/10 bg-white/[0.04] text-washi/75 hover:border-white/25"
      }`}
    >
      {children}
    </button>
  );
}

export type Identidad = {
  modo?: ModoIdentidad;
  nombre: string;
  email: string;
  telefono: string;
  cMotivo?: string;
  cCanal?: string;
  cMensaje: string;
};
export const IDENTIDAD_VACIA: Identidad = { nombre: "", email: "", telefono: "", cMensaje: "" };

export function identidadCompleta(i: Identidad, conContacto: boolean) {
  return (
    !!i.modo &&
    (i.modo === "anonimo" || conContacto || (i.nombre.trim().length >= 2 && !!(i.email.trim() || i.telefono.trim()))) &&
    (i.modo !== "contacto" || (!!i.cMotivo && !!i.cCanal))
  );
}

// Elección de identidad al final (plan 2.3), con los avisos obligatorios.
export function EleccionIdentidad({
  valor,
  cambiar,
  contacto,
  avisoMentor = true,
}: {
  valor: Identidad;
  cambiar: (v: Identidad) => void;
  /** Enlace personal: la identidad viene de GHL. */
  contacto: { nombre: string } | null;
  avisoMentor?: boolean;
}) {
  const set = (p: Partial<Identidad>) => cambiar({ ...valor, ...p });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        {MODOS.map((m) => (
          <Opcion key={m.codigo} activa={valor.modo === m.codigo} onClick={() => set({ modo: m.codigo })}>
            <span className="block">{m.texto}</span>
            <span className="mt-0.5 block text-sm font-normal text-washi/50">{m.detalle}</span>
          </Opcion>
        ))}
      </div>

      {valor.modo === "anonimo" && (
        <p className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-washi/70">{AVISO_ANONIMO}</p>
      )}
      {valor.modo && valor.modo !== "anonimo" && contacto && (
        <p className="text-sm text-washi/60">Enviarás tu respuesta como {contacto.nombre}.</p>
      )}
      {valor.modo && valor.modo !== "anonimo" && !contacto && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-washi/80">
            Tu nombre
            <input value={valor.nombre} onChange={(e) => set({ nombre: e.target.value })} maxLength={120} autoComplete="name" className="campo font-normal" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-washi/80">
            Tu correo
            <input type="email" value={valor.email} onChange={(e) => set({ email: e.target.value })} maxLength={200} autoComplete="email" className="campo font-normal" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-washi/80">
            Tu WhatsApp (si prefieres)
            <input type="tel" value={valor.telefono} onChange={(e) => set({ telefono: e.target.value })} maxLength={40} autoComplete="tel" className="campo font-normal" />
          </label>
        </div>
      )}

      {valor.modo === "contacto" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-washi/80">¿Sobre qué quieres hablar?</span>
            <div className="flex flex-wrap gap-2">
              {MOTIVOS_CONTACTO.map((m) => (
                <Chip key={m.codigo} activo={valor.cMotivo === m.codigo} onClick={() => set({ cMotivo: m.codigo })}>
                  {m.texto}
                </Chip>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-washi/80">¿Cómo prefieres que te contactemos?</span>
            <div className="flex flex-wrap gap-2">
              {CANALES_CONTACTO.map((c) => (
                <Chip key={c.codigo} activo={valor.cCanal === c.codigo} onClick={() => set({ cCanal: c.codigo })}>
                  {c.texto}
                </Chip>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-washi/80">
            Mensaje para Mike (opcional)
            <textarea value={valor.cMensaje} onChange={(e) => set({ cMensaje: e.target.value })} maxLength={1000} rows={3} className="campo font-normal" />
          </label>
        </div>
      )}

      {avisoMentor && <p className="text-sm text-washi/60">{AVISO_MENTOR}</p>}
    </div>
  );
}
