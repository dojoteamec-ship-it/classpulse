"use client";

import { useState } from "react";

// Copia la URL completa del enlace general para pegarla en el chat de la clase.
export function CopiarEnlace({ ruta }: { ruta: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${ruta}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {}
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <a href={ruta} target="_blank" className="text-washi/50 underline-offset-4 hover:text-cian-300 hover:underline">
        {ruta}
      </a>
      <button type="button" onClick={copiar} className="boton-secundario py-1 text-xs">
        {copiado ? "✓ Copiado" : "Copiar enlace"}
      </button>
    </div>
  );
}
