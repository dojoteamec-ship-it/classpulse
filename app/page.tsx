import Link from "next/link";
import { Emblema } from "@/components/marca";

// Los alumnos entran desde su enlace personal (correo) o el de su Grupo.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-20 text-center">
      <div className="animate-aparecer">
        <Emblema className="size-24" />
      </div>
      <div className="flex animate-aparecer flex-col items-center gap-5 [animation-delay:120ms]">
        <p className="rotulo">RoninX Academy · ClassPulse</p>
        <h1 className="titular max-w-3xl text-5xl text-balance sm:text-7xl">
          Cada clase, <span className="texto-acento">mejor que la anterior.</span>
        </h1>
        <p className="max-w-lg text-lg leading-relaxed text-balance text-washi/55">
          Cuéntanos cómo te fue en tu clase en vivo. Entra desde el enlace que te llegó por correo o desde el chat de tu clase.
        </p>
      </div>
      <Link
        href="/panel"
        className="animate-aparecer text-sm font-medium text-cian-300/80 transition-colors [animation-delay:240ms] hover:text-cian-200"
      >
        Acceso del equipo →
      </Link>
    </main>
  );
}
