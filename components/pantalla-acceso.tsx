import { Marca } from "@/components/marca";
import { Rotulo } from "@/components/rotulo";

// Marco de la pantalla de acceso: tarjeta centrada con la marca.
export function PantallaAcceso({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="animate-aparecer">
        <Marca />
      </div>
      <section className="tarjeta w-full max-w-sm animate-aparecer p-6 [animation-delay:100ms] sm:p-8">
        <div className="mb-6 flex flex-col gap-3">
          <Rotulo kanji="脈">Equipo RoninX</Rotulo>
          <h1 className="font-display text-2xl font-bold">{titulo}</h1>
          {descripcion && <p className="text-sm leading-relaxed text-washi/55">{descripcion}</p>}
        </div>
        {children}
      </section>
    </main>
  );
}
