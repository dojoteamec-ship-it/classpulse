import { EncuestaClase } from "@/components/encuesta-clase";
import { Aviso, ElegirSesion, MarcoAlumno, SIN_CLASE } from "@/components/marco-alumno";
import { sesionesParaContacto } from "@/lib/enlace-personal";
import { obtenerContacto } from "@/lib/ghl";

// Enlace personal desde GHL: /f?c={{contact.id}} (y &s=<sesión> en el correo).
// El servidor valida el contacto en GHL antes de mostrar nada.
export default async function EnlacePersonalPage({ searchParams }: PageProps<"/f">) {
  const { c, s } = await searchParams;
  const id = typeof c === "string" ? c : "";
  const contacto = id ? await obtenerContacto(id).catch(() => null) : null;

  if (!contacto) {
    return (
      <MarcoAlumno>
        <Aviso kanji="鍵" rotulo="Enlace personal" titulo="No pudimos reconocer tu enlace">
          Revisa que hayas abierto el enlace completo de tu correo. También puedes responder desde el enlace que tu mentor
          comparte en el chat de la clase.
        </Aviso>
      </MarcoAlumno>
    );
  }

  const sesiones = await sesionesParaContacto(contacto);
  const elegida = sesiones.length === 1 ? sesiones[0] : sesiones.find((x) => x.id === s);

  return (
    <MarcoAlumno>
      {sesiones.length === 0 ? (
        <Aviso kanji="閉" rotulo="Sin clase abierta" titulo="Ahora no hay una clase abierta para feedback">
          {SIN_CLASE}
        </Aviso>
      ) : elegida ? (
        <EncuestaClase sesion={elegida} contacto={{ id: contacto.id, nombre: contacto.nombre }} />
      ) : (
        <ElegirSesion sesiones={sesiones} href={(sid) => `?c=${contacto.id}&s=${sid}`} />
      )}
    </MarcoAlumno>
  );
}
