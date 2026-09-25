"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sesionesParaContacto } from "@/lib/enlace-personal";
import { esContactoDePrueba, obtenerContacto } from "@/lib/ghl";
import {
  ASISTENCIA,
  CANALES_CONTACTO,
  DISTINTIVA,
  MAX_TEXTO,
  MODOS,
  MOTIVOS_CONTACTO,
  MOTIVOS_INASISTENCIA,
  VERSION_ENCUESTA_CLASE,
  chipsPara,
  type EnvioClase,
} from "@/lib/encuesta";
import {
  APLICACION,
  CLIENTES_ACTIVOS,
  NES,
  VERSION_ENCUESTA_CINTURON,
  preguntaClientes,
  type EnvioCinturon,
} from "@/lib/encuesta-cinturon";
import type { TipoSesion } from "@/types/database";

export type ResultadoEnvio = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const ERROR_GENERAL = "No pudimos guardar tu respuesta. Intenta de nuevo en un momento.";

// Excepción documentada (plan 7.4): la respuesta del alumno entra por aquí y se
// escribe con la service role, después de validar la sesión y, en el enlace
// personal, el contacto en GHL. El navegador no puede inventar una identidad.
export async function enviarRespuestaClase(envio: EnvioClase): Promise<ResultadoEnvio> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: ERROR_GENERAL };
  if (!envio || !UUID.test(envio.sesionId)) return { ok: false, error: ERROR_GENERAL };

  const { data: sesion } = await admin
    .from("cp_sesiones")
    .select("id, tipo_sesion, estado, cierra_en, es_prueba, cp_grupos(nivel)")
    .eq("id", envio.sesionId)
    .maybeSingle<{ id: string; tipo_sesion: TipoSesion; estado: string; cierra_en: string; es_prueba: boolean; cp_grupos: { nivel: number | null } }>();
  if (!sesion || sesion.estado !== "abierta" || new Date(sesion.cierra_en) <= new Date()) {
    return { ok: false, error: "Esta clase ya no recibe respuestas." };
  }

  // 1. Respuestas contra el instrumento.
  if (!ASISTENCIA.some((a) => a.codigo === envio.asistencia)) return { ok: false, error: ERROR_GENERAL };
  const noAsistio = envio.asistencia === "no_asistio";
  let csat: number | null = null;
  let distintiva: string | null = null;
  let banda: string | null = null;
  let chips: string[] = [];
  if (noAsistio) {
    if (!MOTIVOS_INASISTENCIA.some((m) => m.codigo === envio.motivoInasistencia)) {
      return { ok: false, error: "Cuéntanos qué pasó." };
    }
  } else {
    csat = Number(envio.csat);
    if (!Number.isInteger(csat) || csat < 1 || csat > 5) return { ok: false, error: "Califica la clase." };
    const opcion = DISTINTIVA[sesion.tipo_sesion].opciones.find((o) => o.codigo === envio.distintiva);
    if (!opcion) return { ok: false, error: "Responde la pregunta sobre la clase." };
    distintiva = opcion.codigo;
    banda = opcion.banda;
    const validos = new Set(chipsPara(csat).map((c) => c.codigo));
    chips = [...new Set(Array.isArray(envio.chips) ? envio.chips : [])].filter((c) => validos.has(c));
  }
  if (!MODOS.some((m) => m.codigo === envio.modo)) return { ok: false, error: "Elige cómo quieres enviar tu respuesta." };

  // 2. Identidad y clave de deduplicación según el enlace.
  let clave: string;
  let identidad: Record<string, unknown> | null = null;
  let esPrueba = sesion.es_prueba;
  const canal = envio.contactId ? "personal" : "general";
  if (envio.contactId) {
    const contacto = await obtenerContacto(envio.contactId).catch(() => null);
    if (!contacto) return { ok: false, error: "No pudimos validar tu enlace personal." };
    const permitidas = await sesionesParaContacto(contacto);
    if (!permitidas.some((s) => s.id === sesion.id)) return { ok: false, error: "Esta clase no corresponde a tu enlace." };
    clave = `c:${contacto.id}`;
    esPrueba = esPrueba || esContactoDePrueba(contacto.id);
    if (envio.modo !== "anonimo") {
      identidad = {
        nombre: contacto.nombre,
        email: contacto.email,
        telefono: contacto.telefono,
        ghl_contact_id: contacto.id,
        nivel: sesion.cp_grupos?.nivel ?? null,
      };
    }
  } else {
    if (!envio.fingerprint || !UUID.test(envio.fingerprint)) return { ok: false, error: ERROR_GENERAL };
    clave = `f:${envio.fingerprint}`;
    if (envio.modo !== "anonimo") {
      const nombre = texto(envio.nombre, 120);
      const email = texto(envio.email, 200);
      const telefono = texto(envio.telefono, 40);
      if (nombre.length < 2) return { ok: false, error: "Escribe tu nombre." };
      if (!email && !telefono) return { ok: false, error: "Déjanos tu correo o tu WhatsApp." };
      if (email && !EMAIL.test(email)) return { ok: false, error: "Revisa tu correo." };
      identidad = { nombre, email: email || null, telefono: telefono || null, nivel: sesion.cp_grupos?.nivel ?? null };
    }
  }

  let contacto: Record<string, unknown> | null = null;
  if (envio.modo === "contacto") {
    if (!MOTIVOS_CONTACTO.some((m) => m.codigo === envio.contactoMotivo)) return { ok: false, error: "Elige el motivo del contacto." };
    if (!CANALES_CONTACTO.some((c) => c.codigo === envio.contactoCanal)) return { ok: false, error: "Elige cómo prefieres que te contactemos." };
    contacto = { motivo: envio.contactoMotivo, canal_preferido: envio.contactoCanal, mensaje: texto(envio.contactoMensaje, 1000) };
  }

  const { error } = await admin.rpc("cp_registrar_respuesta", {
    p_sesion_id: sesion.id,
    p_clave: clave,
    p_respuesta: {
      version_encuesta: VERSION_ENCUESTA_CLASE,
      canal_entrada: canal,
      modo_identidad: envio.modo,
      asistencia: envio.asistencia,
      motivo_inasistencia: noAsistio ? envio.motivoInasistencia : null,
      csat,
      distintiva_codigo: distintiva,
      distintiva_banda: banda,
      chips,
      texto_mantener: noAsistio ? null : texto(envio.textoMantener, MAX_TEXTO),
      texto_cambiar: noAsistio ? null : texto(envio.textoCambiar, MAX_TEXTO),
      segundos_para_responder: Math.max(0, Math.min(86400, Math.round(Number(envio.segundos) || 0))),
    },
    p_identidad: identidad,
    p_contacto: contacto,
    p_es_prueba: esPrueba,
  });
  if (error) {
    if (error.code === "P0001") return { ok: false, error: error.message };
    console.error("enviarRespuestaClase", error.code, error.message);
    return { ok: false, error: ERROR_GENERAL };
  }
  return { ok: true };
}

// Encuesta de Cinturón (enlace personal desde el Workflow de gate de GHL).
export async function enviarRespuestaCinturon(envio: EnvioCinturon): Promise<ResultadoEnvio> {
  const admin = createAdminClient();
  if (!admin || !envio) return { ok: false, error: ERROR_GENERAL };
  const nivel = Number(envio.nivel);
  if (!Number.isInteger(nivel) || nivel < 0 || nivel > 6) return { ok: false, error: ERROR_GENERAL };
  const contacto = await obtenerContacto(String(envio.contactId)).catch(() => null);
  if (!contacto) return { ok: false, error: "No pudimos validar tu enlace personal." };

  const nps = Number(envio.nps);
  if (!Number.isInteger(nps) || nps < 0 || nps > 10) return { ok: false, error: "Responde la primera pregunta." };
  if (!NES.some((o) => o.codigo === envio.nes)) return { ok: false, error: `Cuéntanos qué dirías del Nivel ${nivel}.` };
  const en = <T,>(v: T | undefined, ok: boolean) => (ok ? v : undefined);
  const aplicacion = en(envio.aplicacion, APLICACION.some((o) => o.codigo === envio.aplicacion));
  const dificultad = en(Number(envio.dificultad), Number.isInteger(Number(envio.dificultad)) && Number(envio.dificultad) >= 1 && Number(envio.dificultad) <= 5);
  const ces = en(Number(envio.ces), Number.isInteger(Number(envio.ces)) && Number(envio.ces) >= 1 && Number(envio.ces) <= 7);
  const clientes = en(envio.clientesActivos, preguntaClientes(nivel) && CLIENTES_ACTIVOS.some((o) => o.codigo === envio.clientesActivos));
  if (!MODOS.some((m) => m.codigo === envio.modo)) return { ok: false, error: "Elige cómo quieres enviar tu respuesta." };

  let contactoPedido: Record<string, unknown> | null = null;
  if (envio.modo === "contacto") {
    if (!MOTIVOS_CONTACTO.some((m) => m.codigo === envio.contactoMotivo)) return { ok: false, error: "Elige el motivo del contacto." };
    if (!CANALES_CONTACTO.some((c) => c.codigo === envio.contactoCanal)) return { ok: false, error: "Elige cómo prefieres que te contactemos." };
    contactoPedido = { motivo: envio.contactoMotivo, canal_preferido: envio.contactoCanal, mensaje: texto(envio.contactoMensaje, 1000) };
  }

  const { error } = await admin.rpc("cp_registrar_cinturon", {
    p_contact_id: contacto.id,
    p_nivel: nivel,
    p_respuesta: {
      version_encuesta: VERSION_ENCUESTA_CINTURON,
      modo_identidad: envio.modo,
      nps,
      nes: envio.nes,
      aplicacion: aplicacion ?? null,
      dificultad: dificultad ?? null,
      ces: ces ?? null,
      clientes_activos: clientes ?? null,
      rango_top: texto(envio.rangoTop, 80) || null,
      texto_cambio_nivel: texto(envio.textoCambio, 1000) || null,
      segundos_para_responder: Math.max(0, Math.min(86400, Math.round(Number(envio.segundos) || 0))),
    },
    p_identidad:
      envio.modo === "anonimo"
        ? null
        : { nombre: contacto.nombre, email: contacto.email, telefono: contacto.telefono, ghl_contact_id: contacto.id, nivel },
    p_contacto: contactoPedido,
    p_es_prueba: esContactoDePrueba(contacto.id),
  });
  if (error) {
    if (error.code === "P0001") return { ok: false, error: error.message };
    console.error("enviarRespuestaCinturon", error.code, error.message);
    return { ok: false, error: ERROR_GENERAL };
  }
  return { ok: true };
}

// Buzón abierto (/buzon): texto libre y elección de identidad. Pasa por R1 y R4.
export async function enviarBuzon(envio: {
  texto: string;
  modo: "anonimo" | "nombre" | "contacto";
  nombre?: string;
  email?: string;
  telefono?: string;
  contactoMotivo?: string;
  contactoCanal?: string;
  contactoMensaje?: string;
  prueba?: boolean;
}): Promise<ResultadoEnvio> {
  const admin = createAdminClient();
  if (!admin || !envio) return { ok: false, error: ERROR_GENERAL };
  const mensaje = texto(envio.texto, 2000);
  if (mensaje.length < 3) return { ok: false, error: "Escribe tu mensaje." };
  if (!MODOS.some((m) => m.codigo === envio.modo)) return { ok: false, error: "Elige cómo quieres enviarlo." };
  let identidad: Record<string, unknown> | null = null;
  if (envio.modo !== "anonimo") {
    const nombre = texto(envio.nombre, 120), email = texto(envio.email, 200), telefono = texto(envio.telefono, 40);
    if (nombre.length < 2) return { ok: false, error: "Escribe tu nombre." };
    if (!email && !telefono) return { ok: false, error: "Déjanos tu correo o tu WhatsApp." };
    if (email && !EMAIL.test(email)) return { ok: false, error: "Revisa tu correo." };
    identidad = { nombre, email: email || null, telefono: telefono || null };
  }
  let contacto: Record<string, unknown> | null = null;
  if (envio.modo === "contacto") {
    if (!MOTIVOS_CONTACTO.some((m) => m.codigo === envio.contactoMotivo)) return { ok: false, error: "Elige el motivo del contacto." };
    if (!CANALES_CONTACTO.some((c) => c.codigo === envio.contactoCanal)) return { ok: false, error: "Elige cómo prefieres que te contactemos." };
    contacto = { motivo: envio.contactoMotivo, canal_preferido: envio.contactoCanal, mensaje: texto(envio.contactoMensaje, 1000) };
  }
  const { error } = await admin.rpc("cp_registrar_buzon", {
    p_texto: mensaje,
    p_modo: envio.modo,
    p_identidad: identidad,
    p_contacto: contacto,
    p_es_prueba: envio.prueba === true,
  });
  if (error) {
    if (error.code === "P0001") return { ok: false, error: error.message };
    console.error("enviarBuzon", error.code, error.message);
    return { ok: false, error: ERROR_GENERAL };
  }
  return { ok: true };
}
