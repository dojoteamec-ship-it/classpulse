"use client";

import { useActionState } from "react";
import { guardarConfig } from "../acciones";

export function FormularioConfig({ clave, valor }: { clave: string; valor: string }) {
  const [estado, enviar, pendiente] = useActionState(guardarConfig, undefined);
  return (
    <form action={enviar} className="flex flex-col gap-2">
      <input type="hidden" name="clave" value={clave} />
      <textarea
        name="valor"
        defaultValue={estado?.valores?.[clave] ?? valor}
        rows={Math.min(8, Math.max(1, valor.split("\n").length))}
        className="campo font-mono text-xs"
        aria-label={clave}
        spellCheck={false}
      />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pendiente} className="boton-secundario py-1.5 text-xs">
          {pendiente ? "Guardando…" : "Guardar"}
        </button>
        {estado?.error && <span role="alert" className="text-xs text-shu-400">{estado.error}</span>}
        {estado?.aviso && <span className="text-xs text-matcha">{estado.aviso}</span>}
      </div>
    </form>
  );
}
