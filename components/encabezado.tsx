import Link from "next/link";
import { Marca } from "@/components/marca";
import { salir } from "@/app/sesion/acciones";
import { ETIQUETA_ROL } from "@/lib/auth";
import type { Acceso, Mentor } from "@/types/database";

// Navegación por rol. Los permisos reales están en RLS y en cada página.
function enlacesDe(rol: Acceso["rol"]): [string, string][] {
  const enlaces: [string, string][] = [
    ["/panel", "Panel"],
    ["/panel/tablero", "Mi tablero"],
  ];
  if (rol === "coach" || rol === "super_admin") enlaces.push(["/coach", "Bandeja"], ["/coach/tablero", "Tablero global"]);
  if (rol === "super_admin") enlaces.push(["/coach/programa", "Programa"]);
  return enlaces;
}

const ENLACE = "rounded-lg px-3 py-1.5 text-sm text-washi/60 transition-colors hover:bg-white/5 hover:text-washi";

export function Encabezado({ mentor, acceso }: { mentor: Mentor; acceso: Acceso | null }) {
  const iniciales = mentor.nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const rol = acceso?.rol;

  return (
    <header className="tarjeta sticky top-3 z-20 flex animate-aparecer flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
      <Marca href="/panel" compacta />
      <nav className="flex flex-wrap items-center gap-1">
        {acceso &&
          enlacesDe(acceso.rol).map(([href, texto]) => (
            <Link key={href} href={href} className={ENLACE}>
              {texto}
            </Link>
          ))}
        <span
          title={rol ? ETIQUETA_ROL[rol] : "Sin acceso"}
          className="ml-1 flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm text-washi/70"
        >
          <span className="grid size-7 place-items-center rounded-full bg-gradient-to-b from-ai-400/40 to-ai-400/10 text-[0.7rem] font-semibold text-washi ring-1 ring-white/15">
            {iniciales}
          </span>
          <span className="hidden sm:inline">{mentor.nombre}</span>
        </span>
        <form action={salir}>
          <button type="submit" className={ENLACE}>
            Salir
          </button>
        </form>
      </nav>
    </header>
  );
}
