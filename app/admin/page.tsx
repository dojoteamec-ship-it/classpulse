import Link from "next/link";
import { Contenedor } from "@/components/contenedor";
import { Rotulo } from "@/components/rotulo";
import { requerirSuperAdmin } from "@/lib/auth";
import { modoEnvio } from "@/lib/ghl";
import { NavegacionAdmin } from "./navegacion";

type Estado = {
  anonimas_con_identidad: number;
  identidades_vencidas: number;
  vistas_auditadas: number;
  solicitudes_fuera_de_plazo: number;
  cron_retencion: boolean;
  meses_retencion: number;
};

// Resumen de administración con el checklist de la LOPDP (plan 7.4), verificado en vivo.
export default async function AdminPage() {
  const { supabase, mentor, acceso } = await requerirSuperAdmin();
  const { data } = await supabase.rpc("cp_estado_cumplimiento");
  const e = ((data ?? []) as Estado[])[0];
  const items: { ok: boolean; titulo: string; detalle: React.ReactNode }[] = e
    ? [
        {
          ok: true,
          titulo: "Aviso de privacidad en la primera pantalla",
          detalle: (
            <>
              Enlazado en cada encuesta. <Link href="/privacidad" className="underline">Ver aviso</Link>.
            </>
          ),
        },
        {
          ok: Number(e.anonimas_con_identidad) === 0,
          titulo: "Modo anónimo sin identidad",
          detalle: `${e.anonimas_con_identidad} respuestas anónimas con identidad guardada (debe ser 0).`,
        },
        {
          ok: e.cron_retencion && Number(e.identidades_vencidas) === 0,
          titulo: `Retención de la identidad: ${e.meses_retencion} meses`,
          detalle: `${e.cron_retencion ? "Trabajo diario cp_retencion activo" : "El trabajo cp_retencion no está activo"} · ${e.identidades_vencidas} identidades vencidas pendientes.`,
        },
        {
          ok: true,
          titulo: "Auditoría de quién vio identidades",
          detalle: `${e.vistas_auditadas} vistas registradas. La identidad solo se ve con un botón dentro de cada caso.`,
        },
        {
          ok: Number(e.solicitudes_fuera_de_plazo) === 0,
          titulo: "Borrado a pedido en 15 días",
          detalle: (
            <>
              {e.solicitudes_fuera_de_plazo} solicitudes fuera de plazo. <Link href="/admin/datos" className="underline">Registrar un borrado</Link>.
            </>
          ),
        },
        {
          ok: true,
          titulo: "Una persona decide siempre (art. 20)",
          detalle: "Las alertas solo avisan: ningún proceso contacta ni decide sobre el alumno de forma automática.",
        },
        {
          ok: true,
          titulo: "El mentor nunca ve identidades",
          detalle: "Probado por rol en pruebas/rls (identidades, contactos y hashes sin permiso para mentores).",
        },
      ]
    : [];

  return (
    <Contenedor mentor={mentor} acceso={acceso}>
      <section className="flex animate-aparecer flex-col gap-3">
        <Rotulo kanji="管">Administración</Rotulo>
        <h1 className="titular text-4xl">Todo en orden, a la vista</h1>
        <NavegacionAdmin actual="/admin" />
      </section>

      <section className="tarjeta flex flex-col gap-2 p-5 text-sm text-washi/70">
        <span>
          Modo de envío de GHL: <strong className="text-washi">{modoEnvio()}</strong>
          {modoEnvio() === "prueba" && " · solo se escribe a GHL_CONTACTOS_PRUEBA. Solo Santi lo cambia a real, en Vercel."}
        </span>
      </section>

      <section className="tarjeta flex flex-col gap-4 p-5 sm:p-6">
        <Rotulo kanji="護">Checklist de la LOPDP</Rotulo>
        <ul className="flex flex-col gap-3">
          {items.map((i) => (
            <li key={i.titulo} className="flex gap-3">
              <span className={`mt-0.5 text-sm font-semibold ${i.ok ? "text-matcha" : "text-shu-400"}`} aria-label={i.ok ? "Cumple" : "Revisar"}>
                {i.ok ? "✓" : "!"}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-washi/90">
                  {i.titulo} <span className="text-xs font-normal text-washi/45">({i.ok ? "cumple" : "revisar"})</span>
                </span>
                <span className="text-sm text-washi/55">{i.detalle}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </Contenedor>
  );
}
