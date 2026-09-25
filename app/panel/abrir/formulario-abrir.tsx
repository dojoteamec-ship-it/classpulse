"use client";

import { useActionState, useState } from "react";
import { abrirSesion } from "../acciones";
import { TIPO_SESION, tiposDeGrupo } from "@/lib/sesiones";
import type { Grupo, PersonaDirectorio, TipoSesion } from "@/types/database";

type Props = {
  grupos: Grupo[];
  grupoInicial: string;
  tipoSugerido: Record<string, TipoSesion | undefined>;
  personas: PersonaDirectorio[];
  yo: string;
  esCoach: boolean;
  hoy: string;
  minimo: string;
};

const CHIP =
  "flex cursor-pointer items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors has-[:checked]:border-cian-400/60 has-[:checked]:bg-cian-400/15 has-[:checked]:text-cian-200 border-white/10 bg-white/[0.03] text-washi/70 hover:border-white/25";

export function FormularioAbrir({ grupos, grupoInicial, tipoSugerido, personas, yo, esCoach, hoy, minimo }: Props) {
  const [estado, enviar, pendiente] = useActionState(abrirSesion, undefined);
  const [grupoId, setGrupoId] = useState(estado?.valores?.grupo || grupoInicial);
  const grupo = grupos.find((g) => g.id === grupoId) ?? grupos[0];
  const tipos = grupo ? tiposDeGrupo(grupo.tipo) : [];
  const tipoInicial = estado?.valores?.tipo || tipoSugerido[grupo?.id ?? ""] || (tipos.length === 1 ? tipos[0] : "");
  const otros = personas.filter((p) => p.mentor_id !== yo && p.activo);

  return (
    <form action={enviar} className="flex flex-col gap-6">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-washi/80">
        Grupo
        <select
          name="grupo"
          value={grupoId}
          onChange={(e) => setGrupoId(e.target.value)}
          className="campo font-normal"
          required
        >
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nombre}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-2" key={grupo?.id}>
        <legend className="mb-1.5 text-sm font-medium text-washi/80">Tipo de sesión</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tipos.map((t) => (
            <label key={t} className={CHIP}>
              <input type="radio" name="tipo" value={t} defaultChecked={t === tipoInicial} className="sr-only" required />
              {TIPO_SESION[t]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-washi/80">
          Fecha de la clase
          <input
            type="date"
            name="fecha"
            defaultValue={estado?.valores?.fecha || hoy}
            min={minimo}
            max={hoy}
            required
            className="campo font-normal"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-washi/80">
          Rango (opcional)
          <input
            name="rango"
            maxLength={80}
            defaultValue={estado?.valores?.rango}
            placeholder="Por ejemplo, Rango 3"
            className="campo font-normal"
          />
        </label>
      </div>

      {esCoach && (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-washi/80">
          ¿Quién dio la clase?
          <select name="principal" defaultValue={estado?.valores?.principal || yo} className="campo font-normal">
            {personas
              .filter((p) => p.activo)
              .map((p) => (
                <option key={p.mentor_id} value={p.mentor_id}>
                  {p.mentor_id === yo ? `${p.nombre} (yo)` : p.nombre}
                </option>
              ))}
          </select>
          <span className="text-xs font-normal text-washi/45">Como coach puedes abrirla en nombre del mentor.</span>
        </label>
      )}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-washi/80">
        Co-mentor (opcional)
        <select name="co_mentor" defaultValue={estado?.valores?.co_mentor ?? ""} className="campo font-normal">
          <option value="">Sin co-mentor</option>
          {otros.map((p) => (
            <option key={p.mentor_id} value={p.mentor_id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </label>

      <button type="submit" disabled={pendiente} className="boton-primario w-full sm:w-auto sm:self-start">
        {pendiente ? "Abriendo…" : "Abrir feedback"}
      </button>
      {estado?.error && (
        <p role="alert" className="rounded-xl border border-shu-500/30 bg-shu-500/10 px-4 py-3 text-sm text-shu-400">
          {estado.error}
        </p>
      )}
    </form>
  );
}
