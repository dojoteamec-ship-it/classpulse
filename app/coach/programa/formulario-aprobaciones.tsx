"use client";

import { useActionState } from "react";
import { cargarAprobaciones } from "../acciones";

export function FormularioAprobaciones() {
  const [estado, enviar, pendiente] = useActionState(cargarAprobaciones, undefined);
  return (
    <form action={enviar} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm text-washi/70">
        Pega el CSV (nivel,rango,AAAA-MM,presentados,aprobados)
        <textarea
          name="csv"
          rows={4}
          defaultValue={estado?.valores?.csv}
          placeholder={"nivel,rango,periodo,presentados,aprobados\n1,Rango 1,2026-09,40,31"}
          className="campo font-mono text-xs"
        />
      </label>
      <button type="submit" disabled={pendiente} className="boton-secundario self-start">
        {pendiente ? "Guardando…" : "Guardar"}
      </button>
      {estado?.error && <p role="alert" className="text-sm text-shu-400">{estado.error}</p>}
      {estado?.aviso && <p className="text-sm text-matcha">{estado.aviso}</p>}
    </form>
  );
}
