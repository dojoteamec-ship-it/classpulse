import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { leerConfig } from "@/lib/config";
import { esContactoDePrueba, type ContactoGhl } from "@/lib/ghl";
import type { SesionPublica } from "@/types/database";

type Fila = {
  id: string;
  tipo_sesion: SesionPublica["tipo_sesion"];
  fecha_clase: string;
  cierra_en: string;
  es_prueba: boolean;
  cp_grupos: { nombre: string; slug: string; tipo: "cinturon" | "cliente"; nivel: number | null; tag_ghl: string | null; activo: boolean };
  cp_sesion_mentores: { principal: boolean; mentores: { nombre: string } | null }[];
};

// Sesiones abiertas que puede responder un contacto de GHL (enlace personal).
// * Contactos de prueba (GHL_CONTACTOS_PRUEBA): solo sesiones de prueba.
// * Grupos de clientes: el contacto debe tener el tag del Grupo.
// * Cinturones: si cp_config.ghl_campo_nivel existe, su valor debe coincidir con
//   el nivel del Grupo; si es null (hoy), se acepta cualquier Cinturón.
export async function sesionesParaContacto(contacto: ContactoGhl): Promise<SesionPublica[]> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  const prueba = esContactoDePrueba(contacto.id);
  const campoNivel = await leerConfig<string>(admin, "ghl_campo_nivel");
  const nivelContacto = campoNivel ? Number(String(contacto.campos[campoNivel] ?? "").match(/\d+/)?.[0]) : null;

  const { data } = await admin
    .from("cp_sesiones")
    .select("id, tipo_sesion, fecha_clase, cierra_en, es_prueba, cp_grupos(nombre, slug, tipo, nivel, tag_ghl, activo), cp_sesion_mentores(principal, mentores(nombre))")
    .eq("estado", "abierta")
    .eq("es_prueba", prueba)
    .gt("cierra_en", new Date().toISOString())
    .order("abierta_en", { ascending: false })
    .returns<Fila[]>();

  return (data ?? [])
    .filter((s) => s.cp_grupos.activo)
    .filter((s) => {
      if (prueba) return true;
      const g = s.cp_grupos;
      if (g.tipo === "cliente") return !!g.tag_ghl && contacto.tags.includes(g.tag_ghl.toLowerCase());
      return campoNivel ? nivelContacto === g.nivel : true;
    })
    .map((s) => ({
      id: s.id,
      grupo_nombre: s.cp_grupos.nombre,
      grupo_slug: s.cp_grupos.slug,
      tipo_sesion: s.tipo_sesion,
      fecha_clase: s.fecha_clase,
      cierra_en: s.cierra_en,
      es_prueba: s.es_prueba,
      mentores:
        [...s.cp_sesion_mentores]
          .sort((a, b) => Number(b.principal) - Number(a.principal))
          .map((m) => m.mentores?.nombre.split(" ")[0])
          .filter(Boolean)
          .join(" y ") || null,
    }));
}
