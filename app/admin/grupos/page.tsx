import { Contenedor } from "@/components/contenedor";
import { EtiquetaGrupo } from "@/components/etiquetas";
import { Rotulo } from "@/components/rotulo";
import { requerirSuperAdmin } from "@/lib/auth";
import type { Grupo } from "@/types/database";
import { guardarGrupo } from "../acciones";
import { NavegacionAdmin } from "../navegacion";

export default async function GruposPage() {
  const { supabase, mentor, acceso } = await requerirSuperAdmin();
  const { data: grupos } = await supabase.from("cp_grupos").select("*").order("orden").returns<Grupo[]>();
  return (
    <Contenedor mentor={mentor} acceso={acceso}>
      <section className="flex flex-col gap-3">
        <Rotulo kanji="組">Grupos</Rotulo>
        <h1 className="titular text-3xl">Los 7 Cinturones y los Grupos de clientes</h1>
        <p className="text-washi/55">
          El interruptor de correo decide si se envía el enlace personal al abrir una sesión. En modo prueba solo llega a los
          contactos de prueba.
        </p>
        <NavegacionAdmin actual="/admin/grupos" />
      </section>
      <ul className="flex flex-col gap-3">
        {(grupos ?? []).map((g) => (
          <li key={g.id} className="tarjeta p-4">
            <form action={guardarGrupo} className="flex flex-col gap-3">
              <input type="hidden" name="grupo" value={g.id} />
              <EtiquetaGrupo grupo={g} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs text-washi/60">
                  Nombre (lo ve el alumno, sin guiones)
                  <input name="nombre" defaultValue={g.nombre} maxLength={80} className="campo py-2 text-sm" />
                </label>
                <label className="flex flex-col gap-1 text-xs text-washi/60">
                  Tag de GHL {g.tipo === "cliente" ? "(valida el enlace personal)" : "(opcional)"}
                  <input name="tag_ghl" defaultValue={g.tag_ghl ?? ""} maxLength={80} className="campo py-2 text-sm" />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-washi/75">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="activo" defaultChecked={g.activo} className="size-4 accent-cian-400" /> Activo
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="enviar_correo" defaultChecked={g.enviar_correo} className="size-4 accent-cian-400" /> Enviar
                  correo al abrir sesión
                </label>
                <button type="submit" className="boton-secundario ml-auto py-1.5 text-xs">
                  Guardar
                </button>
              </div>
            </form>
          </li>
        ))}
      </ul>
    </Contenedor>
  );
}
