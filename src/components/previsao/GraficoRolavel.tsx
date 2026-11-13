import type { ReactNode } from 'react';
import { ComposedChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';

// Graficos longos (projecao ate 2032, ~80 meses) com largura fixa por mes e
// rolagem horizontal. O eixo de valores e a legenda ficam FORA da area que
// rola, pra nao sumirem quando o usuario arrasta pro lado. O grafico de
// dentro deve usar <YAxis hide domain={[0, yMax]} /> com o mesmo yMax.

/** Teto "redondo" do eixo Y (multiplo de 5, 10, 25... milhoes). */
export function tetoEixo(valores: (number | null | undefined)[]): number {
  const max = Math.max(0, ...valores.filter((v): v is number => typeof v === 'number' && isFinite(v)));
  if (max <= 0) return 1;
  const passos = [1, 2, 2.5, 5, 10];
  const ordem = Math.pow(10, Math.floor(Math.log10(max)));
  const passo = passos.find((p) => p * ordem >= max / 4) ?? 10;
  return Math.ceil(max / (passo * ordem)) * passo * ordem;
}

interface Props {
  config: ChartConfig;
  /** Chaves do config a mostrar na legenda (na ordem). */
  legenda: string[];
  /** Estilo de linha tracejada por chave (so visual da legenda). */
  tracejado?: string[];
  nPontos: number;
  pxPorPonto: number;
  altura: number;
  /** Altura reservada pro eixo X no grafico de dentro (px). */
  alturaEixoX: number;
  margemTopo: number;
  yMax: number;
  formatarY?: (v: number) => string;
  children: ReactNode;
}

export default function GraficoRolavel({
  config, legenda, tracejado = [], nPontos, pxPorPonto, altura, alturaEixoX, margemTopo, yMax,
  formatarY = (v) => `${(v / 1e6).toFixed(0)}M`, children,
}: Props) {
  const rola = nPontos * pxPorPonto > 640;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {legenda.map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span
              className="inline-block h-0 w-4 border-t-2"
              style={{ borderColor: config[k]?.color, borderStyle: tracejado.includes(k) ? 'dashed' : 'solid' }}
            />
            {config[k]?.label}
          </span>
        ))}
        {rola && <span className="ml-auto text-muted-foreground">Role para o lado para ver todos os meses →</span>}
      </div>
      <div className="flex">
        <div className="shrink-0" style={{ width: 48 }}>
          <ChartContainer config={config} className="aspect-auto w-full" style={{ height: altura }}>
            <ComposedChart data={[{ x: 0 }]} margin={{ top: margemTopo, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="x" tick={false} axisLine={false} tickLine={false} height={alturaEixoX} />
              <YAxis width={48} domain={[0, yMax]} tickLine={false} axisLine={false} fontSize={12} tickFormatter={formatarY} />
            </ComposedChart>
          </ChartContainer>
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto pb-2">
          <div style={{ minWidth: rola ? nPontos * pxPorPonto : undefined }}>{children}</div>
        </div>
      </div>
    </div>
  );
}
