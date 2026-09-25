"use client";

import { useActionState } from "react";
import { guardarAccion } from "./acciones";
import { ESTADO_PDCA, METRICA, ORDEN_PDCA, type MetricaKaizen } from "@/lib/kaizen";
import { TIPO_SESION } from "@/lib/sesiones";
import type { Grupo, PersonaDirectorio, TipoSesion } from "@/types/database";

export type ValoresAccion = Record<string, string> & { publicar?: string };

const Campo = ({ label, children, ayuda }: { label: string; children: React.ReactNode; ayuda?: string }) => (
  <label className="flex flex-col gap-1.5 text-sm font-medium text-washi/80">
    {label}
    {children}
    {ayuda && <span className="text-xs font-normal text-washi/45">{ayuda}</span>}
  </label>
);

export function FormularioAccion({ inicial, grupos, personas }: { inicial: ValoresAccion; grupos: Grupo[]; personas: PersonaDirectorio[] }) {
  const [estado, enviar, pendiente] = useActionState(guardarAccion, undefined);
  const v = { ...inicial, ...(estado?.valores ?? {}) } as ValoresAccion;
  return (
    <form action={enviar} className="flex flex-col gap-6">
      <input type="hidden" name="id" value={v.id ?? ""} />
      <input type="hidden" name="alerta" value={v.alerta ?? ""} />

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-xs font-semibold tracking-[0.14em] text-cian-400/80 uppercase">Planificar</legend>
        <Campo label="Problema observado">
          <textarea name="problema" rows={2} maxLength={1000} required defaultValue={v.problema} className="campo font-normal" />
        </Campo>
        <Campo label="Enlace a los datos (opcional)" ayuda="Por ejemplo, el tablero filtrado que muestra el problema.">
          <input name="enlace" maxLength={500} defaultValue={v.enlace} className="campo font-normal" placeholder="/coach/tablero?grupo=amarillo&tipo=kata" />
        </Campo>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-washi/80">Causa raíz: 5 porqués (opcionales)</span>
          {[1, 2, 3, 4, 5].map((i) => (
            <input key={i} name={`p${i}`} maxLength={300} defaultValue={v[`p${i}`]} className="campo font-normal" aria-label={`Porqué ${i}`} placeholder={`¿Por qué? (${i})`} />
          ))}
        </div>
        <Campo label="Acción">
          <textarea name="accion" rows={2} maxLength={1000} required defaultValue={v.accion} className="campo font-normal" />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Responsable">
            <input name="responsable" maxLength={120} defaultValue={v.responsable} className="campo font-normal" />
          </Campo>
          <Campo label="Fecha compromiso">
            <input type="date" name="compromiso" defaultValue={v.compromiso} className="campo font-normal" />
          </Campo>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-xs font-semibold tracking-[0.14em] text-cian-400/80 uppercase">Alcance y métrica</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo label="Grupo">
            <select name="grupo" defaultValue={v.grupo ?? ""} className="campo font-normal">
              <option value="">Toda la academia</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Mentor">
            <select name="mentor" defaultValue={v.mentor ?? ""} className="campo font-normal">
              <option value="">Todos</option>
              {personas.map((p) => (
                <option key={p.mentor_id} value={p.mentor_id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Tipo de sesión">
            <select name="tipo" defaultValue={v.tipo ?? ""} className="campo font-normal">
              <option value="">Todos</option>
              {(Object.keys(TIPO_SESION) as TipoSesion[]).map((t) => (
                <option key={t} value={t}>
                  {TIPO_SESION[t]}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo label="Métrica">
            <select name="metrica" defaultValue={v.metrica ?? "csat_medio"} className="campo font-normal">
              {(Object.keys(METRICA) as MetricaKaizen[]).map((m) => (
                <option key={m} value={m}>
                  {METRICA[m].texto}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Inicio de la acción" ayuda="Antes: los días previos. Después: desde aquí.">
            <input type="date" name="inicio" defaultValue={v.inicio} className="campo font-normal" />
          </Campo>
          <Campo label="Ventana (días)">
            <input type="number" name="ventana" min={7} max={180} defaultValue={v.ventana ?? "30"} className="campo font-normal" />
          </Campo>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-xs font-semibold tracking-[0.14em] text-cian-400/80 uppercase">Estado</legend>
        <div className="flex flex-wrap gap-2">
          {ORDEN_PDCA.map((e) => (
            <label key={e} className="flex cursor-pointer items-center rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-washi/70 has-[:checked]:border-cian-400/60 has-[:checked]:bg-cian-400/15 has-[:checked]:text-cian-200">
              <input type="radio" name="estado" value={e} defaultChecked={(v.estado || "planificar") === e} className="sr-only" />
              {ESTADO_PDCA[e]}
            </label>
          ))}
        </div>
        <p className="text-xs text-washi/45">Al pasar a Verificar o Estandarizar, la app congela la métrica de antes y después.</p>
        <label className="flex items-center gap-2 text-sm text-washi/80">
          <input type="checkbox" name="publicar" defaultChecked={v.publicar === "on"} className="size-4 accent-cian-400" />
          Publicar en «Dijiste, hicimos»
        </label>
      </fieldset>

      <button type="submit" disabled={pendiente} className="boton-primario self-start">
        {pendiente ? "Guardando…" : "Guardar acción"}
      </button>
      {estado?.error && (
        <p role="alert" className="rounded-xl border border-shu-500/30 bg-shu-500/10 px-4 py-3 text-sm text-shu-400">
          {estado.error}
        </p>
      )}
    </form>
  );
}
