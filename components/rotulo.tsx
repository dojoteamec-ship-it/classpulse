// Etiqueta de sección: kanji cian discreto + texto. Ej.: 題目 · Temas
export function Rotulo({ kanji, children }: { kanji?: string; children: React.ReactNode }) {
  return (
    <span className="rotulo">
      {kanji && <span className="text-[0.8rem] tracking-normal text-cian-400/90">{kanji}</span>}
      {children}
    </span>
  );
}

// Indicador de estado de la votación con punto "en vivo".
export function EstadoVotacion({ abierta }: { abierta: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
        abierta
          ? "border-matcha/25 bg-matcha/10 text-matcha"
          : "border-white/10 bg-white/5 text-washi/55"
      }`}
    >
      <span className={`size-1.5 rounded-full ${abierta ? "animate-pulso bg-matcha" : "bg-washi/40"}`} />
      {abierta ? "Votación abierta" : "Votación cerrada"}
    </span>
  );
}
