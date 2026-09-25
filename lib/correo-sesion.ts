import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { leerConfig } from "@/lib/config";
import { buscarContactos, contactosDePrueba, enviarCorreo, modoEnvio, obtenerContacto } from "@/lib/ghl";
import { formatearClase } from "@/lib/fecha";
import { TIPO_SESION } from "@/lib/sesiones";
import type { TipoSesion } from "@/types/database";

const PAUSA_MS = 150; // Holgado frente al límite de GHL (100 solicitudes cada 10 s).
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function urlApp() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
}

// Correo del enlace personal. Lo lee el alumno: sin guiones.
export function correoDeSesion(p: { nombre: string; tipo: TipoSesion; grupo: string; fecha: string; enlace: string; prueba: boolean }) {
  const primer = p.nombre.split(" ")[0];
  const clase = `${TIPO_SESION[p.tipo]} de ${p.grupo}`;
  const asunto = `${p.prueba ? "[Prueba] " : ""}¿Cómo te fue en la clase de hoy?`;
  const texto = `Hola, ${primer}. Tu mentor acaba de terminar la clase de ${clase}. Cuéntanos cómo te fue; te toma menos de un minuto: ${p.enlace} Puedes responder de forma anónima.`;
  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a1a">
<p style="font-size:16px">Hola, ${primer}.</p>
<p style="font-size:16px;line-height:1.5">Tu mentor acaba de terminar la clase de <strong>${clase}</strong> (${formatearClase(p.fecha, null)}). Cuéntanos cómo te fue; te toma menos de un minuto.</p>
<p style="margin:28px 0"><a href="${p.enlace}" style="background:#3dd0fb;color:#040914;padding:14px 26px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">Responder</a></p>
<p style="font-size:13px;color:#555;line-height:1.5">Puedes responder de forma anónima. Tu mentor lee los comentarios sin tu nombre.</p>
<p style="font-size:13px;color:#888">RoninX Academy · ClassPulse</p></div>`;
  return { asunto, html, texto };
}

// Envía el enlace personal a los alumnos del Grupo al abrir la sesión (plan 2.1).
// * Modo prueba (GHL_MODO_ENVIO=prueba): solo a GHL_CONTACTOS_PRUEBA, y solo si el
//   Grupo tiene el correo encendido o la sesión es de prueba.
// * Modo real: a los alumnos del Grupo (tag del Grupo de clientes o campo de nivel),
//   máximo 1 correo por alumno cada correo_intervalo_horas.
export async function enviarCorreosDeSesion(sesionId: string) {
  const admin = createAdminClient();
  if (!admin) return;
  const { data: s } = await admin
    .from("cp_sesiones")
    .select("id, tipo_sesion, fecha_clase, es_prueba, estado, cp_grupos(nombre, tipo, nivel, tag_ghl, enviar_correo)")
    .eq("id", sesionId)
    .maybeSingle<{
      id: string;
      tipo_sesion: TipoSesion;
      fecha_clase: string;
      es_prueba: boolean;
      estado: string;
      cp_grupos: { nombre: string; tipo: string; nivel: number | null; tag_ghl: string | null; enviar_correo: boolean };
    }>();
  if (!s || s.estado !== "abierta") return;
  const g = s.cp_grupos;
  if (!g.enviar_correo && !s.es_prueba) return;

  const real = modoEnvio() === "real";
  let destinatarios: { id: string; nombre: string }[] = [];
  if (!real) {
    for (const id of contactosDePrueba()) {
      const c = await obtenerContacto(id).catch(() => null);
      if (c) destinatarios.push({ id: c.id, nombre: c.nombre });
    }
  } else if (g.tipo === "cliente" && g.tag_ghl) {
    destinatarios = await buscarContactos({ tag: g.tag_ghl });
  } else {
    const campo = await leerConfig<string>(admin, "ghl_campo_nivel");
    if (!campo || g.nivel === null) {
      console.warn("enviarCorreosDeSesion: sin ghl_campo_nivel, no se sabe a quién enviar", sesionId);
      return;
    }
    destinatarios = await buscarContactos({ campo, valor: g.nivel });
  }

  const horas = Number((await leerConfig<number>(admin, "correo_intervalo_horas")) ?? 48);
  const desde = new Date(Date.now() - horas * 3600_000).toISOString();
  let enviados = 0;
  for (const d of destinatarios) {
    let estado: "enviado" | "omitido" | "error" = "enviado";
    let detalle: string | null = null;
    if (!s.es_prueba) {
      const { count } = await admin
        .from("cp_envios")
        .select("id", { count: "exact", head: true })
        .eq("ghl_contact_id", d.id)
        .eq("tipo", "sesion")
        .eq("estado", "enviado")
        .gt("creado_en", desde);
      if ((count ?? 0) > 0) {
        estado = "omitido";
        detalle = `ya recibió un correo en las últimas ${horas} h`;
      }
    }
    if (estado === "enviado") {
      try {
        const enlace = `${urlApp()}/f?c=${d.id}&s=${s.id}`;
        const c = correoDeSesion({ nombre: d.nombre, tipo: s.tipo_sesion, grupo: g.nombre, fecha: s.fecha_clase, enlace, prueba: !real || s.es_prueba });
        await enviarCorreo(d.id, c.asunto, c.html, c.texto);
        enviados++;
      } catch (e) {
        estado = "error";
        detalle = e instanceof Error ? e.message : String(e);
      }
      await esperar(PAUSA_MS);
    }
    await admin.from("cp_envios").insert({ sesion_id: s.id, ghl_contact_id: d.id, estado, detalle, es_prueba: s.es_prueba || !real });
  }
  if (enviados) await admin.from("cp_sesiones").update({ correos_enviados: enviados }).eq("id", s.id);
}
