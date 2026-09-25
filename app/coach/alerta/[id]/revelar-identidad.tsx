"use client";

import { useState, useTransition } from "react";
import { verIdentidad, type Historial, type Identidad } from "../../acciones-alertas";
import { CANALES_CONTACTO, MOTIVOS_CONTACTO } from "@/lib/encuesta";

const texto = (lista: { codigo: string; texto: string }[], c: string | null) => lista.find((x) => x.codigo === c)?.texto ?? c ?? "";

// La identidad no viaja con la página: se pide a propósito y queda auditada.
export function RevelarIdentidad({ respuestaId }: { respuestaId: string }) {
  const [datos, setDatos] = useState<{ identidad: Identidad | null; historial: Historial[] }>();
  const [cargando, iniciar] = useTransition();

  if (!datos) {
    return (
      <div className="flex flex-col gap-2">
        <button type="button" disabled={cargando} onClick={() => iniciar(async () => setDatos(await verIdentidad(respuestaId)))} className="boton-secundario self-start">
          {cargando ? "Cargando…" : "Ver identidad e historial"}
        </button>
        <p className="text-xs text-washi/45">Queda registrado en la auditoría que viste la identidad.</p>
      </div>
    );
  }
  const i = datos.identidad;
  if (!i) return <p className="text-sm text-washi/55">Respuesta anónima: no hay identidad guardada.</p>;
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-washi/45">Nombre</dt>
        <dd>{i.nombre}</dd>
        {i.email && (
          <>
            <dt className="text-washi/45">Correo</dt>
            <dd className="break-all">{i.email}</dd>
          </>
        )}
        {i.telefono && (
          <>
            <dt className="text-washi/45">Teléfono</dt>
            <dd>{i.telefono}</dd>
          </>
        )}
        {i.ghl_contact_id && (
          <>
            <dt className="text-washi/45">Contacto GHL</dt>
            <dd className="font-mono text-xs">{i.ghl_contact_id}</dd>
          </>
        )}
        {i.motivo && (
          <>
            <dt className="text-washi/45">Quiere hablar de</dt>
            <dd>{texto(MOTIVOS_CONTACTO, i.motivo)}</dd>
            <dt className="text-washi/45">Prefiere</dt>
            <dd>{texto(CANALES_CONTACTO, i.canal_preferido)}</dd>
          </>
        )}
        {i.mensaje && (
          <>
            <dt className="text-washi/45">Mensaje</dt>
            <dd>«{i.mensaje}»</dd>
          </>
        )}
      </dl>
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-washi/80">Historial del alumno ({datos.historial.length})</h3>
        <ul className="flex flex-col gap-1.5 text-xs text-washi/60">
          {datos.historial.map((h) => (
            <li key={h.respuesta_id} className="rounded-lg border border-white/[0.06] px-3 py-2">
              {new Date(h.creado_en).toLocaleDateString("es-EC", { timeZone: "America/Guayaquil" })} · {h.encuesta}
              {h.grupo ? ` · ${h.grupo}` : ""}
              {h.csat != null ? ` · CSAT ${h.csat}` : ""}
              {h.nps != null ? ` · NPS ${h.nps}` : ""}
              {h.banda ? ` · ${h.banda}` : ""}
              {Number(h.alertas) > 0 ? ` · ${h.alertas} alerta(s)` : ""}
              {h.texto && <span className="block text-washi/45">«{h.texto}»</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
