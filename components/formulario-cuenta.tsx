"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { EstadoFormulario } from "@/app/sesion/acciones";

type Campo = { name: string; label: string; type: string; autoComplete: string; minLength?: number };

export function FormularioCuenta({
  accion,
  campos,
  boton,
  pie,
}: {
  accion: (estado: EstadoFormulario, form: FormData) => Promise<EstadoFormulario>;
  campos: Campo[];
  boton: string;
  pie?: { texto: string; enlace: string; href: string };
}) {
  const [estado, enviar, pendiente] = useActionState(accion, undefined);

  return (
    <form action={enviar} className="flex flex-col gap-4">
      {campos.map((campo) => (
        <label key={campo.name} className="flex flex-col gap-1.5 text-sm font-medium text-washi/80">
          {campo.label}
          <input
            name={campo.name}
            type={campo.type}
            autoComplete={campo.autoComplete}
            minLength={campo.minLength}
            defaultValue={estado?.valores?.[campo.name]}
            required
            className="campo font-normal"
          />
        </label>
      ))}
      <button type="submit" disabled={pendiente} className="boton-primario mt-1 w-full">
        {pendiente ? "Un momento…" : boton}
      </button>
      {estado?.error && (
        <p role="alert" className="rounded-xl border border-shu-500/30 bg-shu-500/10 px-4 py-3 text-sm text-shu-400">
          {estado.error}
        </p>
      )}
      {estado?.aviso && (
        <p className="rounded-xl border border-matcha/30 bg-matcha/10 px-4 py-3 text-sm text-matcha">
          {estado.aviso}
        </p>
      )}
      {pie && (
        <p className="text-center text-sm text-washi/50">
          {pie.texto}{" "}
          <Link href={pie.href} className="font-medium text-cian-300 underline-offset-4 hover:underline">
            {pie.enlace}
          </Link>
        </p>
      )}
    </form>
  );
}
