import Link from "next/link";

const SECCIONES: [string, string][] = [
  ["/admin", "Resumen y LOPDP"],
  ["/admin/usuarios", "Usuarios y roles"],
  ["/admin/grupos", "Grupos"],
  ["/admin/configuracion", "Configuración"],
  ["/admin/datos", "Datos y auditoría"],
];

export function NavegacionAdmin({ actual }: { actual: string }) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Secciones de administración">
      {SECCIONES.map(([href, texto]) => (
        <Link
          key={href}
          href={href}
          aria-current={actual === href ? "page" : undefined}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-medium ${actual === href ? "border-cian-400/50 bg-cian-400/15 text-cian-300" : "border-white/10 text-washi/55 hover:text-washi"}`}
        >
          {texto}
        </Link>
      ))}
    </nav>
  );
}
