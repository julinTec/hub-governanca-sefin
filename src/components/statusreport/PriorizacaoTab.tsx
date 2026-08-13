import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import KpiCard from './KpiCard';
import ActiveFiltersBar, { type FilterChip } from './ActiveFiltersBar';
import EmptyState from './EmptyState';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Cell,
  ZAxis,
} from 'recharts';
import {
  ArrowUpDown,
  Download,
  Info,
  RotateCcw,
  Search,
  Target,
  Flag,
  Gauge,
  Zap,
  TrendingUp,
  Scale,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  classifyQuadrant,
  DEFAULT_IMPACT_THRESHOLD,
  medianOf,
  QUADRANTS,
  valorPorEsforco,
  VALOR_POR_ESFORCO_TOOLTIP,
  cleanScaleLabel,
  getRoStatusDef,
  isRoAvaliavel,
  AVALIAVEL_TOOLTIP,
  srNormalize as normalize,
  type QuadrantKey,
} from '@/lib/statusReport/config';
import { downloadCsv } from '@/lib/statusReport/exportCsv';
import type { SrRo } from '@/hooks/useStatusReport';

export type PrioKpi = 'prioritarias' | 'alto-impacto' | null;

export interface PrioTabState {
  quadrants: QuadrantKey[];
  kpi: PrioKpi;
  busca: string;
  impactThreshold: number;
  effortThreshold: number | null;
  sortKey: string;
  sortDir: 'asc' | 'desc';
  comparar: string[];
}

export const PRIO_TAB_INITIAL: PrioTabState = {
  quadrants: [],
  kpi: null,
  busca: '',
  impactThreshold: DEFAULT_IMPACT_THRESHOLD,
  effortThreshold: null,
  sortKey: 'vpe',
  sortDir: 'desc',
  comparar: [],
};

const QUADRANT_COLOR: Record<QuadrantKey, string> = {
  'fazer-primeiro': 'hsl(var(--status-success))',
  investimento: 'hsl(var(--primary))',
  oportunidade: 'hsl(var(--muted-foreground))',
  questionar: 'hsl(var(--status-warning))',
};

const QUADRANT_BG: Record<QuadrantKey, string> = {
  'fazer-primeiro': 'hsl(var(--status-success) / 0.07)',
  investimento: 'hsl(var(--primary) / 0.07)',
  oportunidade: 'hsl(var(--muted-foreground) / 0.05)',
  questionar: 'hsl(var(--status-warning) / 0.08)',
};

export default function PriorizacaoTab({
  ros,
  state,
  setState,
  onSelectRo,
}: {
  ros: SrRo[];
  state: PrioTabState;
  setState: (patch: Partial<PrioTabState>) => void;
  onSelectRo: (ro: SrRo) => void;
}) {
  const avaliaveis = useMemo(() => ros.filter(isRoAvaliavel), [ros]);
  const naoAvaliaveis = ros.length - avaliaveis.length;
  const defaultEffortThreshold = useMemo(
    () => medianOf(avaliaveis.map((r) => r.esforco as number)) ?? 0,
    [avaliaveis],
  );
  const effort = state.effortThreshold ?? defaultEffortThreshold;
  const impactThreshold = state.impactThreshold;

  const classified = useMemo(
    () =>
      avaliaveis.map((r) => ({
        ro: r,
        vpe: valorPorEsforco(r.grau, r.esforco),
        quadrant: classifyQuadrant(r.impacto_nivel, r.esforco, impactThreshold, effort),
      })),
    [avaliaveis, impactThreshold, effort],
  );

  const maxEsforco = Math.max(...avaliaveis.map((r) => r.esforco as number), effort * 2, 10);

  const filtered = useMemo(() => {
    const q = normalize(state.busca);
    return classified.filter((x) => {
      if (state.quadrants.length && (!x.quadrant || !state.quadrants.includes(x.quadrant))) return false;
      if (state.kpi === 'prioritarias' && !x.ro.prioritario) return false;
      if (state.kpi === 'alto-impacto' && (x.ro.impacto_nivel || 0) < impactThreshold) return false;
      if (q && !normalize(`${x.ro.numero} ${x.ro.titulo} ${x.ro.epico_nome}`).includes(q)) return false;
      return true;
    });
  }, [classified, state.quadrants, state.kpi, state.busca, impactThreshold]);

  const rows = useMemo(() => {
    const dir = state.sortDir === 'asc' ? 1 : -1;
    const val = (x: (typeof filtered)[number]) => {
      switch (state.sortKey) {
        case 'numero':
          return x.ro.numero ?? -1;
        case 'titulo':
          return x.ro.titulo || '';
        case 'epico':
          return x.ro.epico_nome || '';
        case 'status':
          return x.ro.status_ordem ?? 99;
        case 'impacto':
          return x.ro.impacto_nivel ?? -1;
        case 'urgencia':
          return x.ro.urgencia_nivel ?? -1;
        case 'grau':
          return x.ro.grau ?? -1;
        case 'esforco':
          return x.ro.esforco ?? -1;
        case 'classificacao':
          return x.quadrant ? QUADRANTS[x.quadrant].label : '';
        default:
          return x.vpe ?? -1;
      }
    };
    return [...filtered].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'pt-BR') * dir;
    });
  }, [filtered, state.sortKey, state.sortDir]);

  const impactoMedio = filtered.length
    ? filtered.reduce((a, x) => a + (x.ro.impacto_nivel || 0), 0) / filtered.length
    : null;
  const esforcoTotal = filtered.reduce((a, x) => a + (x.ro.esforco || 0), 0);
  const prioritarias = filtered.filter((x) => x.ro.prioritario);
  const esforcoPrioritarios = prioritarias.reduce((a, x) => a + (x.ro.esforco || 0), 0);
  const altoImpacto = filtered.filter((x) => (x.ro.impacto_nivel || 0) >= impactThreshold).length;
  const count = (k: string) => classified.filter((x) => x.quadrant === k).length;

  const toggleQuadrant = (k: QuadrantKey) =>
    setState({
      quadrants: state.quadrants.includes(k) ? state.quadrants.filter((x) => x !== k) : [...state.quadrants, k],
    });

  const chips: FilterChip[] = [
    ...(state.busca ? [{ id: 'busca', group: 'Busca', value: state.busca, onRemove: () => setState({ busca: '' }) }] : []),
    ...state.quadrants.map((q) => ({
      id: `q-${q}`,
      group: 'Classificação',
      value: QUADRANTS[q].label,
      onRemove: () => toggleQuadrant(q),
    })),
    ...(state.kpi
      ? [
          {
            id: 'kpi',
            group: 'Indicador',
            value: state.kpi === 'prioritarias' ? 'Prioritárias' : `Alto impacto (≥ ${impactThreshold})`,
            onRemove: () => setState({ kpi: null }),
          },
        ]
      : []),
  ];

  const clearAll = () => setState({ busca: '', quadrants: [], kpi: null });
  const thresholdsAlterados = state.impactThreshold !== DEFAULT_IMPACT_THRESHOLD || state.effortThreshold !== null;

  const comparados = rows.filter((x) => state.comparar.includes(x.ro.id));
  const toggleComparar = (id: string) =>
    setState({
      comparar: state.comparar.includes(id) ? state.comparar.filter((x) => x !== id) : [...state.comparar, id],
    });

  const sortBtn = (key: string, label: string, right = false) => (
    <TableHead className={right ? 'text-right' : undefined}>
      <button
        className={cn('inline-flex items-center gap-1 hover:text-foreground', state.sortKey === key && 'font-semibold text-foreground')}
        onClick={() => setState({ sortKey: key, sortDir: state.sortKey === key && state.sortDir === 'desc' ? 'asc' : 'desc' })}
      >
        {label} <ArrowUpDown className="h-3 w-3 opacity-50" />
      </button>
    </TableHead>
  );

  if (!ros.length) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          Sem dados importados. Use “Importar Status Report”.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        <KpiCard
          label="ROs avaliáveis"
          value={filtered.length}
          tone="primary"
          icon={<Target className="h-4 w-4" />}
          hint={AVALIAVEL_TOOLTIP}
          sub={
            <>
              {avaliaveis.length} de {ros.length} ROs · {naoAvaliaveis} sem impacto e/ou esforço para a matriz
            </>
          }
        />
        <KpiCard
          label="Prioritárias avaliáveis"
          value={prioritarias.length}
          tone="danger"
          icon={<Flag className="h-4 w-4" />}
          hint="ROs prioritárias dentro do universo avaliável (com impacto e esforço válidos). Clique para filtrar."
          onClick={() => setState({ kpi: state.kpi === 'prioritarias' ? null : 'prioritarias' })}
          active={state.kpi === 'prioritarias'}
          sub={`${ros.filter((r) => r.prioritario).length} prioritárias na base total`}
        />
        <KpiCard
          label="Impacto médio"
          value={impactoMedio !== null ? impactoMedio.toFixed(1) : '—'}
          icon={<Gauge className="h-4 w-4" />}
          hint="Média do nível de impacto (escala 1–5) das ROs avaliáveis filtradas."
        />
        <KpiCard
          label="Esforço total"
          value={esforcoTotal.toLocaleString('pt-BR')}
          icon={<Zap className="h-4 w-4" />}
          hint="Soma do esforço das ROs avaliáveis filtradas."
        />
        <KpiCard
          label="Esforço dos prioritários"
          value={esforcoPrioritarios.toLocaleString('pt-BR')}
          icon={<Zap className="h-4 w-4" />}
          hint="Soma do esforço das ROs prioritárias avaliáveis filtradas."
        />
        <KpiCard
          label="Alto impacto"
          value={altoImpacto}
          icon={<TrendingUp className="h-4 w-4" />}
          hint={`ROs avaliáveis com impacto ≥ ${impactThreshold}. Clique para filtrar.`}
          onClick={() => setState({ kpi: state.kpi === 'alto-impacto' ? null : 'alto-impacto' })}
          active={state.kpi === 'alto-impacto'}
        />
        <KpiCard
          label="Alto impacto + baixo esforço"
          value={count('fazer-primeiro')}
          tone="success"
          icon={<Target className="h-4 w-4" />}
          hint="Quadrante “Fazer primeiro”. Clique para filtrar matriz e ranking."
          onClick={() => toggleQuadrant('fazer-primeiro')}
          active={state.quadrants.includes('fazer-primeiro')}
        />
        <KpiCard
          label="Baixo impacto + alto esforço"
          value={count('questionar')}
          tone="warning"
          icon={<Scale className="h-4 w-4" />}
          hint="Quadrante “Questionar”. Clique para filtrar matriz e ranking."
          onClick={() => toggleQuadrant('questionar')}
          active={state.quadrants.includes('questionar')}
        />
      </div>

      <ActiveFiltersBar
        chips={chips}
        onClearAll={clearAll}
        summary={`${filtered.length} de ${avaliaveis.length} ROs avaliáveis`}
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            Critérios da Matriz
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs leading-snug">
                O limite de esforço utiliza inicialmente a mediana dos esforços válidos da carga ({defaultEffortThreshold}).
                Ambos os limites são parâmetros gerenciais configuráveis — não vêm do arquivo importado.
              </TooltipContent>
            </Tooltip>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Alto impacto ≥</Label>
            <Input
              type="number"
              min={1}
              max={5}
              className="mt-1 w-24"
              value={impactThreshold}
              onChange={(e) => setState({ impactThreshold: Number(e.target.value) || DEFAULT_IMPACT_THRESHOLD })}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Alto esforço &gt;</Label>
            <Input
              type="number"
              className="mt-1 w-28"
              value={effort}
              onChange={(e) => setState({ effortThreshold: Number(e.target.value) })}
            />
          </div>
          {thresholdsAlterados && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setState({ impactThreshold: DEFAULT_IMPACT_THRESHOLD, effortThreshold: null })}
            >
              <RotateCcw className="mr-2 h-3.5 w-3.5" /> Restaurar padrão
            </Button>
          )}
          <div className="ml-auto flex flex-wrap gap-1.5">
            {(Object.keys(QUADRANTS) as QuadrantKey[]).map((k) => {
              const active = state.quadrants.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleQuadrant(k)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all',
                    active ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-border hover:border-primary/50',
                  )}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: QUADRANT_COLOR[k] }} />
                  {QUADRANTS[k].label}
                  <span className="tabular-nums font-semibold">{count(k)}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Matriz Impacto × Esforço</h3>
            <p className="text-[11px] text-muted-foreground">
              Clique em um ponto para abrir o detalhe da RO · clique nos chips para isolar quadrantes
            </p>
          </div>
          {avaliaveis.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma RO possui impacto e esforço suficientes para a matriz.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={460}>
              <ScatterChart margin={{ top: 16, right: 24, bottom: 34, left: 12 }}>
                <ReferenceArea x1={0} x2={effort} y1={impactThreshold} y2={5.4} fill={QUADRANT_BG['fazer-primeiro']} stroke="none"
                  label={{ value: 'FAZER PRIMEIRO', position: 'insideTopLeft', fill: 'hsl(var(--status-success))', fontSize: 10, fontWeight: 700 }} />
                <ReferenceArea x1={effort} x2={maxEsforco} y1={impactThreshold} y2={5.4} fill={QUADRANT_BG.investimento} stroke="none"
                  label={{ value: 'INVESTIMENTO ESTRATÉGICO', position: 'insideTopRight', fill: 'hsl(var(--primary))', fontSize: 10, fontWeight: 700 }} />
                <ReferenceArea x1={0} x2={effort} y1={0} y2={impactThreshold} fill={QUADRANT_BG.oportunidade} stroke="none"
                  label={{ value: 'OPORTUNIDADE', position: 'insideBottomLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 700 }} />
                <ReferenceArea x1={effort} x2={maxEsforco} y1={0} y2={impactThreshold} fill={QUADRANT_BG.questionar} stroke="none"
                  label={{ value: 'QUESTIONAR', position: 'insideBottomRight', fill: 'hsl(var(--status-warning))', fontSize: 10, fontWeight: 700 }} />
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  dataKey="esforco"
                  name="Esforço"
                  domain={[0, maxEsforco]}
                  tick={{ fill: '#000', fontSize: 11 }}
                  label={{ value: 'ESFORÇO', position: 'insideBottom', offset: -18, fill: '#000', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="impacto"
                  name="Impacto"
                  domain={[0, 5.4]}
                  ticks={[0, 1, 2, 3, 4, 5]}
                  tick={{ fill: '#000', fontSize: 11 }}
                  label={{ value: 'IMPACTO', angle: -90, position: 'insideLeft', fill: '#000', fontSize: 11 }}
                />
                <ZAxis type="number" dataKey="z" range={[60, 320]} />
                <ReferenceLine
                  x={effort}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="5 4"
                  label={{ value: `Alto esforço > ${effort}`, position: 'top', fill: 'hsl(var(--primary))', fontSize: 10 }}
                />
                <ReferenceLine
                  y={impactThreshold}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="5 4"
                  label={{ value: `Alto impacto ≥ ${impactThreshold}`, position: 'insideRight', fill: 'hsl(var(--primary))', fontSize: 10 }}
                />
                <RTooltip
                  content={({ payload }) => {
                    const p: any = payload?.[0]?.payload;
                    if (!p) return null;
                    const ro: SrRo = p.ro;
                    return (
                      <div className="max-w-xs rounded-lg border border-border bg-card p-2.5 text-xs shadow-lg">
                        <p className="font-semibold">
                          RO #{ro.numero} — {ro.titulo}
                        </p>
                        <p className="mt-1 text-muted-foreground">Épico: {ro.epico_nome ?? '—'}</p>
                        <p>Status: {getRoStatusDef(ro.status_key).label}</p>
                        <p>
                          Impacto: {cleanScaleLabel(ro.impacto)} · Urgência: {cleanScaleLabel(ro.urgencia)}
                        </p>
                        <p>
                          Grau: {ro.grau ?? '—'} · Esforço: {ro.esforco} · Valor/Esforço:{' '}
                          {p.vpe !== null ? p.vpe.toFixed(2) : '—'}
                        </p>
                        <p>Prioridade: {ro.prioridade ?? '—'}</p>
                        <p className="mt-1 font-medium" style={{ color: p.quadrant ? QUADRANT_COLOR[p.quadrant as QuadrantKey] : undefined }}>
                          {p.quadrant ? QUADRANTS[p.quadrant as QuadrantKey].label : 'Sem classificação'}
                        </p>
                        <p className="mt-1 text-[10px] text-primary">Clique para abrir detalhes</p>
                      </div>
                    );
                  }}
                />
                <Scatter
                  data={classified.map((x) => ({
                    esforco: x.ro.esforco,
                    impacto: x.ro.impacto_nivel,
                    z: x.ro.grau ?? 5,
                    ro: x.ro,
                    vpe: x.vpe,
                    quadrant: x.quadrant,
                    dim: filtered.length !== classified.length && !filtered.some((f) => f.ro.id === x.ro.id),
                  }))}
                  onClick={(p: any) => p?.ro && onSelectRo(p.ro)}
                  cursor="pointer"
                >
                  {classified.map((x, i) => {
                    const dim = filtered.length !== classified.length && !filtered.some((f) => f.ro.id === x.ro.id);
                    return (
                      <Cell
                        key={x.ro.id + i}
                        fill={x.quadrant ? QUADRANT_COLOR[x.quadrant] : 'hsl(var(--muted-foreground))'}
                        fillOpacity={dim ? 0.12 : 0.8}
                        stroke={x.ro.prioritario && !dim ? 'hsl(var(--destructive))' : 'transparent'}
                        strokeWidth={2}
                      />
                    );
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {comparados.length > 1 && (
        <Card className="border-primary/30">
          <CardContent className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">ROs selecionadas — {comparados.length} para comparação</p>
              <Button variant="ghost" size="sm" onClick={() => setState({ comparar: [] })}>
                Limpar seleção
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RO</TableHead>
                    <TableHead className="text-right">Impacto</TableHead>
                    <TableHead className="text-right">Esforço</TableHead>
                    <TableHead className="text-right">Grau</TableHead>
                    <TableHead className="text-right">Valor/Esforço</TableHead>
                    <TableHead>Classificação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparados.map(({ ro, vpe, quadrant }) => (
                    <TableRow key={ro.id}>
                      <TableCell className="max-w-[280px] truncate">#{ro.numero} {ro.titulo}</TableCell>
                      <TableCell className="text-right tabular-nums">{ro.impacto_nivel ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{ro.esforco ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{ro.grau ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{vpe !== null ? vpe.toFixed(2) : '—'}</TableCell>
                      <TableCell className="text-xs">{quadrant ? QUADRANTS[quadrant].label : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 p-3">
            <h3 className="text-sm font-semibold">Ranking de priorização</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-help items-center gap-1 text-[11px] text-muted-foreground underline decoration-dotted">
                  <Info className="h-3 w-3" /> Valor por Esforço
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs leading-snug">{VALOR_POR_ESFORCO_TOOLTIP}</TooltipContent>
            </Tooltip>
            <div className="relative ml-auto w-[240px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar RO, título ou épico"
                className="h-9 pl-8"
                value={state.busca}
                onChange={(e) => setState({ busca: e.target.value })}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCsv(
                  'status-report-priorizacao',
                  rows.map(({ ro, vpe, quadrant }) => ({
                    RO: ro.numero,
                    Titulo: ro.titulo,
                    Epico: ro.epico_nome,
                    Status: getRoStatusDef(ro.status_key).label,
                    Prioridade: ro.prioridade,
                    Impacto: ro.impacto,
                    Urgencia: ro.urgencia,
                    Grau: ro.grau,
                    Esforco: ro.esforco,
                    ValorPorEsforco: vpe !== null ? vpe.toFixed(2) : '',
                    Classificacao: quadrant ? QUADRANTS[quadrant].label : '',
                  })),
                )
              }
            >
              <Download className="mr-2 h-4 w-4" /> Exportar CSV
            </Button>
          </div>
          {rows.length === 0 ? (
            <div className="p-3">
              <EmptyState title="Nenhuma RO encontrada" onClear={clearAll} />
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead className="w-8" />
                    {sortBtn('numero', 'RO')}
                    {sortBtn('titulo', 'Título')}
                    {sortBtn('epico', 'Épico')}
                    {sortBtn('status', 'Status')}
                    <TableHead>Prioridade</TableHead>
                    {sortBtn('impacto', 'Impacto')}
                    {sortBtn('urgencia', 'Urgência')}
                    {sortBtn('grau', 'Grau', true)}
                    {sortBtn('esforco', 'Esforço', true)}
                    {sortBtn('vpe', 'Valor/Esforço', true)}
                    {sortBtn('classificacao', 'Classificação')}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ ro, vpe, quadrant }) => (
                    <TableRow key={ro.id} className="cursor-pointer" onClick={() => onSelectRo(ro)}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={state.comparar.includes(ro.id)}
                          onCheckedChange={() => toggleComparar(ro.id)}
                          aria-label={`Selecionar RO ${ro.numero} para comparação`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        #{ro.numero}
                        {ro.prioritario && <Badge className="ml-1 h-4 bg-destructive px-1 text-[9px]">P</Badge>}
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate">{ro.titulo}</TableCell>
                      <TableCell className="max-w-[160px] truncate text-muted-foreground">{ro.epico_nome ?? '—'}</TableCell>
                      <TableCell className="text-xs">{getRoStatusDef(ro.status_key).label}</TableCell>
                      <TableCell className="text-xs">{ro.prioridade ?? '—'}</TableCell>
                      <TableCell className="text-xs">{cleanScaleLabel(ro.impacto)}</TableCell>
                      <TableCell className="text-xs">{cleanScaleLabel(ro.urgencia)}</TableCell>
                      <TableCell className="text-right tabular-nums">{ro.grau ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{ro.esforco ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{vpe !== null ? vpe.toFixed(2) : '—'}</TableCell>
                      <TableCell>
                        {quadrant ? (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs">
                            <span className="h-2 w-2 rounded-full" style={{ background: QUADRANT_COLOR[quadrant] }} />
                            {QUADRANTS[quadrant].label}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
