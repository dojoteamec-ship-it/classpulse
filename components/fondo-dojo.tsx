import Image from "next/image";
import emblema from "@/public/marca/ronin-emblema.png";

// Fondo fijo de toda la app: el ronin de la marca frente a una luna,
// halo cian, pistas de circuito y niebla. Decorativo (aria-hidden) y tenue.

// Pistas de circuito (como las del logo) en un patrón repetible.
const CIRCUITO = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><g fill='none' stroke='#7fe0ff' stroke-width='1'><path d='M10 0v30h30v40M60 0v20h40v30h20M140 0v50h-20M0 90h30v30h40v40M80 160v-30h30v-40h50M130 160v-20h30M40 70v20M100 110h-30'/></g><g fill='#7fe0ff'><circle cx='40' cy='70' r='2.5'/><circle cx='120' cy='50' r='2.5'/><circle cx='70' cy='160' r='2.5'/><circle cx='70' cy='110' r='2.5'/><circle cx='160' cy='90' r='2.5'/><circle cx='40' cy='90' r='2.5'/></g></svg>`,
)}")`;

const GRANO = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#n)' opacity='.5'/></svg>`,
)}")`;

export function FondoDojo() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Cielo */}
      <div className="absolute inset-0 bg-[radial-gradient(110%_75%_at_75%_10%,#0e2238_0%,#070c15_50%,#04060a_100%)]" />

      {/* Pistas de circuito, solo en la parte baja */}
      <div
        className="absolute inset-x-0 bottom-0 h-[60%] opacity-[0.05] [mask-image:linear-gradient(to_top,black,transparent)]"
        style={{ backgroundImage: CIRCUITO, backgroundSize: "160px 160px" }}
      />

      {/* Halo cian detrás del ronin */}
      <div className="absolute top-[4%] right-[-14rem] size-[46rem] rounded-full bg-[radial-gradient(circle,rgba(61,208,251,0.22),rgba(61,208,251,0.05)_45%,transparent_70%)] blur-2xl sm:right-[-6rem] lg:right-[2%]" />

      {/* Ronin frente a la luna (emblema de la marca) */}
      <div className="absolute top-[10%] right-[-10rem] w-[36rem] animate-flotar opacity-[0.08] sm:right-[-4rem] lg:right-[5%] lg:w-[40rem]">
        <Image
          src={emblema}
          alt=""
          priority
          className="h-auto w-full [mask-image:linear-gradient(to_bottom,black_55%,transparent_100%)]"
        />
      </div>

      {/* Niebla */}
      <div className="absolute inset-x-[-10%] bottom-[-5%] h-[45%] animate-niebla bg-[radial-gradient(60%_60%_at_50%_100%,rgba(61,208,251,0.09),transparent_70%)] blur-2xl" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-noche-950 to-transparent" />

      {/* Grano */}
      <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay" style={{ backgroundImage: GRANO }} />
    </div>
  );
}
