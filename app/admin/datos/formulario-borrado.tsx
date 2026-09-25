"use client";

import { useActionState } from "react";
import { borrarAlumno } from "../acciones";

export function FormularioBorrado({ hoy }: { hoy: string }) {
  const [estado, enviar, pendiente] = useActionState(borrarAlumno, undefined);
  return (
    <form action={enviar} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-washi/60">
          contact_id de GHL, correo o teléfono del alumno
          <input name="identificador" required className="campo py-2 text-sm" autoComplete="off" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-washi/60">
          Fecha en que llegó el pedido
          <input type="date" name="recibida" required max={hoy} defaultValue={estado?.valores?.recibida ?? hoy} className="campo py-2 text-sm" />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs text-washi/60">
        Nota (opcional; los correos se ocultan)
        <input name="notas" maxLength={500} defaultValue={estado?.valores?.notas} className="campo py-2 text-sm" />
      </label>
      <button type="submit" disabled={pendiente} className="boton-secundario self-start">
        {pendiente ? "Borrando…" : "Borrar su identidad"}
      </button>
      {estado?.error && <p role="alert" className="text-sm text-shu-400">{estado.error}</p>}
      {estado?.aviso && <p className="text-sm text-matcha">{estado.aviso}</p>}
    </form>
  );
}
