import { formatarDinheiro } from "@/lib/nucleo";
import { dataCurta } from "@/lib/tempo";

// Paleta validada (dataviz/validate_palette.js): dourado para entrada, ameixa para saída.
export const COR_ENTRADA = "#C9A24A";
export const COR_SAIDA = "#6B4E9B";

export type Serie = { nome: string; cor: string; valores: number[] };

/**
 * Barras agrupadas por dia (ou semana), com eixo único começando no zero.
 * Hover nativo por barra (<title>) e uma tabela equivalente logo abaixo.
 */
export function GraficoBarras({ rotulos, series, titulo }: { rotulos: string[]; series: Serie[]; titulo: string }) {
  const maximo = Math.max(1, ...series.flatMap((s) => s.valores));
  const largura = 340;
  const altura = 160;
  const passo = largura / Math.max(rotulos.length, 1);
  const larguraBarra = Math.max(2, Math.min(14, (passo - 4) / series.length - 2));

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">{titulo}</span>
        {series.length > 1 && (
          <span className="flex gap-3 text-sm text-secundario">
            {series.map((s) => (
              <span key={s.nome} className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm" style={{ background: s.cor }} aria-hidden />
                {s.nome}
              </span>
            ))}
          </span>
        )}
      </figcaption>
      <svg viewBox={`0 0 ${largura} ${altura + 20}`} className="w-full" role="img" aria-label={titulo}>
        {[0.5, 1].map((f) => (
          <line key={f} x1={0} x2={largura} y1={altura - altura * f} y2={altura - altura * f} stroke="var(--linha)" strokeWidth={1} />
        ))}
        <line x1={0} x2={largura} y1={altura} y2={altura} stroke="var(--secundario)" strokeWidth={1} />
        <text x={0} y={10} fontSize={9} fill="var(--secundario)">{formatarDinheiro(maximo)}</text>
        {rotulos.map((r, i) => {
          const x0 = i * passo + (passo - (larguraBarra + 2) * series.length) / 2;
          return (
            <g key={r}>
              {series.map((s, k) => {
                const v = s.valores[i] ?? 0;
                const h = (v / maximo) * (altura - 14);
                if (v <= 0) return null;
                return (
                  <rect key={s.nome} x={x0 + k * (larguraBarra + 2)} y={altura - h} width={larguraBarra} height={h} rx={Math.min(4, larguraBarra / 2)} fill={s.cor}>
                    <title>{`${s.nome} · ${r}: ${formatarDinheiro(v)}`}</title>
                  </rect>
                );
              })}
              {(rotulos.length <= 12 || i % Math.ceil(rotulos.length / 8) === 0) && (
                <text x={i * passo + passo / 2} y={altura + 14} fontSize={9} textAnchor="middle" fill="var(--secundario)">{r}</text>
              )}
            </g>
          );
        })}
      </svg>
      <details className="text-sm">
        <summary className="cursor-pointer py-2 text-secundario underline underline-offset-4">Ver como tabela</summary>
        <table className="w-full tabular-nums">
          <thead>
            <tr className="text-left text-secundario">
              <th className="py-1 font-medium">Período</th>
              {series.map((s) => <th key={s.nome} className="py-1 text-right font-medium">{s.nome}</th>)}
            </tr>
          </thead>
          <tbody>
            {rotulos.map((r, i) => (
              <tr key={r} className="border-t border-linha">
                <td className="py-1">{r}</td>
                {series.map((s) => <td key={s.nome} className="py-1 text-right">{formatarDinheiro(s.valores[i] ?? 0)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Agrupa valores por dia ou, em períodos longos, por semana (a partir do primeiro dia). */
export function agrupar(de: string, ate: string, itens: { data: string; valor: number; serie: number }[], nSeries: number) {
  const dias: string[] = [];
  for (let d = de; d <= ate; d = new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8) + 1)).toISOString().slice(0, 10)) dias.push(d);
  const porSemana = dias.length > 35;
  const rotulos: string[] = [];
  const indice = new Map<string, number>();
  dias.forEach((d, i) => {
    const grupo = porSemana ? Math.floor(i / 7) : i;
    if (rotulos.length <= grupo) rotulos.push(porSemana ? `${dataCurta(d)}+` : dataCurta(d));
    indice.set(d, grupo);
  });
  const valores = Array.from({ length: nSeries }, () => Array<number>(rotulos.length).fill(0));
  for (const it of itens) {
    const g = indice.get(it.data);
    if (g !== undefined) valores[it.serie][g] += it.valor;
  }
  return { rotulos, valores };
}
