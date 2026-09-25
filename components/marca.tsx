import Image from "next/image";
import Link from "next/link";
import emblema from "@/public/marca/ronin-emblema.png";
import logo from "@/public/marca/ronin-logo.png";

// Emblema del ronin (la "O" del logo) con halo cian.
export function Emblema({ className = "size-9" }: { className?: string }) {
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center rounded-full bg-noche-950 shadow-[0_0_0_1px_rgba(61,208,251,0.35),0_0_24px_-4px_rgba(61,208,251,0.6)] ${className}`}
    >
      <Image src={emblema} alt="" className="size-full rounded-full" priority />
    </span>
  );
}

// Logotipo RONIN + nombre de la app.
export function Marca({ href = "/", compacta = false }: { href?: string; compacta?: boolean }) {
  return (
    <Link href={href} aria-label="ClassPulse · RoninX Academy" className="group inline-flex items-center gap-3">
      <Image
        src={logo}
        alt="RONIN"
        priority
        className={`w-auto opacity-95 transition-opacity group-hover:opacity-100 ${compacta ? "h-4" : "h-5"}`}
      />
      <span aria-hidden className="h-4 w-px bg-white/20" />
      <span className={`font-medium tracking-tight text-washi/70 ${compacta ? "text-sm" : "text-[0.95rem]"}`}>
        ClassPulse
      </span>
    </Link>
  );
}
