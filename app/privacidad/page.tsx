import Link from "next/link";
import { MarcoAlumno } from "@/components/marco-alumno";
import { Rotulo } from "@/components/rotulo";

export const metadata = { title: "Aviso de privacidad · ClassPulse" };

// Aviso de privacidad (LOPDP Ecuador). Texto para el alumno: sin guiones.
export default function PrivacidadPage() {
  return (
    <MarcoAlumno>
      <article className="tarjeta flex animate-aparecer flex-col gap-4 p-6 leading-relaxed text-washi/70 sm:p-8">
        <Rotulo kanji="護">Aviso de privacidad</Rotulo>
        <h1 className="titular text-3xl text-washi">Tus datos en ClassPulse</h1>
        <p>
          ClassPulse es la herramienta de RoninX Academy para escuchar tu opinión sobre las clases en vivo y sobre cada
          Cinturón. La usamos para mejorar las clases y acompañarte mejor.
        </p>
        <h2 className="font-semibold text-washi">Tú decides si te identificas</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>
            <strong>Anónimo:</strong> guardamos solo tus respuestas. No guardamos tu nombre, tu correo ni tu identificador.
          </li>
          <li>
            <strong>Con tu nombre:</strong> solo Mike (Student Success Coach) y Santi ven quién eres. Tu mentor nunca ve tu
            nombre.
          </li>
          <li>
            <strong>Con tu nombre y pedido de contacto:</strong> además, Mike te escribe por el canal que elijas.
          </li>
        </ul>
        <h2 className="font-semibold text-washi">Qué hacemos con tus datos</h2>
        <p>
          Tus comentarios se leen sin tu nombre para mejorar las clases. Tu identidad se guarda como máximo 24 meses y
          después se borra sola. Cada vez que alguien del equipo ve una identidad, queda registrado. Ninguna decisión sobre
          ti se toma de forma automática: siempre la revisa una persona.
        </p>
        <h2 className="font-semibold text-washi">Tus derechos</h2>
        <p>
          Puedes pedir ver, corregir o borrar tus datos. Escríbenos por el buzón o a tu coach y lo resolvemos en un plazo
          máximo de 15 días.
        </p>
        <Link href="/" className="text-sm font-medium text-cian-300/85 hover:text-cian-200">
          Volver
        </Link>
      </article>
    </MarcoAlumno>
  );
}
