import { Obi } from "@/components/obi";
import type { Grupo } from "@/types/database";

// Nombre del Grupo: obi para los Cinturones, rótulo para los Grupos de clientes.
export function EtiquetaGrupo({ grupo, tamano = "sm" }: { grupo: Pick<Grupo, "slug" | "nombre" | "tipo">; tamano?: "sm" | "md" }) {
  return grupo.tipo === "cinturon" ? (
    <Obi slug={grupo.slug} nombre={grupo.nombre} tamano={tamano} />
  ) : (
    <span className="rotulo">{grupo.nombre}</span>
  );
}

// Estado de la sesión con punto "en vivo" (mismo estilo que ClassVote).
export function EstadoSesion({ abierta }: { abierta: boolean }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
        abierta ? "border-matcha/25 bg-matcha/10 text-matcha" : "border-white/10 bg-white/5 text-washi/55"
      }`}
    >
      <span className={`size-1.5 rounded-full ${abierta ? "animate-pulso bg-matcha" : "bg-washi/40"}`} />
      {abierta ? "Abierta" : "Cerrada"}
    </span>
  );
}

// Marca visible de los datos de prueba.
export function MarcaPrueba() {
  return (
    <span className="w-fit rounded-full border border-ai-400/40 bg-ai-400/10 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wider text-washi/70 uppercase">
      Prueba
    </span>
  );
}
