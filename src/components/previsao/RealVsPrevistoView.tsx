import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Bar, CartesianGrid, ComposedChart, Area, Line, ReferenceLine, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import GraficoRolavel, { tetoEixo } from '@/components/previsao/GraficoRolavel';
import { ChevronDown, ChevronRight, Download, Info, Loader2 } from 'lucide-react';
import type { CategoriaResultado } from '@/components/previsao/PrevisaoResultados';

// ---------------------------------------------------------------------------
// Real x Previsto (12/11/2026)
//
// Compara, mes a mes, a arrecadacao REALIZADA (tabela previsao_serie_historica,
// alimentada pela aba "Importar dados" a partir da aba Consolidado da planilha
// ARRECADACAO) com o que a execucao selecionada PREVIU pra cada mes:
//   - meses dentro da janela de backtest -> previsao fora da amostra do modelo
//     vencedor por MAPE (o modelo nao viu esses meses no treino);
//   - meses depois do fim do historico usado -> projecao do cenario base
//     (com conservador/otimista e IC 95% como referencia).
// O realizado vem sempre do banco (o mais atual), nao do snapshot gravado na
// execucao - assim meses importados depois da execucao (ex. jul-out/26 numa
// previsao que comecou em jul/26) ja aparecem comparados.
// ---------------------------------------------------------------------------

/** Realizado por mes (chave AAAA-MM-01) e por categoria. A chave
 * RESTITUICAO guarda a parte do Extra Judicial que e a receita 63320
 * (restituicao de excedentes ao teto), ja incluida em 'Extra Judicial'. */
export type SerieReal = Record<string, Record<string, number | null>>;
export const RESTITUICAO = '__restituicao';

export interface LinhaSerieReal {
  data: string;
  tipo_judicial: number | null;
  tipo_extra_judicial: number | null;
  tipo_rendimento: number | null;
  extra_judicial_restituicao?: number | null;
}

/** Linha da tabela previsao_serie_historica -> SerieReal. */
export function montarSerieReal(linhas: LinhaSerieReal[]): SerieReal {
  const out: SerieReal = {};
  linhas.forEach((l) => {
    out[l.data.slice(0, 10)] = {
      Judicial: l.tipo_judicial,
      'Extra Judicial': l.tipo_extra_judicial,
      Rendimento: l.tipo_rendimento,
      [RESTITUICAO]: l.extra_judicial_restituicao ?? null,
    };
  });
  return out;
}

const TOTAL = 'Total';
const ANO_INICIAL = '2026';

const NOME_MODELO: Record<string, string> = {
  naive_sazonal: 'Naive Sazonal',
  sarimax: 'SARIMAX',
  random_forest: 'Random Forest',
};

const COR_REAL = '#475569';
/** Largura de cada mes no grafico (px) - acima de ~14 meses ele rola na horizontal. */
const PX_POR_MES = 46;
const COR_PREVISTO = '#2a78d6';
const COR_CONSERVADOR = '#eda100';
const COR_OTIMISTA = '#1baf7a';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const mesCurto = (iso: string) => `${MESES[parseInt(iso.slice(5, 7), 10) - 1]}/${iso.slice(2, 4)}`;

const brl = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const mi = (v: number) => `R$ ${(v / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`;
const pct = (v: number | null | undefined, sinal = true) =>
  v === null || v === undefined || !isFinite(v)
    ? '—'
    : `${sinal && v > 0 ? '+' : ''}${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

interface LinhaMes {
  mes: string;
  origem: 'backtest' | 'projecao';
  previsto: number;
  conservador: number | null;
  otimista: number | null;
  ic: [number, number] | null;
  real: number | null;
}

/** Previsto x real de uma categoria, de jan/2026 ate o fim da projecao. */
function linhasDaCategoria(dados: CategoriaResultado, real: SerieReal | null, categoria: string, semRestituicao: boolean): LinhaMes[] {
  const vencedor = dados.modelos[dados.modelo_vencedor_mape as keyof typeof dados.modelos];
  const backtest = vencedor?.previsao_teste ?? {};
  const base = dados.cenarios_futuros.base?.previsao ?? {};
  const meses = Array.from(new Set([...Object.keys(backtest), ...Object.keys(base)]))
    .filter((m) => m >= `${ANO_INICIAL}-01-01`)
    .sort();

  return meses.flatMap((m) => {
    const emBase = base[m] !== undefined && base[m] !== null;
    const previsto = emBase ? base[m] : backtest[m];
    if (previsto === undefined || previsto === null) return [];
    let doBanco = real?.[m]?.[categoria];
    if (semRestituicao && categoria === 'Extra Judicial' && doBanco !== null && doBanco !== undefined) {
      doBanco -= real?.[m]?.[RESTITUICAO] ?? 0;
    }
    const doSnapshot = dados.historico[m];
    const realMes = doBanco ?? doSnapshot ?? null;
    return [{
      mes: m,
      origem: emBase ? 'projecao' : 'backtest',
      previsto,
      conservador: emBase ? dados.cenarios_futuros.conservador?.previsao[m] ?? null : null,
      otimista: emBase ? dados.cenarios_futuros.otimista?.previsao[m] ?? null : null,
      ic: emBase ? dados.cenarios_futuros.base?.intervalo_confianca_95?.[m] ?? null : null,
      real: realMes,
    } as LinhaMes];
  });
}

/** Soma das categorias mes a mes; o real do total so existe se as 3 categorias tiverem real. */
function somarCategorias(porCategoria: LinhaMes[][]): LinhaMes[] {
  const mapa = new Map<string, LinhaMes & { n: number; nReal: number }>();
  porCategoria.forEach((linhas) =>
    linhas.forEach((l) => {
      const acc = mapa.get(l.mes) ?? { ...l, previsto: 0, conservador: 0, otimista: 0, ic: null, real: 0, n: 0, nReal: 0 };
      acc.previsto += l.previsto;
      acc.conservador = l.conservador !== null && acc.conservador !== null ? acc.conservador + l.conservador : null;
      acc.otimista = l.otimista !== null && acc.otimista !== null ? acc.otimista + l.otimista : null;
      if (l.real !== null) { acc.real = (acc.real ?? 0) + l.real; acc.nReal += 1; }
      acc.n += 1;
      if (l.origem === 'backtest') acc.origem = 'backtest';
      mapa.set(l.mes, acc);
    })
  );
  const nCat = porCategoria.length;
  return Array.from(mapa.values())
    .filter((l) => l.n === nCat)
    .map(({ n: _n, nReal, ...l }) => ({ ...l, real: nReal === nCat ? l.real : null }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
}

interface Props {
  categorias: Record<string, CategoriaResultado>;
  real: SerieReal | null;
  carregandoReal?: boolean;
  erroReal?: string | null;
}

export default function RealVsPrevistoView({ categorias, real, carregandoReal, erroReal }: Props) {
  const nomesCat = Object.keys(categorias);
  const [selecao, setSelecao] = useState<string>(TOTAL);
  // Restituicao (63320) entra no realizado (decisao de 13/11/2026), mas o
  // motor foi treinado sem ela: o usuario escolhe comparar com ou sem.
  const [comRestituicao, setComRestituicao] = useState(true);
  const temRestituicao = useMemo(
    () => Object.values(real ?? {}).some((m) => (m[RESTITUICAO] ?? 0) !== 0),
    [real]
  );

  const porCategoria = useMemo(() => {
    const out: Record<string, LinhaMes[]> = {};
    nomesCat.forEach((c) => { out[c] = linhasDaCategoria(categorias[c], real, c, !comRestituicao); });
    return out;
  }, [categorias, real, nomesCat, comRestituicao]);

  const linhas = useMemo(
    () => (selecao === TOTAL ? somarCategorias(nomesCat.map((c) => porCategoria[c])) : porCategoria[selecao] ?? []),
    [selecao, porCategoria, nomesCat]
  );

  const comparaveis = linhas.filter((l) => l.real !== null);
  const somaReal = comparaveis.reduce((s, l) => s + (l.real ?? 0), 0);
  const somaPrev = comparaveis.reduce((s, l) => s + l.previsto, 0);
  const mape = comparaveis.length
    ? comparaveis.reduce((s, l) => s + Math.abs((l.real! - l.previsto) / (l.real || 1)), 0) / comparaveis.length
    : null;
  const acima = comparaveis.filter((l) => (l.real ?? 0) > l.previsto).length;

  const anoAtual = ANO_INICIAL;
  const doAno = linhas.filter((l) => l.mes.startsWith(anoAtual));
  const realizadoAno = doAno.reduce((s, l) => s + (l.real ?? 0), 0);
  const restanteAno = doAno.filter((l) => l.real === null).reduce((s, l) => s + l.previsto, 0);
  const previstoAno = doAno.reduce((s, l) => s + l.previsto, 0);
  const fechamentoAno = realizadoAno + restanteAno;
  const mesesSemReal = doAno.filter((l) => l.real === null).length;

  const inicioProjecao = linhas.find((l) => l.origem === 'projecao')?.mes;
  const ultimoReal = comparaveis[comparaveis.length - 1]?.mes;

  // Modelos usados (nome por categoria), pra legenda/explicacao
  const descricaoModelos = (selecao === TOTAL ? nomesCat : [selecao]).map((c) => {
    const d = categorias[c];
    const venc = NOME_MODELO[d.modelo_vencedor_mape] ?? d.modelo_vencedor_mape;
    const proj = NOME_MODELO[d.projecao_cenario_modelo ?? 'sarimax'] ?? d.projecao_cenario_modelo;
    return { categoria: c, venc, proj };
  });

  const dadosGrafico = linhas.map((l) => ({
    mes: mesCurto(l.mes),
    real: l.real ?? undefined,
    previsto: l.previsto,
    conservador: l.conservador ?? undefined,
    otimista: l.otimista ?? undefined,
    banda: l.ic ?? undefined,
  }));

  const yMax = tetoEixo(dadosGrafico.flatMap((d) => [d.real, d.previsto, d.otimista, d.banda?.[1]]));

  const configGrafico: ChartConfig = {
    real: { label: 'Realizado', color: COR_REAL },
    previsto: { label: 'Previsto (cenário base)', color: COR_PREVISTO },
    conservador: { label: 'Conservador', color: COR_CONSERVADOR },
    otimista: { label: 'Otimista', color: COR_OTIMISTA },
    banda: { label: 'IC 95%', color: COR_PREVISTO },
  };

  const exportar = () => {
    const rows = linhas.map((l) => ({
      'Mês': mesCurto(l.mes),
      'Origem da previsão': l.origem === 'backtest' ? 'Backtest (fora da amostra)' : 'Projeção',
      'Previsto (base)': Math.round(l.previsto * 100) / 100,
      'Realizado': l.real === null ? null : Math.round(l.real * 100) / 100,
      'Diferença (R$)': l.real === null ? null : Math.round((l.real - l.previsto) * 100) / 100,
      'Diferença (%)': l.real === null ? null : Math.round(((l.real - l.previsto) / l.previsto) * 10000) / 100,
      'Conservador': l.conservador,
      'Otimista': l.otimista,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selecao.slice(0, 31));
    XLSX.writeFile(wb, `real-x-previsto-${selecao.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
  };

  // Linhas da tabela agrupadas por ano, com subtotal
  const anos = Array.from(new Set(linhas.map((l) => l.mes.slice(0, 4))));
  // Matriz: cada ano e uma linha de total que abre/fecha os meses. Abre por
  // padrao so o ano que tem realizado (o que se compara hoje).
  const [anosAbertos, setAnosAbertos] = useState<Set<string> | null>(null);
  const abertos = anosAbertos ?? new Set(anos.filter((a) => linhas.some((l) => l.mes.startsWith(a) && l.real !== null)));
  const alternarAno = (ano: string) =>
    setAnosAbertos(() => {
      const n = new Set(abertos);
      if (n.has(ano)) n.delete(ano);
      else n.add(ano);
      return n;
    });

  const corDif = (real: number | null, prev: number) =>
    real === null ? '' : real >= prev ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';

  if (linhas.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Esta execução não tem previsões para {ANO_INICIAL} em diante</AlertTitle>
        <AlertDescription>Rode uma nova previsão para comparar com o realizado.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {[TOTAL, ...nomesCat].map((c) => (
          <Button key={c} size="sm" variant={selecao === c ? 'default' : 'outline'} onClick={() => setSelecao(c)}>
            {c === TOTAL ? 'Total (3 categorias)' : c}
          </Button>
        ))}
        {temRestituicao && (selecao === TOTAL || selecao === 'Extra Judicial') && (
          <label className="ml-auto flex items-center gap-2 text-sm cursor-pointer select-none" title="A previsão foi treinada sem a restituição (63320) e sem as receitas avulsas do Fermoju; desmarque para comparar na mesma base.">
            <Checkbox checked={comRestituicao} onCheckedChange={(v) => setComRestituicao(v === true)} />
            Incluir restituição e receitas avulsas no realizado
          </label>
        )}
        {carregandoReal && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> carregando realizado…</span>}
      </div>

      {erroReal && (
        <Alert variant="destructive">
          <AlertTitle>Não consegui carregar o realizado do banco</AlertTitle>
          <AlertDescription>{erroReal} — a tabela usa só os meses que já estavam no histórico desta execução.</AlertDescription>
        </Alert>
      )}

      {/* Resumo */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1"><CardDescription>Realizado × previsto ({comparaveis.length} {comparaveis.length === 1 ? 'mês' : 'meses'}{ultimoReal ? ` até ${mesCurto(ultimoReal)}` : ''})</CardDescription></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{pct(somaPrev ? somaReal / somaPrev - 1 : null)}</p>
            <p className="text-xs text-muted-foreground">{mi(somaReal)} realizado · {mi(somaPrev)} previsto</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardDescription>Diferença acumulada</CardDescription></CardHeader>
          <CardContent>
            <p className={cn('text-2xl font-semibold tabular-nums', corDif(somaReal, somaPrev))}>{brl(somaReal - somaPrev)}</p>
            <p className="text-xs text-muted-foreground">{acima} {acima === 1 ? 'mês' : 'meses'} acima do previsto · {comparaveis.length - acima} abaixo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardDescription>Erro médio por mês (MAPE)</CardDescription></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{pct(mape, false)}</p>
            <p className="text-xs text-muted-foreground">distância média, mês a mês, entre real e previsto</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardDescription>Fechamento estimado de {anoAtual}</CardDescription></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{mi(fechamentoAno)}</p>
            <p className="text-xs text-muted-foreground">
              realizado + previsto p/ {mesesSemReal} {mesesSemReal === 1 ? 'mês restante' : 'meses restantes'} · previsão original do ano: {mi(previstoAno)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grafico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Arrecadação real × previsão — {selecao === TOTAL ? 'total' : selecao}</CardTitle>
          <CardDescription>
            Barras = realizado (aba Consolidado, importado em "Importar dados"). Linha azul = previsto. Antes da linha tracejada, a previsão é o backtest fora da amostra do modelo vencedor; depois, a projeção do cenário base, com faixa de IC 95%{selecao === TOTAL ? ' (só por categoria)' : ''} e cenários conservador/otimista.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Largura fixa por mes + rolagem horizontal (projecao ate 2032);
              eixo Y e legenda fixos fora da area que rola. */}
          <GraficoRolavel
            config={configGrafico}
            legenda={['real', 'previsto', 'conservador', 'otimista']}
            tracejado={['conservador', 'otimista']}
            nPontos={dadosGrafico.length}
            pxPorPonto={PX_POR_MES}
            altura={340}
            alturaEixoX={24}
            margemTopo={8}
            yMax={yMax}
          >
            <ChartContainer config={configGrafico} className="aspect-auto h-[340px] w-full">
              <ComposedChart data={dadosGrafico} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={11} interval={dadosGrafico.length * PX_POR_MES > 640 ? 0 : 'preserveStartEnd'} height={24} />
                <YAxis hide domain={[0, yMax]} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => {
                  const label = configGrafico[name as string]?.label ?? name;
                  const txt = Array.isArray(value) ? `${brl(Number(value[0]))} – ${brl(Number(value[1]))}` : brl(Number(value));
                  return <span className="flex w-full justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="font-mono tabular-nums">{txt}</span></span>;
                }} />} />
                <Area dataKey="banda" fill={COR_PREVISTO} fillOpacity={0.1} stroke="none" legendType="none" />
                <Bar dataKey="real" fill={COR_REAL} radius={[3, 3, 0, 0]} maxBarSize={28} />
                <Line dataKey="previsto" stroke={COR_PREVISTO} strokeWidth={2.5} dot={{ r: 2.5 }} />
                <Line dataKey="conservador" stroke={COR_CONSERVADOR} strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls={false} />
                <Line dataKey="otimista" stroke={COR_OTIMISTA} strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls={false} />
                {inicioProjecao && (
                  <ReferenceLine x={mesCurto(inicioProjecao)} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Início da projeção', position: 'insideTopLeft', fontSize: 11, fill: '#64748b' }} />
                )}
              </ComposedChart>
            </ChartContainer>
          </GraficoRolavel>
          {temRestituicao && comRestituicao && (selecao === TOTAL || selecao === 'Extra Judicial') && (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
              O realizado de Extra Judicial é o oficial (linha &quot;TOTAL CONSOLIDADO&quot; do Fermoju) e inclui a restituição (63320) e receitas avulsas (concursos, receitas de capital etc.); a previsão foi treinada sem elas, então parte da diferença vem dessas receitas.
              Desmarque &quot;Incluir restituição&quot; para comparar na mesma base.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {descricaoModelos.map((d) => (
              <span key={d.categoria}>
                <strong className="text-foreground">{d.categoria}:</strong> backtest {d.venc} · projeção {d.proj}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabela mes a mes */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Previsão mês a mês × realizado</CardTitle>
            <CardDescription>
              Clique no ano para abrir ou fechar os meses. Diferença = realizado − previsto (verde: arrecadou acima do previsto; vermelho: abaixo). Meses sem realizado mostram só a previsão.
            </CardDescription>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAnosAbertos(abertos.size === anos.length ? new Set() : new Set(anos))}>
              {abertos.size === anos.length ? 'Recolher anos' : 'Expandir anos'}
            </Button>
            <Button size="sm" variant="outline" onClick={exportar}><Download className="h-4 w-4 mr-2" /> Excel</Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Previsto (base)</TableHead>
                <TableHead className="text-right">Realizado</TableHead>
                <TableHead className="text-right">Diferença</TableHead>
                <TableHead className="text-right">Dif. %</TableHead>
                <TableHead className="text-right">Conservador</TableHead>
                <TableHead className="text-right">Otimista</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {anos.map((ano) => {
                const doAnoT = linhas.filter((l) => l.mes.startsWith(ano));
                const comp = doAnoT.filter((l) => l.real !== null);
                const sR = comp.reduce((s, l) => s + (l.real ?? 0), 0);
                const sPcomp = comp.reduce((s, l) => s + l.previsto, 0);
                const sP = doAnoT.reduce((s, l) => s + l.previsto, 0);
                const sC = doAnoT.every((l) => l.conservador !== null) ? doAnoT.reduce((s, l) => s + (l.conservador ?? 0), 0) : null;
                const sO = doAnoT.every((l) => l.otimista !== null) ? doAnoT.reduce((s, l) => s + (l.otimista ?? 0), 0) : null;
                const aberto = abertos.has(ano);
                return [
                  <TableRow
                    key={`total-${ano}`}
                    className="cursor-pointer bg-muted/50 font-semibold hover:bg-muted"
                    onClick={() => alternarAno(ano)}
                    aria-expanded={aberto}
                  >
                    <TableCell className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        {aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        {ano}
                        <span className="text-xs font-normal text-muted-foreground">({doAnoT.length} {doAnoT.length === 1 ? 'mês' : 'meses'})</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-normal text-muted-foreground whitespace-nowrap">
                      {comp.length ? `dif. sobre ${comp.length} ${comp.length === 1 ? 'mês' : 'meses'}` : ''}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{brl(sP)}</TableCell>
                    <TableCell className="text-right tabular-nums">{comp.length ? brl(sR) : '—'}</TableCell>
                    <TableCell className={cn('text-right tabular-nums', comp.length ? corDif(sR, sPcomp) : '')}>{comp.length ? brl(sR - sPcomp) : '—'}</TableCell>
                    <TableCell className={cn('text-right tabular-nums', comp.length ? corDif(sR, sPcomp) : '')}>{comp.length ? pct(sR / sPcomp - 1) : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(sC)}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(sO)}</TableCell>
                  </TableRow>,
                  ...(aberto ? doAnoT : []).map((l) => (
                    <TableRow key={l.mes}>
                      <TableCell className="pl-10 whitespace-nowrap">{mesCurto(l.mes)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('font-normal text-[11px] whitespace-nowrap', l.origem === 'projecao' && 'border-primary/40 text-primary')}>
                          {l.origem === 'backtest' ? 'Backtest' : 'Projeção'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{brl(l.previsto)}</TableCell>
                      <TableCell className="text-right tabular-nums">{brl(l.real)}</TableCell>
                      <TableCell className={cn('text-right tabular-nums', corDif(l.real, l.previsto))}>{l.real === null ? '—' : brl(l.real - l.previsto)}</TableCell>
                      <TableCell className={cn('text-right tabular-nums', corDif(l.real, l.previsto))}>{l.real === null ? '—' : pct(l.real / l.previsto - 1)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{brl(l.conservador)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{brl(l.otimista)}</TableCell>
                    </TableRow>
                  )),
                ];
              })}
              {anos.length > 1 && (() => {
                const comp = linhas.filter((l) => l.real !== null);
                const sR = comp.reduce((t, l) => t + (l.real ?? 0), 0);
                const sPc = comp.reduce((t, l) => t + l.previsto, 0);
                const soma = (f: (l: LinhaMes) => number | null) =>
                  linhas.every((l) => f(l) !== null) ? linhas.reduce((t, l) => t + (f(l) ?? 0), 0) : null;
                return (
                  <TableRow className="border-t-2 font-bold hover:bg-transparent">
                    <TableCell className="whitespace-nowrap">Total {anos[0]}–{anos[anos.length - 1]}</TableCell>
                    <TableCell />
                    <TableCell className="text-right tabular-nums">{brl(soma((l) => l.previsto))}</TableCell>
                    <TableCell className="text-right tabular-nums">{comp.length ? brl(sR) : '—'}</TableCell>
                    <TableCell className={cn('text-right tabular-nums', comp.length ? corDif(sR, sPc) : '')}>{comp.length ? brl(sR - sPc) : '—'}</TableCell>
                    <TableCell className={cn('text-right tabular-nums', comp.length ? corDif(sR, sPc) : '')}>{comp.length ? pct(sR / sPc - 1) : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(soma((l) => l.conservador))}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(soma((l) => l.otimista))}</TableCell>
                  </TableRow>
                );
              })()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
