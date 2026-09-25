"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { enviarRespuestaClase } from "@/app/encuesta/acciones";
import { Chip, EleccionIdentidad, IDENTIDAD_VACIA, Opcion, identidadCompleta, type Identidad } from "@/components/identidad-alumno";
import { ASISTENCIA, CARITAS, DISTINTIVA, LINEA_SESGO, MAX_TEXTO, MOTIVOS_INASISTENCIA, chipsPara, type Asistencia } from "@/lib/encuesta";
import { obtenerFingerprint } from "@/lib/fingerprint";
import { formatearClase } from "@/lib/fecha";
import { TIPO_SESION } from "@/lib/sesiones";
import type { SesionPublica } from "@/types/database";

type Paso = "asistencia" | "motivo" | "csat" | "distintiva" | "detalle" | "identidad" | "gracias";

export function EncuestaClase({
  sesion,
  contacto,
}: {
  sesion: SesionPublica;
  /** Enlace personal: contacto validado en GHL. Enlace general: null. */
  contacto: { id: string; nombre: string } | null;
}) {
  const inicio = useRef<number | null>(null);
  const [paso, setPaso] = useState<Paso>("asistencia");
  const [historial, setHistorial] = useState<Paso[]>([]);
  const [asistencia, setAsistencia] = useState<Asistencia>();
  const [motivo, setMotivo] = useState<string>();
  const [csat, setCsat] = useState<number>();
  const [distintiva, setDistintiva] = useState<string>();
  const [chips, setChips] = useState<string[]>([]);
  const [mantener, setMantener] = useState("");
  const [cambiar, setCambiar] = useState("");
  const [ident, setIdent] = useState<Identidad>(IDENTIDAD_VACIA);
  const [error, setError] = useState<string>();
  const [enviando, iniciar] = useTransition();

  const distintivaDef = DISTINTIVA[sesion.tipo_sesion];
  const pasos: Paso[] =
    asistencia === "no_asistio" ? ["asistencia", "motivo", "identidad"] : ["asistencia", "csat", "distintiva", "detalle", "identidad"];
  const progreso = paso === "gracias" ? 1 : (pasos.indexOf(paso) + 1) / (pasos.length + 1);

  function ir(siguiente: Paso) {
    inicio.current ??= Date.now();
    setHistorial((h) => [...h, paso]);
    setPaso(siguiente);
    setError(undefined);
    window.scrollTo({ top: 0 });
  }
  function atras() {
    setHistorial((h) => {
      const previo = h.at(-1);
      if (previo) setPaso(previo);
      return h.slice(0, -1);
    });
    setError(undefined);
  }

  function enviar() {
    setError(undefined);
    iniciar(async () => {
      const r = await enviarRespuestaClase({
        sesionId: sesion.id,
        asistencia: asistencia!,
        motivoInasistencia: motivo,
        csat,
        distintiva,
        chips,
        textoMantener: mantener,
        textoCambiar: cambiar,
        modo: ident.modo!,
        nombre: ident.nombre,
        email: ident.email,
        telefono: ident.telefono,
        contactoMotivo: ident.cMotivo,
        contactoCanal: ident.cCanal,
        contactoMensaje: ident.cMensaje,
        segundos: Math.round((Date.now() - (inicio.current ?? Date.now())) / 1000),
        fingerprint: contacto ? undefined : obtenerFingerprint(),
        contactId: contacto?.id,
      });
      if (r.ok) setPaso("gracias");
      else setError(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="h-1 overflow-hidden rounded-full bg-white/10" aria-hidden>
          <div className="h-full rounded-full bg-cian-400 transition-all duration-500" style={{ width: `${progreso * 100}%` }} />
        </div>
        <p className="text-sm text-washi/50 first-letter:uppercase">
          {TIPO_SESION[sesion.tipo_sesion]} · {formatearClase(sesion.fecha_clase, null)}
          {sesion.mentores ? ` · Con ${sesion.mentores}` : ""}
        </p>
      </div>

      <section key={paso} className="flex animate-aparecer flex-col gap-4">
        {paso === "asistencia" && (
          <>
            {contacto && <p className="text-washi/60">Hola, {contacto.nombre.split(" ")[0]}.</p>}
            <h1 className="titular text-3xl">¿Cómo viviste esta clase?</h1>
            <div className="flex flex-col gap-2.5">
              {ASISTENCIA.map((a) => (
                <Opcion
                  key={a.codigo}
                  activa={asistencia === a.codigo}
                  onClick={() => {
                    setAsistencia(a.codigo);
                    ir(a.codigo === "no_asistio" ? "motivo" : "csat");
                  }}
                >
                  {a.texto}
                </Opcion>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-washi/40">
              Tus respuestas nos ayudan a mejorar las clases. Al final eliges si respondes de forma anónima o con tu nombre.{" "}
              <Link href="/privacidad" className="underline underline-offset-2 hover:text-cian-300">
                Aviso de privacidad
              </Link>
            </p>
          </>
        )}

        {paso === "motivo" && (
          <>
            <h1 className="titular text-3xl">¿Qué pasó?</h1>
            <div className="flex flex-col gap-2.5">
              {MOTIVOS_INASISTENCIA.map((m) => (
                <Opcion
                  key={m.codigo}
                  activa={motivo === m.codigo}
                  onClick={() => {
                    setMotivo(m.codigo);
                    ir("identidad");
                  }}
                >
                  {m.texto}
                </Opcion>
              ))}
            </div>
          </>
        )}

        {paso === "csat" && (
          <>
            <h1 className="titular text-3xl">¿Cómo calificas la clase de hoy?</h1>
            <p className="text-xs leading-relaxed text-washi/45">{LINEA_SESGO}</p>
            <div className="grid grid-cols-5 gap-2">
              {CARITAS.map((c) => (
                <button
                  key={c.valor}
                  type="button"
                  aria-label={c.texto}
                  aria-pressed={csat === c.valor}
                  onClick={() => {
                    if (csat !== undefined && (csat >= 4) !== (c.valor >= 4)) setChips([]);
                    setCsat(c.valor);
                    ir("distintiva");
                  }}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border py-3 transition-colors ${
                    csat === c.valor ? "border-cian-400/60 bg-cian-400/15" : "border-white/10 bg-white/[0.04] hover:border-white/25"
                  }`}
                >
                  <span className="text-3xl sm:text-4xl" aria-hidden>
                    {c.emoji}
                  </span>
                  <span className="text-[0.65rem] text-washi/60 sm:text-xs">{c.texto}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {paso === "distintiva" && (
          <>
            <h1 className="titular text-3xl">{distintivaDef.pregunta}</h1>
            <div className="flex flex-col gap-2.5">
              {distintivaDef.opciones.map((o) => (
                <Opcion
                  key={o.codigo}
                  activa={distintiva === o.codigo}
                  onClick={() => {
                    setDistintiva(o.codigo);
                    ir("detalle");
                  }}
                >
                  {o.texto}
                </Opcion>
              ))}
            </div>
          </>
        )}

        {paso === "detalle" && csat !== undefined && (
          <>
            <h1 className="titular text-3xl">{csat >= 4 ? "¿Qué estuvo mejor?" : "¿Qué faltó?"}</h1>
            <p className="text-sm text-washi/50">Opcional. Elige las que quieras.</p>
            <div className="flex flex-wrap gap-2">
              {chipsPara(csat).map((c) => (
                <Chip
                  key={c.codigo}
                  activo={chips.includes(c.codigo)}
                  onClick={() => setChips((x) => (x.includes(c.codigo) ? x.filter((y) => y !== c.codigo) : [...x, c.codigo]))}
                >
                  {c.texto}
                </Chip>
              ))}
            </div>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-washi/80">
              ¿Qué deberíamos mantener?
              <textarea
                value={mantener}
                onChange={(e) => setMantener(e.target.value)}
                maxLength={MAX_TEXTO}
                rows={3}
                className="campo font-normal"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-washi/80">
              ¿Qué cambiarías para la próxima clase?
              <textarea
                value={cambiar}
                onChange={(e) => setCambiar(e.target.value)}
                maxLength={MAX_TEXTO}
                rows={3}
                className="campo font-normal"
              />
            </label>
            <button type="button" onClick={() => ir("identidad")} className="boton-primario w-full">
              Seguir
            </button>
          </>
        )}

        {paso === "identidad" && (
          <>
            <h1 className="titular text-3xl">¿Cómo quieres enviarla?</h1>
            <EleccionIdentidad valor={ident} cambiar={setIdent} contacto={contacto} />
            <button type="button" onClick={enviar} disabled={!identidadCompleta(ident, contacto !== null) || enviando} className="boton-primario w-full">
              {enviando ? "Enviando…" : "Enviar"}
            </button>
          </>
        )}

        {paso === "gracias" && (
          <div className="flex flex-col gap-3 py-6 text-center">
            <span className="text-5xl" aria-hidden>
              🙏
            </span>
            <h1 className="titular text-3xl">¡Gracias!</h1>
            <p className="leading-relaxed text-washi/60">
              Tu feedback ya llegó. Con él mejoramos cada clase.
              {ident.modo === "contacto" && " Mike te contactará en un día hábil."}
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-shu-500/30 bg-shu-500/10 px-4 py-3 text-sm text-shu-400">
            {error}
          </p>
        )}
      </section>

      {historial.length > 0 && paso !== "gracias" && (
        <button type="button" onClick={atras} className="self-start text-sm text-washi/50 hover:text-cian-300">
          ← Atrás
        </button>
      )}
    </div>
  );
}
