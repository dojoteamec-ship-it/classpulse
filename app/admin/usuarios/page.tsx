import { Contenedor } from "@/components/contenedor";
import { MarcaPrueba } from "@/components/etiquetas";
import { Rotulo } from "@/components/rotulo";
import { ETIQUETA_ROL, requerirSuperAdmin } from "@/lib/auth";
import type { Acceso, Grupo, PersonaDirectorio } from "@/types/database";
import { cambiarGrupoMentor, guardarAcceso } from "../acciones";
import { NavegacionAdmin } from "../navegacion";
import { CrearCuenta } from "./crear-cuenta";

export default async function UsuariosPage() {
  const { supabase, mentor, acceso } = await requerirSuperAdmin();
  const [{ data: dir }, { data: accesos }, { data: grupos }, { data: asign }, { data: cuentas }] = await Promise.all([
    supabase.rpc("cp_directorio"),
    supabase.from("cp_acceso").select("*").returns<Acceso[]>(),
    supabase.from("cp_grupos").select("*").eq("activo", true).order("orden").returns<Grupo[]>(),
    supabase.from("cp_mentor_grupos").select("mentor_id, grupo_id").returns<{ mentor_id: string; grupo_id: string }[]>(),
    supabase.rpc("cp_cuentas_classvote"),
  ]);
  const personas = (dir ?? []) as PersonaDirectorio[];
  const sinAcceso = ((cuentas ?? []) as { mentor_id: string; nombre: string; email: string; estado_classvote: string }[]).filter(
    (c) => !(accesos ?? []).some((a) => a.mentor_id === c.mentor_id),
  );

  return (
    <Contenedor mentor={mentor} acceso={acceso} ancho="max-w-6xl">
      <section className="flex flex-col gap-3">
        <Rotulo kanji="人">Usuarios y roles</Rotulo>
        <h1 className="titular text-3xl">Quién entra y qué puede hacer</h1>
        <NavegacionAdmin actual="/admin/usuarios" />
      </section>

      <section className="flex flex-col gap-3">
        {personas.map((p) => {
          const a = (accesos ?? []).find((x) => x.mentor_id === p.mentor_id);
          const yo = p.mentor_id === mentor.id;
          return (
            <article key={p.mentor_id} className={`tarjeta flex flex-col gap-3 p-4 ${p.activo ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{p.nombre}</span>
                <span className="text-xs text-washi/45">{p.email}</span>
                {a?.es_prueba && <MarcaPrueba />}
                {yo && <span className="text-xs text-washi/45">(tú: no puedes cambiar tu propio acceso)</span>}
              </div>
              {!yo && (
                <form action={guardarAcceso} className="flex flex-wrap items-center gap-2 text-sm">
                  <input type="hidden" name="mentor" value={p.mentor_id} />
                  <select name="rol" defaultValue={p.rol} className="campo py-1.5 text-sm" aria-label={`Rol de ${p.nombre}`}>
                    {(["mentor", "coach", "super_admin"] as const).map((r) => (
                      <option key={r} value={r}>
                        {ETIQUETA_ROL[r]}
                      </option>
                    ))}
                  </select>
                  <select name="activo" defaultValue={p.activo ? "on" : "off"} className="campo py-1.5 text-sm" aria-label={`Estado de ${p.nombre}`}>
                    <option value="on">Activo</option>
                    <option value="off">Desactivado</option>
                  </select>
                  <button type="submit" className="boton-secundario py-1.5 text-xs">
                    Guardar
                  </button>
                </form>
              )}
              <div className="flex flex-wrap gap-1.5">
                {(grupos ?? []).map((g) => {
                  const tiene = (asign ?? []).some((x) => x.mentor_id === p.mentor_id && x.grupo_id === g.id);
                  return (
                    <form key={g.id} action={cambiarGrupoMentor}>
                      <input type="hidden" name="mentor" value={p.mentor_id} />
                      <input type="hidden" name="grupo" value={g.id} />
                      <input type="hidden" name="asignar" value={tiene ? "0" : "1"} />
                      <button
                        type="submit"
                        aria-pressed={tiene}
                        className={`rounded-full border px-2.5 py-1 text-xs ${tiene ? "border-cian-400/50 bg-cian-400/15 text-cian-200" : "border-white/10 text-washi/45 hover:text-washi"}`}
                      >
                        {g.nombre.split(" · ")[0]}
                      </button>
                    </form>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>

      <section className="tarjeta flex flex-col gap-3 p-5">
        <Rotulo kanji="門">Dar acceso a una cuenta de ClassVote</Rotulo>
        {sinAcceso.length === 0 ? (
          <p className="text-sm text-washi/55">Todas las cuentas de ClassVote ya tienen acceso.</p>
        ) : (
          <form action={guardarAcceso} className="flex flex-wrap items-center gap-2 text-sm">
            <select name="mentor" className="campo py-1.5 text-sm" aria-label="Cuenta de ClassVote">
              {sinAcceso.map((c) => (
                <option key={c.mentor_id} value={c.mentor_id}>
                  {c.nombre} · {c.email}
                </option>
              ))}
            </select>
            <select name="rol" defaultValue="mentor" className="campo py-1.5 text-sm" aria-label="Rol para la cuenta de ClassVote">
              <option value="mentor">Mentor</option>
              <option value="coach">Coach</option>
              <option value="super_admin">Super admin</option>
            </select>
            <button type="submit" className="boton-secundario py-1.5 text-xs">
              Dar acceso
            </button>
          </form>
        )}
      </section>

      <section className="tarjeta flex flex-col gap-3 p-5">
        <Rotulo kanji="新">Crear una cuenta nueva</Rotulo>
        <p className="text-sm text-washi/55">
          Por ejemplo, la cuenta de Mike con su correo personal. Por el trigger de ClassVote, la cuenta aparece allí como mentor
          pendiente: déjala pendiente o recházala.
        </p>
        <CrearCuenta />
      </section>
    </Contenedor>
  );
}
