import { Marca } from "@/components/marca";
import { Rotulo } from "@/components/rotulo";
import { formatearClase } from "@/lib/fecha";
import { TIPO_SESION } from "@/lib/sesiones";
import type { SesionPublica } from "@/types/database";

// Marco de las pantallas del alumno (móvil primero). Textos sin guiones.
export function MarcoAlumno({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 py-8 sm:py-12">
      <div className="animate-aparecer">
        <Marca />
      </div>
      {children}
    </main>
  );
}

export function Aviso({ kanji, rotulo, titulo, children }: { kanji: string; rotulo: string; titulo: string; children: React.ReactNode }) {
  return (
    <section className="tarjeta flex animate-aparecer flex-col gap-3 p-6 [animation-delay:100ms]">
      <Rotulo kanji={kanji}>{rotulo}</Rotulo>
      <h1 className="titular text-3xl">{titulo}</h1>
      <div className="leading-relaxed text-washi/55">{children}</div>
    </section>
  );
}

// Si hay varias sesiones abiertas, el alumno elige la suya.
export function ElegirSesion({ sesiones, href }: { sesiones: SesionPublica[]; href: (id: string) => string }) {
  return (
    <section className="flex animate-aparecer flex-col gap-4 [animation-delay:100ms]">
      <h1 className="titular text-3xl">¿De qué clase nos quieres contar?</h1>
      <ul className="flex flex-col gap-3">
        {sesiones.map((s) => (
          <li key={s.id}>
            <a href={href(s.id)} className="tarjeta-interactiva flex flex-col gap-1.5 p-5">
              <span className="rotulo">{s.grupo_nombre}</span>
              <span className="font-medium first-letter:uppercase">
                {TIPO_SESION[s.tipo_sesion]} · {formatearClase(s.fecha_clase, null)}
              </span>
              {s.mentores && <span className="text-sm text-washi/55">Con {s.mentores}</span>}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export const SIN_CLASE =
  "Tu mentor abre el feedback al terminar la clase y queda disponible 24 horas. Vuelve a entrar desde el enlace del chat o de tu correo.";
