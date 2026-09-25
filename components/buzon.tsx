"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { enviarBuzon } from "@/app/encuesta/acciones";
import { EleccionIdentidad, IDENTIDAD_VACIA, identidadCompleta, type Identidad } from "@/components/identidad-alumno";

// Buzón abierto (plan 3.4). Textos para el alumno: sin guiones.
export function Buzon({ prueba }: { prueba: boolean }) {
  const [texto, setTexto] = useState("");
  const [ident, setIdent] = useState<Identidad>(IDENTIDAD_VACIA);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string>();
  const [enviando, iniciar] = useTransition();

  if (listo) {
    return (
      <section className="flex animate-aparecer flex-col gap-3 py-6 text-center">
        <span className="text-5xl" aria-hidden>
          📮
        </span>
        <h1 className="titular text-3xl">¡Gracias!</h1>
        <p className="leading-relaxed text-washi/60">
          Tu mensaje ya llegó al equipo.{ident.modo === "contacto" && " Mike te contactará en un día hábil."}
        </p>
      </section>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <section className="flex animate-aparecer flex-col gap-2">
        <h1 className="titular text-3xl">Buzón abierto</h1>
        <p className="leading-relaxed text-washi/55">
          Para lo que no encaja en una clase: pagos, accesos, trato o propuestas. Lo lee el equipo de la academia.{" "}
          <Link href="/privacidad" className="underline underline-offset-2 hover:text-cian-300">
            Aviso de privacidad
          </Link>
        </p>
      </section>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-washi/80">
        Tu mensaje
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={6} maxLength={2000} className="campo font-normal" />
      </label>
      <h2 className="text-lg font-semibold">¿Cómo quieres enviarlo?</h2>
      <EleccionIdentidad valor={ident} cambiar={setIdent} contacto={null} avisoMentor={false} />
      <button
        type="button"
        disabled={texto.trim().length < 3 || !identidadCompleta(ident, false) || enviando}
        onClick={() =>
          iniciar(async () => {
            setError(undefined);
            const r = await enviarBuzon({
              texto,
              modo: ident.modo!,
              nombre: ident.nombre,
              email: ident.email,
              telefono: ident.telefono,
              contactoMotivo: ident.cMotivo,
              contactoCanal: ident.cCanal,
              contactoMensaje: ident.cMensaje,
              prueba,
            });
            if (r.ok) setListo(true);
            else setError(r.error);
          })
        }
        className="boton-primario w-full"
      >
        {enviando ? "Enviando…" : "Enviar"}
      </button>
      {error && (
        <p role="alert" className="rounded-xl border border-shu-500/30 bg-shu-500/10 px-4 py-3 text-sm text-shu-400">
          {error}
        </p>
      )}
    </div>
  );
}
