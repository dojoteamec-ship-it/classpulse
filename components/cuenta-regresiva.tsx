"use client";

import { useSyncExternalStore } from "react";

// Reloj compartido que avanza cada segundo. En el servidor devuelve null
// para no descuadrar la hidratación.
function suscribir(aviso: () => void) {
  const id = setInterval(aviso, 1000);
  return () => clearInterval(id);
}
const ahora = () => Math.floor(Date.now() / 1000);
const enServidor = () => null;

const dos = (n: number) => String(n).padStart(2, "0");

export function CuentaRegresiva({
  objetivo,
  compacta = false,
  textoFin = "Cerrando…",
}: {
  /** Segundos Unix del cierre. */
  objetivo: number;
  compacta?: boolean;
  textoFin?: string;
}) {
  const segundo = useSyncExternalStore(suscribir, ahora, enServidor);
  const restante = segundo === null ? null : Math.max(0, objetivo - segundo);

  if (restante === 0) {
    return <span className="text-sm text-washi/60">{textoFin}</span>;
  }

  const partes = restante === null
    ? null
    : {
        d: Math.floor(restante / 86400),
        h: Math.floor((restante % 86400) / 3600),
        m: Math.floor((restante % 3600) / 60),
        s: restante % 60,
      };

  if (compacta) {
    return (
      <span className="tabular-nums">
        {partes ? `${partes.d > 0 ? `${partes.d}d ` : ""}${dos(partes.h)}:${dos(partes.m)}:${dos(partes.s)}` : "—"}
      </span>
    );
  }

  const bloques: [string, number | undefined][] = [
    ["días", partes?.d],
    ["horas", partes?.h],
    ["min", partes?.m],
    ["seg", partes?.s],
  ];

  return (
    <div className="grid grid-cols-4 gap-2" role="timer" aria-live="off">
      {bloques.map(([etiqueta, valor]) => (
        <div
          key={etiqueta}
          className="flex flex-col items-center gap-0.5 rounded-2xl border border-white/[0.07] bg-white/[0.04] py-3 backdrop-blur"
        >
          <span className="titular text-3xl tabular-nums sm:text-4xl">
            {valor === undefined ? "--" : dos(valor)}
          </span>
          <span className="text-[0.65rem] font-medium tracking-[0.14em] text-washi/40 uppercase">{etiqueta}</span>
        </div>
      ))}
    </div>
  );
}
