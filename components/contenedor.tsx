import type { Acceso, Mentor } from "@/types/database";
import { Encabezado } from "./encabezado";

// Marco de las páginas con sesión: barra superior + contenido.
export function Contenedor({
  mentor,
  acceso,
  ancho = "max-w-5xl",
  children,
}: {
  mentor: Mentor;
  acceso: Acceso | null;
  ancho?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`mx-auto flex w-full ${ancho} flex-1 flex-col gap-8 px-4 pb-16`}>
      <Encabezado mentor={mentor} acceso={acceso} />
      {children}
    </div>
  );
}
