"use client";

import { useState } from "react";

export function CopiarTexto({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      className="boton-secundario self-start"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1800);
        } catch {}
      }}
    >
      {copiado ? "✓ Copiado" : "Copiar texto"}
    </button>
  );
}
