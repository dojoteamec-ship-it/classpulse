import { Contenedor } from "@/components/contenedor";
import { Rotulo } from "@/components/rotulo";
import { requerirCoach } from "@/lib/auth";
import { fechaHoraCorta } from "@/lib/fecha";

type Mensaje = { id: string; creado_en: string; modo_identidad: string; detalle: { texto?: string } };

// Mensajes del buzón (sin nombre). Los que piden contacto o traen palabras clave llegan
// también a la bandeja como alertas, con la identidad disponible allí.
export default async function BuzonCoachPage() {
  const { supabase, mentor, acceso } = await requerirCoach();
  const { data } = await supabase
    .from("cp_respuestas")
    .select("id, creado_en, modo_identidad, detalle")
    .eq("encuesta", "buzon")
    .eq("es_prueba", acceso.es_prueba)
    .order("creado_en", { ascending: false })
    .limit(200)
    .returns<Mensaje[]>();
  return (
    <Contenedor mentor={mentor} acceso={acceso} ancho="max-w-3xl">
      <section className="flex flex-col gap-3">
        <Rotulo kanji="箱">Buzón abierto</Rotulo>
        <h1 className="titular text-3xl">Lo que no encaja en una clase</h1>
        <p className="text-washi/55">Enlace para compartir: /buzon. Los mensajes con pedido de contacto o palabras clave aparecen también en la bandeja.</p>
      </section>
      {(data ?? []).length === 0 ? (
        <p className="tarjeta p-6 text-washi/55">Todavía no hay mensajes.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {(data ?? []).map((m) => (
            <li key={m.id} className="tarjeta flex flex-col gap-1 p-4 text-sm">
              <span className="text-xs text-washi/45">
                {fechaHoraCorta(m.creado_en)} · {m.modo_identidad === "anonimo" ? "Anónimo" : m.modo_identidad === "contacto" ? "Pidió contacto" : "Con nombre"}
              </span>
              <p className="whitespace-pre-wrap text-washi/85">{m.detalle?.texto}</p>
            </li>
          ))}
        </ul>
      )}
    </Contenedor>
  );
}
