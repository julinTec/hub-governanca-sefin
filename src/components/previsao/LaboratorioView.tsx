import { useMemo, useState } from 'react';
import { Area, Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CategoriaResultado } from '@/components/previsao/PrevisaoResultados';

// ---------------------------------------------------------------------------
// Laboratorio de Modelos (26/11/2026)
//
// Mostra o que scripts/laboratorio.py grava em resultado.laboratorio: uma
// projecao DESAFIANTE (nao oficial) ao lado da oficial, o backtest
// multi-origem dos modelos candidatos e as premissas (Focus/BCB, depositos
// judiciais). Nada aqui altera a projecao oficial.
// ---------------------------------------------------------------------------

type Cen = 'conservador' | 'base' | 'otimista';
type SerieMes = Record<string, number>;

interface MetricaModelo { nome: string; mape_mensal: number; erro_abs_12m: number; vies_12m: number; erros_12m_por_janela: number[] }

export interface Laboratorio {
  gerado_em: string;
  premissas: {
    focus: {
      fonte: string; data_referencia: string; reserva: boolean;
      selic_fim_de_ano_pct: Record<string, number>; ipca_pct: Record<string, number>; pib_pct?: Record<string, number>;
    };
    /** versao 2 (26/11): cenarios de longo prazo ancorados em IPCA, PIB Focus e historico real */
    longo_prazo?: { real_historico_pct: Record<string, number>; real_historico_metodo: string };
    /** versao 1 */
    crescimento_real_anual?: number;
    desvio_cenarios_longo_prazo?: number;
    rendimento: {
      taxa_depositos_mes: number; saldo_depositos_base: number; crescimento_saldo_depositos_12m_observado: number;
      saldo_aplicacoes_implicito: number; mape_aderencia_pct: number; periodo_dados: [string, string];
    };
    ultimo_mes_realizado: string;
  };
  backtest: {
    cortes: string[]; horizonte_meses: number; janelas: number;
    metricas: Record<string, Record<string, MetricaModelo>>;
    correcao_vies: Record<string, { fator: number; aplicada: boolean; vies_medio_12m_pct: number }>;
    observacao: string;
  };
  desafiante: {
    metodo: Record<string, string>;
    categorias: Record<string, Record<Cen, SerieMes>>;
    total: Record<Cen, SerieMes>;
    totais_por_ano: Record<string, Record<string, Record<Cen, number>>>;
    rendimento_componentes: {
      projecao_base: { depositos_judiciais: SerieMes; aplicacoes: SerieMes };
      historico: { depositos_judiciais: SerieMes; aplicacoes: SerieMes; saldo_remuneravel: SerieMes };
    };
  };
}

const TOTAL = 'Total';
const CATS = ['Judicial', 'Extra Judicial', 'Rendimento'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const mesCurto = (iso: string) => `${MESES[parseInt(iso.slice(5, 7), 10) - 1]}/${iso.slice(2, 4)}`;
const mi = (v: number | null | undefined, casas = 1) =>
  v === null || v === undefined || !isFinite(v) ? '—' : `R$ ${(v / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })} mi`;
const pct = (v: number, casas = 1) => `${v > 0 ? '+' : ''}${v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
const bi = (v: number) => `R$ ${(v / 1e9).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} bi`;

const COR_REAL = '#94a3b8';
const COR_OFICIAL = '#2563eb';
const COR_DESAFIANTE = '#d97706';
const configGrafico: ChartConfig = {
  real: { label: 'Realizado', color: COR_REAL },
  oficial: { label: 'Oficial (base)', color: COR_OFICIAL },
  desafiante: { label: 'Desafiante (base)', color: COR_DESAFIANTE },
  faixa: { label: 'Desafiante: conservador–otimista', color: COR_DESAFIANTE },
};

export default function LaboratorioView({ lab, categorias }: { lab: Laboratorio; categorias: Record<string, CategoriaResultado> }) {
  const [selecao, setSelecao] = useState<string>(TOTAL);
  const cats = selecao === TOTAL ? CATS : [selecao];

  // oficial: soma das categorias selecionadas, por mes e por ano
  const oficialMes = useMemo(() => {
    const out: SerieMes = {};
    cats.forEach((c) =>
      Object.entries(categorias[c]?.cenarios_futuros.base?.previsao ?? {}).forEach(([m, v]) => { out[m] = (out[m] ?? 0) + (v ?? 0); })
    );
    return out;
  }, [categorias, selecao]); // eslint-disable-line react-hooks/exhaustive-deps

  const realMes = useMemo(() => {
    const out: SerieMes = {};
    const meses = Object.keys(categorias[cats[0]]?.historico ?? {});
    meses.forEach((m) => {
      const vals = cats.map((c) => categorias[c]?.historico?.[m]);
      if (vals.every((v) => typeof v === 'number')) out[m] = (vals as number[]).reduce((a, b) => a + b, 0);
    });
    return out;
  }, [categorias, selecao]); // eslint-disable-line react-hooks/exhaustive-deps

  const desaf = selecao === TOTAL ? lab.desafiante.total : lab.desafiante.categorias[selecao];
  const totaisDesaf = lab.desafiante.totais_por_ano[selecao] ?? {};

  const anos = Object.keys(totaisDesaf)
    .filter((a) => Object.keys(desaf.base).filter((m) => m.startsWith(a)).length === 12)
    .sort();
  const oficialAno = (a: string) => Object.entries(oficialMes).filter(([m]) => m.startsWith(a)).reduce((s, [, v]) => s + v, 0);
  const mesesOficiaisAno = (a: string) => Object.keys(oficialMes).filter((m) => m.startsWith(a)).length;

  // grafico: jan do ano do ultimo realizado ate dez do ano seguinte
  const ultimo = lab.premissas.ultimo_mes_realizado;
  const anoIni = Number(ultimo.slice(0, 4));
  const dadosGrafico = useMemo(() => {
    const out = [];
    for (let a = anoIni; a <= anoIni + 1; a++) {
      for (let m = 1; m <= 12; m++) {
        const iso = `${a}-${String(m).padStart(2, '0')}-01`;
        const lo = desaf.conservador[iso];
        const hi = desaf.otimista[iso];
        out.push({
          mes: mesCurto(iso),
          real: realMes[iso] ?? null,
          oficial: oficialMes[iso] ?? null,
          desafiante: desaf.base[iso] ?? null,
          faixa: lo !== undefined && hi !== undefined ? [lo, hi] : null,
        });
      }
    }
    return out;
  }, [anoIni, desaf, realMes, oficialMes]);

  const metricas = lab.backtest.metricas[selecao] ?? {};
  const ordemModelos = Object.entries(metricas).sort((a, b) => a[1].erro_abs_12m - b[1].erro_abs_12m);
  const melhor = ordemModelos[0]?.[0];
  const f = lab.premissas.focus;
  const lp = lab.premissas.longo_prazo;
  const r = lab.premissas.rendimento;

  // Rendimento: componentes por ano (projecao base)
  const compAno = useMemo(() => {
    const acc: Record<string, { dj: number; ap: number; n: number }> = {};
    const { depositos_judiciais: dj, aplicacoes: ap } = lab.desafiante.rendimento_componentes.projecao_base;
    Object.keys(dj).forEach((m) => {
      const a = m.slice(0, 4);
      acc[a] ??= { dj: 0, ap: 0, n: 0 };
      acc[a].dj += dj[m];
      acc[a].ap += ap[m] ?? 0;
      acc[a].n += 1;
    });
    return Object.entries(acc).filter(([, v]) => v.n === 12).sort(([a], [b]) => a.localeCompare(b));
  }, [lab]);
  const hist = lab.desafiante.rendimento_componentes.historico;
  const ultimos12 = Object.keys(hist.depositos_judiciais).sort().slice(-12);
  const dj12 = ultimos12.reduce((s, m) => s + (hist.depositos_judiciais[m] ?? 0), 0);
  const ap12 = ultimos12.reduce((s, m) => s + (hist.aplicacoes[m] ?? 0), 0);

  return (
    <div className="min-w-0 space-y-6">
      <Alert>
        <FlaskConical className="h-4 w-4" />
        <AlertTitle>Projeção desafiante — não oficial</AlertTitle>
        <AlertDescription>
          Roda junto com cada execução e fica ao lado da projeção oficial para comparação. Só vira oficial se a equipe aprovar, com base nos critérios de aceite da proposta
          (menor erro no total de 12 meses, viés abaixo de 5% e faixas que contêm o realizado).
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap gap-2">
        {[TOTAL, ...CATS].map((c) => (
          <Button key={c} size="sm" variant={selecao === c ? 'default' : 'outline'} onClick={() => setSelecao(c)}>{c}</Button>
        ))}
      </div>

      {/* Oficial x desafiante por ano */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Oficial × desafiante por ano · {selecao}</CardTitle>
          <CardDescription>{selecao === TOTAL ? 'Soma das 3 categorias.' : lab.desafiante.metodo[selecao]}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ano</TableHead>
                <TableHead className="text-right">Oficial (base)</TableHead>
                <TableHead className="text-right">Desafiante (base)</TableHead>
                <TableHead className="text-right">Diferença</TableHead>
                <TableHead className="text-right">Desafiante: conservador – otimista</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {anos.map((a) => {
                const of = mesesOficiaisAno(a) === 12 ? oficialAno(a) : null;
                const d = totaisDesaf[a];
                return (
                  <TableRow key={a} className={a === String(anoIni + 1) ? 'bg-primary/5 font-medium' : undefined}>
                    <TableCell>{a}</TableCell>
                    <TableCell className="text-right tabular-nums">{mi(of)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{mi(d.base)}</TableCell>
                    <TableCell className={cn('text-right tabular-nums', of !== null && d.base < of ? 'text-red-600' : 'text-emerald-600')}>
                      {of !== null ? `${mi(d.base - of)} (${pct((d.base / of - 1) * 100)})` : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{mi(d.conservador, 0)} – {mi(d.otimista, 0)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Grafico mensal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mês a mês · {anoIni} e {anoIni + 1}</CardTitle>
          <CardDescription>Realizado (critério do modelo), projeção oficial e desafiante com a faixa conservador–otimista.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={configGrafico} className="aspect-auto h-[320px] w-full">
            <ComposedChart data={dadosGrafico} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} interval={1} fontSize={12} />
              <YAxis width={52} tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${(Number(v) / 1e6).toFixed(0)}M`} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => {
                const label = configGrafico[name as string]?.label ?? name;
                const txt = Array.isArray(value) ? `${mi(Number(value[0]))} – ${mi(Number(value[1]))}` : mi(Number(value));
                return <span className="flex w-full justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="font-mono tabular-nums">{txt}</span></span>;
              }} />} />
              <Area dataKey="faixa" stroke="none" fill="var(--color-faixa)" fillOpacity={0.15} isAnimationActive={false} />
              <Bar dataKey="real" fill="var(--color-real)" fillOpacity={0.6} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              <Line dataKey="oficial" stroke="var(--color-oficial)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
              <Line dataKey="desafiante" stroke="var(--color-desafiante)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ChartContainer>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm" style={{ background: COR_REAL, opacity: 0.6 }} />Realizado</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: COR_OFICIAL }} />Oficial</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2" style={{ borderColor: COR_DESAFIANTE }} />Desafiante</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm" style={{ background: COR_DESAFIANTE, opacity: 0.2 }} />Faixa do desafiante</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        {/* Backtest */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Backtest dos modelos candidatos · {selecao}</CardTitle>
            <CardDescription>
              {lab.backtest.janelas} cortes ({lab.backtest.cortes[0]} a {lab.backtest.cortes[lab.backtest.cortes.length - 1]}, a cada 3 meses), prevendo {lab.backtest.horizonte_meses} meses à frente em cada um.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modelo</TableHead>
                  <TableHead className="text-right">Erro mensal (MAPE)</TableHead>
                  <TableHead className="text-right">Erro no total de 12 meses</TableHead>
                  <TableHead className="text-right">Viés 12 meses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordemModelos.map(([k, m]) => (
                  <TableRow key={k} className={k === melhor ? 'bg-emerald-50 dark:bg-emerald-950/30' : undefined}>
                    <TableCell className="font-medium">{m.nome}{k === melhor && <Badge variant="outline" className="ml-2 text-[10px]">menor erro anual</Badge>}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.mape_mensal.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</TableCell>
                    <TableCell className="text-right tabular-nums">{m.erro_abs_12m.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</TableCell>
                    <TableCell className={cn('text-right tabular-nums', Math.abs(m.vies_12m) >= 5 && 'text-amber-600')}>{pct(m.vies_12m)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-3 text-xs text-muted-foreground">
              Viés negativo = o modelo previu abaixo do realizado. {lab.backtest.observacao}
              {lab.backtest.correcao_vies[selecao]?.aplicada &&
                ` No desafiante de ${selecao}, a combinação foi corrigida pelo viés médio (×${lab.backtest.correcao_vies[selecao].fator.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}).`}
              {selecao === 'Rendimento' && ' Em Rendimento, o desafiante usa o modelo estrutural (ao lado), não estes modelos.'}
            </p>
          </CardContent>
        </Card>

        {/* Premissas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Premissas desta execução</CardTitle>
            <CardDescription>
              {f.fonte}, data-base {f.data_referencia.split('-').reverse().join('/')}
              {f.reserva && ' — a API não respondeu; usados valores de reserva'}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Focus (mediana)</TableHead>
                  {Object.keys(f.selic_fim_de_ano_pct).map((a) => <TableHead key={a} className="text-right">{a}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Selic fim de ano</TableCell>
                  {Object.values(f.selic_fim_de_ano_pct).map((v, i) => <TableCell key={i} className="text-right tabular-nums">{v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</TableCell>)}
                </TableRow>
                <TableRow>
                  <TableCell>IPCA</TableCell>
                  {Object.values(f.ipca_pct).map((v, i) => <TableCell key={i} className="text-right tabular-nums">{v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</TableCell>)}
                </TableRow>
                {f.pib_pct && (
                  <TableRow>
                    <TableCell>PIB (real)</TableCell>
                    {Object.keys(f.selic_fim_de_ano_pct).map((a) => (
                      <TableCell key={a} className="text-right tabular-nums">{f.pib_pct?.[a] !== undefined ? `${f.pib_pct[a].toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%` : '—'}</TableCell>
                    ))}
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <ul className="space-y-1.5 text-sm">
              {lp ? (
                <li>
                  Judicial e Extra Judicial depois de dez/{anoIni + 1} (partindo do mês a mês de {anoIni + 1}):
                  <span className="block pl-3">• <strong>base</strong> = IPCA Focus + PIB Focus do ano;</span>
                  <span className="block pl-3">• <strong>conservador</strong> = só o IPCA Focus (0% real);</span>
                  <span className="block pl-3">
                    • <strong>otimista</strong> = IPCA Focus + crescimento real histórico (
                    {Object.entries(lp.real_historico_pct).map(([c, v]) => `${c} ${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`).join('; ')} ao ano; {lp.real_historico_metodo}).
                  </span>
                  <span className="block text-xs text-muted-foreground">Em {anoIni + 1}, conservador/otimista são a faixa de 80% calibrada pelos erros reais.</span>
                </li>
              ) : (
                <li>Depois de dez/{anoIni + 1}: cresce <strong>IPCA Focus + {((lab.premissas.crescimento_real_anual ?? 0) * 100).toFixed(0)}% real</strong> ao ano; conservador/otimista ∓ {((lab.premissas.desvio_cenarios_longo_prazo ?? 0) * 100).toFixed(0)} p.p.</li>
              )}
              <li>Depósitos judiciais: saldo remunerável de <strong>{bi(r.saldo_depositos_base)}</strong> × <strong>{(r.taxa_depositos_mes * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% a.m.</strong> (taxa da memória de cálculo); saldo cresce pelo IPCA no base, fica parado no conservador e cresce até IPCA + 5 p.p. no otimista (últimos 12 meses: {pct(r.crescimento_saldo_depositos_12m_observado * 100)}).</li>
              <li>Aplicações próprias: saldo implícito de <strong>{bi(r.saldo_aplicacoes_implicito)}</strong> × Selic Focus mensal.</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Rendimento estrutural */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rendimento estrutural: de onde vem</CardTitle>
          <CardDescription>
            Últimos 12 meses ({mesCurto(ultimos12[0])} a {mesCurto(ultimos12[ultimos12.length - 1])}): {mi(dj12)} da remuneração dos depósitos judiciais ({Math.round((dj12 / (dj12 + ap12)) * 100)}%, taxa fixa) e {mi(ap12)} das aplicações próprias ({Math.round((ap12 / (dj12 + ap12)) * 100)}%, acompanham a Selic).
            Aderência do modelo no período com dados ({r.periodo_dados.map(mesCurto).join(' a ')}): erro médio mensal de {r.mape_aderencia_pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ano (desafiante base)</TableHead>
                <TableHead className="text-right">Depósitos judiciais (0,28% a.m.)</TableHead>
                <TableHead className="text-right">Aplicações (Selic)</TableHead>
                <TableHead className="text-right">Rendimento</TableHead>
                <TableHead className="text-right">Oficial</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compAno.map(([a, v]) => {
                const of = Object.entries(categorias.Rendimento?.cenarios_futuros.base?.previsao ?? {}).filter(([m]) => m.startsWith(a));
                return (
                  <TableRow key={a}>
                    <TableCell>{a}</TableCell>
                    <TableCell className="text-right tabular-nums">{mi(v.dj)}</TableCell>
                    <TableCell className="text-right tabular-nums">{mi(v.ap)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{mi(v.dj + v.ap)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{of.length === 12 ? mi(of.reduce((s, [, x]) => s + (x ?? 0), 0)) : '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
