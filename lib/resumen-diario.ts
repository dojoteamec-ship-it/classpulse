import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { leerConfig } from "@/lib/config";
import { contactosDePrueba, enviarCorreo, modoEnvio } from "@/lib/ghl";
import { REGLA } from "@/lib/alertas";
import { urlApp } from "@/lib/correo-sesion";

type Fila = { regla: string; estado: string; creado_en: string; vence_en: string | null; primer_contacto_en: string | null; es_prueba: boolean };

// Resumen diario para Mike (plan 4.3): alertas nuevas, por vencer y clases sin
// feedback. Solo cifras, sin identidades. En modo prueba va a GHL_CONTACTOS_PRUEBA.
export async function enviarResumenDiario() {
  const admin = createAdminClient();
  if (!admin) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  const real = modoEnvio() === "real";
  const ahora = Date.now();
  const hace24 = new Date(ahora - 86_400_000).toISOString();
  let q = admin.from("cp_alertas").select("regla, estado, creado_en, vence_en, primer_contacto_en, es_prueba").neq("regla", "R7");
  if (real) q = q.eq("es_prueba", false);
  const { data } = await q.or(`creado_en.gte.${hace24},estado.in.(nueva,en_contacto)`).returns<Fila[]>();
  const filas = data ?? [];
  const abiertas = filas.filter((f) => f.estado === "nueva" || f.estado === "en_contacto");
  const nuevas = filas.filter((f) => f.creado_en >= hace24 && f.regla !== "R6");
  const sinContacto = abiertas.filter((f) => f.vence_en && !f.primer_contacto_en);
  const vencidas = sinContacto.filter((f) => new Date(f.vence_en!).getTime() < ahora);
  const porVencer = sinContacto.filter((f) => {
    const t = new Date(f.vence_en!).getTime();
    return t >= ahora && t < ahora + 86_400_000;
  });
  const r6 = filas.filter((f) => f.regla === "R6" && f.creado_en >= hace24);
  const porRegla = Object.entries(
    nuevas.reduce<Record<string, number>>((a, f) => ({ ...a, [f.regla]: (a[f.regla] ?? 0) + 1 }), {}),
  )
    .map(([r, n]) => `${REGLA[r] ?? r}: ${n}`)
    .join(" · ");

  const lineas = [
    `Alertas nuevas en las últimas 24 horas: ${nuevas.length}${porRegla ? ` (${porRegla})` : ""}.`,
    `Por vencer en las próximas 24 horas: ${porVencer.length}.`,
    `Vencidas sin contacto: ${vencidas.length}.`,
    `Clases sin feedback abierto (últimas 24 horas): ${r6.length}.`,
  ];
  const enlace = `${urlApp()}/coach`;
  const asunto = `${real ? "" : "[Prueba] "}ClassPulse · Resumen del día`;
  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a1a">
<p style="font-size:16px">Buenos días, Mike.</p><ul style="font-size:15px;line-height:1.7">${lineas.map((l) => `<li>${l}</li>`).join("")}</ul>
<p style="margin:24px 0"><a href="${enlace}" style="background:#3dd0fb;color:#040914;padding:12px 22px;border-radius:12px;text-decoration:none;font-weight:600">Abrir la bandeja</a></p>
<p style="font-size:12px;color:#888">Solo cifras: las identidades se ven dentro de ClassPulse.</p></div>`;
  const texto = `Buenos días, Mike. ${lineas.join(" ")} ${enlace}`;

  const destino = real ? await leerConfig<string>(admin, "ghl_contacto_resumen") : null;
  const destinatarios = real ? (destino ? [destino] : []) : contactosDePrueba();
  const resultado: { contacto: string; estado: string }[] = [];
  for (const d of destinatarios) {
    let estado: "enviado" | "error" = "enviado";
    let detalle: string | null = null;
    try {
      await enviarCorreo(d, asunto, html, texto);
    } catch (e) {
      estado = "error";
      detalle = e instanceof Error ? e.message : String(e);
    }
    await admin.from("cp_envios").insert({ tipo: "resumen", ghl_contact_id: d, estado, detalle, es_prueba: !real });
    resultado.push({ contacto: d, estado });
  }
  return { lineas, enviados: resultado };
}
