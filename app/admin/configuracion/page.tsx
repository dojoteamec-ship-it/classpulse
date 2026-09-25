import { Contenedor } from "@/components/contenedor";
import { Rotulo } from "@/components/rotulo";
import { requerirSuperAdmin } from "@/lib/auth";
import { CLAVES_CONFIG } from "@/lib/config-admin";
import { NavegacionAdmin } from "../navegacion";
import { FormularioConfig } from "./formulario-config";

export default async function ConfiguracionPage() {
  const { supabase, mentor, acceso } = await requerirSuperAdmin();
  const { data } = await supabase.from("cp_config").select("clave, valor").returns<{ clave: string; valor: unknown }[]>();
  const valor = (c: string) => {
    const v = (data ?? []).find((x) => x.clave === c)?.valor;
    return JSON.stringify(v === undefined ? null : v, null, typeof v === "object" && v !== null ? 1 : undefined);
  };
  return (
    <Contenedor mentor={mentor} acceso={acceso} ancho="max-w-4xl">
      <section className="flex flex-col gap-3">
        <Rotulo kanji="設">Configuración</Rotulo>
        <h1 className="titular text-3xl">Umbrales, metas, SLA y horario hábil</h1>
        <p className="text-washi/55">Cada cambio se valida y queda en la auditoría. Los valores van en JSON.</p>
        <NavegacionAdmin actual="/admin/configuracion" />
      </section>
      <ul className="flex flex-col gap-3">
        {CLAVES_CONFIG.map((c) => (
          <li key={c.clave} className="tarjeta flex flex-col gap-2 p-4">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{c.titulo}</span>
              <span className="text-xs text-washi/50">
                <code>{c.clave}</code> · {c.ayuda}
              </span>
            </div>
            <FormularioConfig clave={c.clave} valor={valor(c.clave)} />
          </li>
        ))}
      </ul>
    </Contenedor>
  );
}
