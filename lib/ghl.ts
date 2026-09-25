import "server-only";

// Cliente mínimo de la API v2 de HighLevel con el Private Integration Token
// (solo servidor). Endpoints verificados en marketplace.gohighlevel.com/docs:
//   GET  /contacts/{contactId}      (Contacts · Get Contact), Version 2021-07-28.
//   POST /contacts/search           (Contacts · Search Contacts), Version 2021-07-28.
//   POST /conversations/messages    (Conversations · Send a new message, type Email),
//                                   Version 2021-04-15. Sin emailFrom usa el remitente
//                                   por defecto de la subcuenta.
// Verificados en vivo el 25 sep 2026 (búsqueda por tag y un correo al contacto de prueba).
const BASE = "https://services.leadconnectorhq.com";
const VERSION = "2021-07-28";
const VERSION_MENSAJES = "2021-04-15";

export type ContactoGhl = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  tags: string[];
  campos: Record<string, unknown>;
};

export const ID_CONTACTO = /^[A-Za-z0-9]{10,40}$/;

// Contactos a los que se puede escribir en modo prueba (GHL_CONTACTOS_PRUEBA).
export function contactosDePrueba(): string[] {
  return (process.env.GHL_CONTACTOS_PRUEBA ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
export const esContactoDePrueba = (id: string) => contactosDePrueba().includes(id);
export const modoEnvio = (): "prueba" | "real" => (process.env.GHL_MODO_ENVIO === "real" ? "real" : "prueba");

async function llamar(ruta: string, init?: RequestInit) {
  const token = process.env.GHL_PRIVATE_TOKEN;
  if (!token) throw new Error("Falta GHL_PRIVATE_TOKEN");
  return fetch(`${BASE}${ruta}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Version: VERSION,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
}

// Devuelve el contacto si existe en la subcuenta de la academia; null si no.
export async function obtenerContacto(id: string): Promise<ContactoGhl | null> {
  if (!ID_CONTACTO.test(id)) return null;
  const r = await llamar(`/contacts/${id}`);
  if (r.status === 400 || r.status === 404 || r.status === 422) return null;
  if (!r.ok) throw new Error(`GHL contacto ${r.status}`);
  const { contact: c } = (await r.json()) as {
    contact?: {
      id: string;
      locationId?: string;
      firstName?: string;
      lastName?: string;
      contactName?: string;
      email?: string;
      phone?: string;
      tags?: string[];
      customFields?: { id: string; value: unknown }[];
    };
  };
  if (!c || (process.env.GHL_LOCATION_ID && c.locationId !== process.env.GHL_LOCATION_ID)) return null;
  const nombre = [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || c.contactName || "Alumno";
  return {
    id: c.id,
    nombre,
    email: c.email ?? null,
    telefono: c.phone ?? null,
    tags: (c.tags ?? []).map((t) => t.toLowerCase()),
    campos: Object.fromEntries((c.customFields ?? []).map((f) => [f.id, f.value])),
  };
}

// Contactos de la subcuenta que cumplen un filtro (tag o campo personalizado).
// Solo se usa en modo real; en modo prueba los destinatarios son GHL_CONTACTOS_PRUEBA.
export async function buscarContactos(filtro: { tag: string } | { campo: string; valor: string | number }) {
  const filtros =
    "tag" in filtro
      ? [{ field: "tags", operator: "eq", value: filtro.tag }]
      : [{ field: `customFields.${filtro.campo}`, operator: "eq", value: filtro.valor }];
  const salida: { id: string; nombre: string }[] = [];
  for (let pagina = 1; pagina <= 50; pagina++) {
    const r = await llamar("/contacts/search", {
      method: "POST",
      body: JSON.stringify({ locationId: process.env.GHL_LOCATION_ID, page: pagina, pageLimit: 100, filters: filtros }),
    });
    if (!r.ok) throw new Error(`GHL búsqueda ${r.status}`);
    const { contacts = [] } = (await r.json()) as { contacts?: { id: string; firstName?: string; lastName?: string }[] };
    salida.push(...contacts.map((c) => ({ id: c.id, nombre: [c.firstName, c.lastName].filter(Boolean).join(" ") || "Alumno" })));
    if (contacts.length < 100) break;
  }
  return salida;
}

// Envía un correo al contacto. En modo prueba se niega a escribir a cualquiera que
// no esté en GHL_CONTACTOS_PRUEBA (segunda barrera, además de la selección).
export async function enviarCorreo(contactId: string, asunto: string, html: string, texto: string) {
  if (modoEnvio() === "prueba" && !esContactoDePrueba(contactId)) {
    throw new Error("Modo prueba: destinatario fuera de GHL_CONTACTOS_PRUEBA");
  }
  const r = await llamar("/conversations/messages", {
    method: "POST",
    headers: { Version: VERSION_MENSAJES },
    body: JSON.stringify({ type: "Email", contactId, subject: asunto, html, message: texto }),
  });
  if (!r.ok) throw new Error(`GHL correo ${r.status}`);
  return (await r.json()) as { messageId?: string };
}
