import { Contenedor } from "@/components/contenedor";
import { Rotulo } from "@/components/rotulo";
import { requerirSuperAdmin } from "@/lib/auth";
import { fechaHoraCorta, hoyEnEcuador, sumarDias } from "@/lib/fecha";
import type { PersonaDirectorio } from "@/types/database";
import { NavegacionAdmin } from "../navegacion";
import { FormularioBorrado } from "./formulario-borrado";

type Auditoria = { id: number; usuario: string | null; accion: string; objeto: string | null; detalle: unknown; creado_en: string };
type Solicitud = { id: string; recibida_en: string; vence_en: string; completada_en: string | null; registros: number; notas: string | null };

const ACCION: Record<string, string> = {
  ver_identidad: "Vio una identidad",
  ver_historial: "Vio el historial de un alumno",
  actualizar_alerta: "Actualizó una alerta",
  exportar_csv: "Exportó un CSV",
  borrado_a_pedido: "Borró datos a pedido",
  retencion_anonimizar: "Retención automática",
  cambiar_acceso: "Cambió un acceso",
  crear_cuenta: "Creó una cuenta",
  cambiar_grupo: "Cambió un Grupo",
  cambiar_config: "Cambió la configuración",
};

export default async function DatosPage() {
  const { supabase, mentor, acceso } = await requerirSuperAdmin();
  const hoy = hoyEnEcuador();
  const [{ data: aud }, { data: sol }, { data: dir }] = await Promise.all([
    supabase.from("cp_auditoria").select("*").order("creado_en", { ascending: false }).limit(200).returns<Auditoria[]>(),
    supabase.from("cp_solicitudes_borrado").select("*").eq("es_prueba", acceso.es_prueba).order("recibida_en", { ascending: false }).returns<Solicitud[]>(),
    supabase.rpc("cp_directorio"),
  ]);
  const nombre = (id: string | null) => (id ? ((dir ?? []) as PersonaDirectorio[]).find((p) => p.mentor_id === id)?.nombre ?? "Cuenta" : "Sistema");
  const desde = sumarDias(hoy, -90);

  return (
    <Contenedor mentor={mentor} acceso={acceso} ancho="max-w-5xl">
      <section className="flex flex-col gap-3">
        <Rotulo kanji="録">Datos y auditoría</Rotulo>
        <h1 className="titular text-3xl">Exportar, borrar a pedido y revisar quién vio qué</h1>
        <NavegacionAdmin actual="/admin/datos" />
      </section>

      <section className="tarjeta flex flex-col gap-3 p-5">
        <Rotulo kanji="出">Exportación CSV (sin identidades)</Rotulo>
        <form method="get" action="/admin/exportar" className="flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1 text-xs text-washi/60">
            Qué
            <select name="tipo" className="campo py-2 text-sm">
              <option value="respuestas">Respuestas</option>
              <option value="alertas">Alertas</option>
              <option value="acciones">Acciones Kaizen</option>
              <option value="sesiones">Sesiones</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-washi/60">
            Desde
            <input type="date" name="desde" defaultValue={desde} className="campo py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-washi/60">
            Hasta
            <input type="date" name="hasta" defaultValue={hoy} className="campo py-2 text-sm" />
          </label>
          <button type="submit" className="boton-secundario py-2">
            Descargar CSV
          </button>
        </form>
        <p className="text-xs text-washi/45">Cada descarga queda en la auditoría.</p>
      </section>

      <section className="tarjeta flex flex-col gap-3 p-5">
        <Rotulo kanji="消">Borrado a pedido del alumno (LOPDP, plazo de 15 días)</Rotulo>
        <p className="text-sm text-washi/55">
          Borra la identidad y los pedidos de contacto del alumno. Sus respuestas quedan anónimas. La constancia no guarda el
          identificador.
        </p>
        <FormularioBorrado hoy={hoy} />
        {(sol ?? []).length > 0 && (
          <table className="mt-2 w-full text-left text-xs tabular-nums text-washi/65">
            <thead className="text-washi/40">
              <tr>
                <th className="py-1 font-medium">Recibido</th>
                <th className="font-medium">Vence</th>
                <th className="font-medium">Completado</th>
                <th className="font-medium">Registros</th>
                <th className="font-medium">En plazo</th>
              </tr>
            </thead>
            <tbody>
              {(sol ?? []).map((s) => (
                <tr key={s.id} className="border-t border-white/[0.06]">
                  <td className="py-1.5">{s.recibida_en}</td>
                  <td>{s.vence_en}</td>
                  <td>{s.completada_en ? fechaHoraCorta(s.completada_en) : "Pendiente"}</td>
                  <td>{s.registros}</td>
                  <td>{s.completada_en && s.completada_en.slice(0, 10) <= s.vence_en ? "✓ Sí" : "! No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="tarjeta flex flex-col gap-3 p-5">
        <Rotulo kanji="監">Registro de auditoría (últimos 200)</Rotulo>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-xs text-washi/65">
            <thead className="text-washi/40">
              <tr>
                <th className="py-1 font-medium">Cuándo</th>
                <th className="font-medium">Quién</th>
                <th className="font-medium">Qué</th>
                <th className="font-medium">Sobre</th>
              </tr>
            </thead>
            <tbody>
              {(aud ?? []).map((a) => (
                <tr key={a.id} className="border-t border-white/[0.06]">
                  <td className="py-1.5 whitespace-nowrap">{fechaHoraCorta(a.creado_en)}</td>
                  <td>{nombre(a.usuario)}</td>
                  <td>{ACCION[a.accion] ?? a.accion}</td>
                  <td className="font-mono">{a.objeto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Contenedor>
  );
}
