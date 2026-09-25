"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { enviarRespuestaCinturon } from "@/app/encuesta/acciones";
import { Chip, EleccionIdentidad, IDENTIDAD_VACIA, Opcion, identidadCompleta, type Identidad } from "@/components/identidad-alumno";
import {
  APLICACION,
  CES_EXTREMOS,
  CLIENTES_ACTIVOS,
  DIFICULTAD,
  NES,
  PREGUNTA_CES,
  PREGUNTA_NPS,
  nesPregunta,
  preguntaClientes,
} from "@/lib/encuesta-cinturon";

function Pregunta({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <section role="group" aria-labelledby={`pregunta-${n}`} className="tarjeta flex flex-col gap-3 p-5">
      <span className="text-xs font-semibold tracking-[0.14em] text-cian-400/80 uppercase">Pregunta {n}</span>
      <h2 id={`pregunta-${n}`} className="text-lg leading-snug font-semibold text-washi">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

// Escala numérica en botones (NPS 0 a 10, dificultad 1 a 5, CES 1 a 7).
function Escala({ desde, hasta, valor, elegir, extremos }: { desde: number; hasta: number; valor?: number; elegir: (n: number) => void; extremos: [string, string] }) {
  const numeros = Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${numeros.length}, minmax(0, 1fr))` }}>
        {numeros.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={valor === n}
            onClick={() => elegir(n)}
            className={`rounded-lg border py-2.5 text-sm font-semibold tabular-nums transition-colors ${
              valor === n ? "border-cian-400/60 bg-cian-400/20 text-cian-200" : "border-white/10 bg-white/[0.04] text-washi/75 hover:border-white/25"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-washi/45">
        <span>{extremos[0]}</span>
        <span>{extremos[1]}</span>
      </div>
    </div>
  );
}

export function EncuestaCinturon({
  contacto,
  nivel,
  grupo,
  rangos,
}: {
  contacto: { id: string; nombre: string };
  nivel: number;
  grupo: string;
  rangos: string[];
}) {
  const inicio = useRef<number | null>(null);
  const [nps, setNps] = useState<number>();
  const [nes, setNes] = useState<string>();
  const [aplicacion, setAplicacion] = useState<string>();
  const [dificultad, setDificultad] = useState<number>();
  const [ces, setCes] = useState<number>();
  const [clientes, setClientes] = useState<string>();
  const [rango, setRango] = useState("");
  const [cambio, setCambio] = useState("");
  const [ident, setIdent] = useState<Identidad>(IDENTIDAD_VACIA);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string>();
  const [enviando, iniciar] = useTransition();
  const marcar = () => (inicio.current ??= Date.now());
  let k = 0;

  function enviar() {
    setError(undefined);
    iniciar(async () => {
      const r = await enviarRespuestaCinturon({
        contactId: contacto.id,
        nivel,
        nps: nps!,
        nes: nes!,
        aplicacion,
        dificultad,
        ces,
        clientesActivos: clientes,
        rangoTop: rango,
        textoCambio: cambio,
        modo: ident.modo!,
        contactoMotivo: ident.cMotivo,
        contactoCanal: ident.cCanal,
        contactoMensaje: ident.cMensaje,
        segundos: Math.round((Date.now() - (inicio.current ?? Date.now())) / 1000),
      });
      if (r.ok) {
        setListo(true);
        window.scrollTo({ top: 0 });
      } else setError(r.error);
    });
  }

  if (listo) {
    return (
      <section className="flex animate-aparecer flex-col gap-3 py-6 text-center">
        <span className="text-5xl" aria-hidden>
          🥋
        </span>
        <h1 className="titular text-3xl">¡Gracias y felicitaciones!</h1>
        <p className="leading-relaxed text-washi/60">
          Tu opinión sobre el {grupo} ya llegó. Con ella mejoramos el camino de quienes vienen detrás.
          {ident.modo === "contacto" && " Mike te contactará en un día hábil."}
        </p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-5" onPointerDown={marcar}>
      <section className="flex animate-aparecer flex-col gap-2">
        <p className="text-washi/60">Hola, {contacto.nombre.split(" ")[0]}. ¡Aprobaste el {grupo}!</p>
        <h1 className="titular text-3xl">Cuéntanos cómo fue tu nivel</h1>
        <p className="text-sm text-washi/50">
          Te toma unos 2 minutos. Al final eliges si respondes de forma anónima o con tu nombre.{" "}
          <Link href="/privacidad" className="underline underline-offset-2 hover:text-cian-300">
            Aviso de privacidad
          </Link>
        </p>
      </section>

      <Pregunta n={++k} titulo={PREGUNTA_NPS}>
        <Escala desde={0} hasta={10} valor={nps} elegir={setNps} extremos={["Nada probable", "Muy probable"]} />
      </Pregunta>

      <Pregunta n={++k} titulo={nesPregunta(nivel)}>
        <div className="flex flex-col gap-2">
          {NES.map((o) => (
            <Opcion key={o.codigo} activa={nes === o.codigo} onClick={() => setNes(o.codigo)}>
              {o.texto}
            </Opcion>
          ))}
        </div>
      </Pregunta>

      <Pregunta n={++k} titulo="¿Ya aplicaste lo del nivel?">
        <div className="flex flex-col gap-2">
          {APLICACION.map((o) => (
            <Opcion key={o.codigo} activa={aplicacion === o.codigo} onClick={() => setAplicacion(o.codigo)}>
              {o.texto}
            </Opcion>
          ))}
        </div>
      </Pregunta>

      <Pregunta n={++k} titulo="¿Qué tan difícil fue el nivel?">
        <Escala desde={1} hasta={5} valor={dificultad} elegir={setDificultad} extremos={[DIFICULTAD[0], DIFICULTAD[4]]} />
      </Pregunta>

      <Pregunta n={++k} titulo={PREGUNTA_CES}>
        <Escala desde={1} hasta={7} valor={ces} elegir={setCes} extremos={[CES_EXTREMOS[0], CES_EXTREMOS[1]]} />
      </Pregunta>

      {preguntaClientes(nivel) && (
        <Pregunta n={++k} titulo="¿Cuántos clientes activos tienes hoy?">
          <div className="flex flex-wrap gap-2">
            {CLIENTES_ACTIVOS.map((o) => (
              <Chip key={o.codigo} activo={clientes === o.codigo} onClick={() => setClientes(o.codigo)}>
                {o.texto}
              </Chip>
            ))}
          </div>
        </Pregunta>
      )}

      <Pregunta n={++k} titulo="¿Qué Rango te aportó más?">
        {rangos.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {rangos.map((r) => (
              <Chip key={r} activo={rango === r} onClick={() => setRango(r)}>
                {r}
              </Chip>
            ))}
          </div>
        ) : (
          <input value={rango} onChange={(e) => setRango(e.target.value)} maxLength={80} className="campo" aria-label="Rango" />
        )}
      </Pregunta>

      <Pregunta n={++k} titulo={`Si pudieras cambiar una sola cosa del Nivel ${nivel}, ¿cuál sería?`}>
        <textarea value={cambio} onChange={(e) => setCambio(e.target.value)} maxLength={1000} rows={3} className="campo" aria-label="Qué cambiarías" />
      </Pregunta>

      <Pregunta n={++k} titulo="¿Cómo quieres enviarla?">
        <EleccionIdentidad valor={ident} cambiar={setIdent} contacto={contacto} avisoMentor={false} />
      </Pregunta>

      <button
        type="button"
        onClick={enviar}
        disabled={nps === undefined || !nes || !identidadCompleta(ident, true) || enviando}
        className="boton-primario w-full"
      >
        {enviando ? "Enviando…" : "Enviar"}
      </button>
      {(nps === undefined || !nes) && <p className="text-center text-xs text-washi/45">Las preguntas 1 y 2 son obligatorias.</p>}
      {error && (
        <p role="alert" className="rounded-xl border border-shu-500/30 bg-shu-500/10 px-4 py-3 text-sm text-shu-400">
          {error}
        </p>
      )}
    </div>
  );
}
