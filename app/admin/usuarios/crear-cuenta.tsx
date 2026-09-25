"use client";

import { useActionState } from "react";
import { crearCuenta } from "../acciones";

export function CrearCuenta() {
  const [estado, enviar, pendiente] = useActionState(crearCuenta, undefined);
  return (
    <form action={enviar} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <input name="nombre" placeholder="Nombre" defaultValue={estado?.valores?.nombre} className="campo" aria-label="Nombre de la cuenta nueva" />
        <input name="email" type="email" placeholder="Correo" defaultValue={estado?.valores?.email} className="campo" aria-label="Correo de la cuenta nueva" />
        <select name="rol" defaultValue={estado?.valores?.rol ?? "coach"} className="campo" aria-label="Rol de la cuenta nueva">
          <option value="mentor">Mentor</option>
          <option value="coach">Coach</option>
          <option value="super_admin">Super admin</option>
        </select>
      </div>
      <button type="submit" disabled={pendiente} className="boton-secundario self-start">
        {pendiente ? "Creando…" : "Crear cuenta"}
      </button>
      {estado?.error && <p role="alert" className="text-sm text-shu-400">{estado.error}</p>}
      {estado?.aviso && <p className="rounded-xl border border-matcha/30 bg-matcha/10 px-4 py-3 text-sm text-matcha">{estado.aviso}</p>}
    </form>
  );
}
