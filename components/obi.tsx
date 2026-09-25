import { obiDe } from "@/lib/cinturones";

// El cinturón como un obi: banda de color con brillo de tela y su nudo.
export function Obi({
  slug,
  nombre,
  tamano = "md",
}: {
  slug: string;
  nombre: string;
  tamano?: "sm" | "md";
}) {
  const { color, texto } = obiDe(slug);
  const esNegro = slug === "negro";
  return (
    <span
      className={`relative inline-flex w-fit items-center gap-2 self-start overflow-hidden rounded-md font-semibold tracking-wide ${
        tamano === "sm" ? "px-2.5 py-1 text-[0.7rem]" : "px-3.5 py-1.5 text-xs"
      }`}
      style={{
        background: `linear-gradient(180deg, color-mix(in oklab, ${color} 88%, white) 0%, ${color} 45%, color-mix(in oklab, ${color} 80%, black) 100%)`,
        color: texto,
        boxShadow: esNegro
          ? "inset 0 0 0 1px rgba(61,208,251,.55), 0 6px 18px -8px rgba(0,0,0,.8)"
          : `0 6px 18px -8px color-mix(in oklab, ${color} 70%, transparent)`,
      }}
    >
      {/* Costuras de la tela */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-[3px] h-px opacity-40"
        style={{ background: esNegro ? "#3dd0fb" : texto }}
      />
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-[3px] h-px opacity-40"
        style={{ background: esNegro ? "#3dd0fb" : texto }}
      />
      <span className="relative">{nombre}</span>
      {/* Nudo */}
      <span
        aria-hidden
        className="relative -my-2 h-[calc(100%+1rem)] w-2.5 -skew-x-12"
        style={{ background: "rgba(0,0,0,.22)", boxShadow: "inset 1px 0 0 rgba(255,255,255,.2)" }}
      />
    </span>
  );
}
