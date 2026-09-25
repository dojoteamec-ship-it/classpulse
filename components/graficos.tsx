// Gráficos de los tableros (SVG propio con los tokens de ClassVote, plan 7.1).
// Reglas de lectura (plan 4.1): cada cifra lleva su n; con n < 15 se atenúa con
// «muestra pequeña»; junto al promedio va la distribución. Cada marca tiene su
// tooltip (<title>) y cada gráfico, su tabla.
import { esMuestraPequena, type ResumenClase } from "@/lib/metricas";

// Bandas (paleta validada para modo oscuro; siempre con etiqueta directa y separación).
export const COLOR_BANDA = { roja: "#b8342b", amarilla: "#b38c26", verde: "#1f9e70" } as const;
const ETIQUETA_BANDA = { roja: "Inaceptable", amarilla: "Aceptable", verde: "Superior" } as const;

export const pct = (x: number | null, dec = 0) => (x === null ? "—" : `${(x * 100).toFixed(dec)} %`);
export const num = (x: number | null, dec = 2) => (x === null ? "—" : x.toFixed(dec).replace(".", ","));

type Meta = { valor: number; tipo: "min" | "max"; texto: string } | null;

// Cifra principal con su n, meta y aviso de muestra pequeña.
export function Cifra({
  etiqueta,
  valor,
  n,
  meta = null,
  crudo,
  minima,
}: {
  etiqueta: string;
  valor: string;
  n: number;
  meta?: Meta;
  /** Valor numérico para comparar con la meta. */
  crudo?: number | null;
  minima?: number;
}) {
  const pequena = esMuestraPequena(n, minima);
  const cumple = meta && crudo !== null && crudo !== undefined ? (meta.tipo === "min" ? crudo >= meta.valor : crudo <= meta.valor) : null;
  return (
    <div className={`flex flex-col gap-1 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 ${pequena ? "opacity-55" : ""}`}>
      <span className="text-xs font-medium tracking-wide text-washi/50">{etiqueta}</span>
      <span className="titular text-3xl tabular-nums">{valor}</span>
      <span className="flex flex-wrap items-center gap-x-2 text-xs text-washi/45">
        <span>n = {n}</span>
        {pequena && <span className="text-washi/60">· muestra pequeña</span>}
      </span>
      {meta && cumple !== null && (
        <span className={`text-xs font-medium ${cumple ? "text-matcha" : "text-shu-400"}`}>
          {cumple ? "✓ Cumple" : "! No cumple"} la meta ({meta.texto})
        </span>
      )}
    </div>
  );
}

// Distribución de las 5 caritas: barras horizontales con conteo y porcentaje.
export function Distribucion({ distribucion, n }: { distribucion: ResumenClase["distribucion"]; n: number }) {
  const max = Math.max(1, ...distribucion);
  const etiquetas = ["1 😞", "2 🙁", "3 😐", "4 🙂", "5 😄"];
  return (
    <figure className="flex flex-col gap-1.5">
      <figcaption className="text-xs font-medium text-washi/50">Distribución de la nota (n = {n})</figcaption>
      {[4, 3, 2, 1, 0].map((i) => (
        <div key={i} className="grid grid-cols-[3.2rem_1fr_4.5rem] items-center gap-2 text-xs" title={`${etiquetas[i]}: ${distribucion[i]} (${pct(n ? distribucion[i] / n : null)})`}>
          <span className="text-washi/60">{etiquetas[i]}</span>
          <span className="h-3 rounded-r bg-white/[0.05]">
            <span
              className="block h-full rounded-r bg-cian-400/80"
              style={{ width: `${(distribucion[i] / max) * 100}%`, minWidth: distribucion[i] ? 3 : 0 }}
            />
          </span>
          <span className="text-right text-washi/60 tabular-nums">
            {distribucion[i]} · {pct(n ? distribucion[i] / n : null)}
          </span>
        </div>
      ))}
    </figure>
  );
}

// Bandas de la pregunta distintiva: barra apilada con separación y etiquetas directas.
export function Bandas({ bandas }: { bandas: ResumenClase["bandas"] }) {
  const orden = ["roja", "amarilla", "verde"] as const;
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-xs font-medium text-washi/50">
        Pregunta distintiva (n = {bandas.n}
        {bandas.neutras ? `, ${bandas.neutras} neutras excluidas` : ""})
      </figcaption>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded bg-white/[0.05]">
        {bandas.n > 0 &&
          orden.map((b) =>
            bandas[b] ? (
              <span key={b} title={`${ETIQUETA_BANDA[b]}: ${bandas[b]} (${pct(bandas[b] / bandas.n)})`} style={{ width: `${(bandas[b] / bandas.n) * 100}%`, background: COLOR_BANDA[b] }} />
            ) : null,
          )}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-washi/65">
        {orden.map((b) => (
          <li key={b} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: COLOR_BANDA[b] }} aria-hidden />
            {ETIQUETA_BANDA[b]} {pct(bandas.n ? bandas[b] / bandas.n : null)}
          </li>
        ))}
      </ul>
    </figure>
  );
}

type Punto = { semana: string; csat: number | null; n: number };
const semanaCorta = (s: string) =>
  new Intl.DateTimeFormat("es-EC", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${s}T12:00:00Z`));

// Tendencia semanal del CSAT (escala 1 a 5, un solo eje) con la referencia de la academia.
export function Tendencia({ serie, referencia, nombre = "Tú" }: { serie: Punto[]; referencia: Punto[]; nombre?: string }) {
  const W = 640, H = 200, I = 34, D = 12, A = 12, B = 26;
  const x = (i: number) => I + (i * (W - I - D)) / Math.max(1, serie.length - 1);
  const y = (v: number) => A + ((5 - v) * (H - A - B)) / 4;
  const linea = (ps: Punto[]) =>
    ps
      .map((p, i) => (p.csat === null ? null : `${x(i)},${y(p.csat)}`))
      .reduce<string[][]>((tramos, p) => {
        if (p === null) tramos.push([]);
        else tramos[tramos.length - 1].push(p);
        return tramos;
      }, [[]])
      .filter((t) => t.length > 1)
      .map((t) => `M${t.join(" L")}`)
      .join(" ");
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-washi/60">
        <span className="font-medium text-washi/50">CSAT por semana, últimos 90 días</span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-cian-400" aria-hidden /> {nombre}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2 border-dashed border-washi/45" aria-hidden /> Academia (mismo tipo)
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Tendencia del CSAT">
        {[1, 2, 3, 4, 5].map((v) => (
          <g key={v}>
            <line x1={I} x2={W - D} y1={y(v)} y2={y(v)} stroke="rgba(238,242,247,.07)" />
            <text x={I - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="rgba(238,242,247,.45)">
              {v}
            </text>
          </g>
        ))}
        {serie.map((p, i) =>
          i % 2 === 0 ? (
            <text key={p.semana} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="rgba(238,242,247,.4)">
              {semanaCorta(p.semana)}
            </text>
          ) : null,
        )}
        <path d={linea(referencia)} fill="none" stroke="rgba(238,242,247,.45)" strokeWidth="2" strokeDasharray="5 4" />
        <path d={linea(serie)} fill="none" stroke="#3dd0fb" strokeWidth="2" strokeLinejoin="round" />
        {serie.map((p, i) =>
          p.csat === null ? null : (
            <g key={p.semana}>
              <circle cx={x(i)} cy={y(p.csat)} r="4" fill="#3dd0fb" stroke="#080c13" strokeWidth="2" opacity={esMuestraPequena(p.n) ? 0.5 : 1} />
              <circle cx={x(i)} cy={y(p.csat)} r="12" fill="transparent">
                <title>{`Semana del ${semanaCorta(p.semana)}: ${num(p.csat)} (n = ${p.n})${referencia[i]?.csat !== null && referencia[i]?.csat !== undefined ? ` · Academia ${num(referencia[i].csat)} (n = ${referencia[i].n})` : ""}`}</title>
              </circle>
            </g>
          ),
        )}
      </svg>
      <details className="text-xs text-washi/55">
        <summary className="cursor-pointer select-none hover:text-cian-300">Ver tabla</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-washi/40">
            <tr>
              <th className="py-1 font-medium">Semana</th>
              <th className="font-medium">{nombre}</th>
              <th className="font-medium">n</th>
              <th className="font-medium">Academia</th>
              <th className="font-medium">n</th>
            </tr>
          </thead>
          <tbody>
            {serie.map((p, i) => (
              <tr key={p.semana} className="border-t border-white/[0.05]">
                <td className="py-1">{semanaCorta(p.semana)}</td>
                <td>{num(p.csat)}</td>
                <td>{p.n}</td>
                <td>{num(referencia[i]?.csat ?? null)}</td>
                <td>{referencia[i]?.n ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

// Chips agrupados por dimensión SEEQ: positivos y negativos con su conteo.
export function ChipsSeeq({
  datos,
  nombres,
  textoChip,
}: {
  datos: Record<string, { positivos: number; negativos: number; chips: Record<string, number> }>;
  nombres: Record<string, string>;
  textoChip: Record<string, string>;
}) {
  const filas = Object.entries(datos).sort((a, b) => b[1].positivos + b[1].negativos - (a[1].positivos + a[1].negativos));
  if (!filas.length) return <p className="text-sm text-washi/45">Todavía no hay chips elegidos.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {filas.map(([dim, d]) => (
        <li key={dim} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium text-washi/85">{nombres[dim] ?? dim}</span>
            <span className="text-xs tabular-nums text-washi/55">
              <span className="text-matcha">+{d.positivos}</span> · <span className="text-shu-400">−{d.negativos}</span>
            </span>
          </div>
          <p className="text-xs text-washi/45">
            {Object.entries(d.chips)
              .sort((a, b) => b[1] - a[1])
              .map(([c, k]) => `${textoChip[c] ?? c} (${k})`)
              .join(" · ")}
          </p>
        </li>
      ))}
    </ul>
  );
}
