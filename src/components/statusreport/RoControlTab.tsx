import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/shared/MultiSelect';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import KpiCard from './KpiCard';
import ActiveFiltersBar, { type FilterChip } from './ActiveFiltersBar';
import EmptyState from './EmptyState';
import {
  Search,
  ListTree,
  Database,
  Flag,
  AlertTriangle,
  Activity,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Columns3,
  Table2,
  ArrowUpDown,
  Download,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  cleanScaleLabel,
  COMMITTED_STATUS_KEYS,
  CRITICA_TOOLTIP,
  isRoCritica,
  RO_STATUS_WORKFLOW,
  getRoStatusDef,
  STAGE_ACCENT,
  srNormalize as normalize,
} from '@/lib/statusReport/config';
import { downloadCsv } from '@/lib/statusReport/exportCsv';
import type { SrRo } from '@/hooks/useStatusReport';

const uniq = (v: (string | null)[]) => Array.from(new Set(v.filter(Boolean) as string[])).sort();
const sum = (arr: (number | null)[]) => arr.reduce((a, x) => a + (x || 0), 0);

export type RoKpi = 'carga-atual' | 'prioritarias' | 'criticas' | 'andamento' | 'homologacao' | 'producao' | null;

export interface RoTabState {
  busca: string;
  filtros: Record<string, string[]>;
  kpi: RoKpi;
  statusKey: string | null;
  view: 'kanban' | 'lista';
  sortKey: string;
  sortDir: 'asc' | 'desc';
}

export const RO_TAB_INITIAL: RoTabState = {
  busca: '',
  filtros: {},
  kpi: null,
  statusKey: null,
  view: 'kanban',
  sortKey: 'grau',
  sortDir: 'desc',
};

const FILTER_DEFS: [string, string, (r: SrRo) => string | null][] = [
  ['epico', 'Épico', (r) => r.epico_nome],
  ['status', 'Status', (r) => getRoStatusDef(r.status_key).label],
  ['tipo', 'Tipo', (r) => r.tipo],
  ['validacao', 'Validação', (r) => r.tipo_validacao],
  ['prioridade', 'Prioridade', (r) => r.prioridade],
  ['impacto', 'Impacto', (r) => r.impacto],
  ['urgencia', 'Urgência', (r) => r.urgencia],
  ['solicitante', 'Solicitante', (r) => r.solicitante],
  ['subprojeto', 'Subprojeto', (r) => r.subprojeto],
];

const KPI_LABEL: Record<Exclude<RoKpi, null>, string> = {
  'carga-atual': 'Na carga atual',
  prioritarias: 'Prioritárias',
  criticas: 'Críticas',
  andamento: 'Em andamento',
  homologacao: 'Em homologação',
  producao: 'Produção / Concluído',
};

export default function RoControlTab({
  ros,
  prevStatusCounts,
  state,
  setState,
  onSelectRo,
}: {
  ros: SrRo[];
  prevStatusCounts: Record<string, number> | null;
  state: RoTabState;
  setState: (patch: Partial<RoTabState>) => void;
  onSelectRo: (ro: SrRo) => void;
}) {
  const [unmappedOpen, setUnmappedOpen] = useState(false);
  const get = (k: string) => state.filtros[k] || [];
  const setFiltro = (k: string) => (v: string[]) => setState({ filtros: { ...state.filtros, [k]: v } });

  /** universo com filtros explícitos (selects + busca), sem KPI */
  const base = useMemo(() => {
    const q = normalize(state.busca);
    return ros.filter((r) => {
      for (const [key, , accessor] of FILTER_DEFS) {
        const sel = get(key);
        if (sel.length && !sel.includes(accessor(r) || '—')) return false;
      }
      const prio = get('prioritario');
      if (prio.length) {
        if (r.prioritario && !prio.includes('Sim')) return false;
        if (!r.prioritario && !prio.includes('Não')) return false;
      }
      if (q && !normalize(`${r.numero} ${r.titulo} ${r.sydle_id}`).includes(q)) return false;
      return true;
    });
  }, [ros, state.busca, state.filtros]);

  const filtered = useMemo(() => {
    let out = base;
    if (state.kpi) {
      out = out.filter((r) => {
        switch (state.kpi) {
          case 'carga-atual':
            return r.is_present_current_import;
          case 'prioritarias':
            return r.prioritario;
          case 'criticas':
            return isRoCritica(r);
          case 'andamento':
            return COMMITTED_STATUS_KEYS.includes(r.status_key);
          case 'homologacao':
            return r.status_key === 'homologacao-validacao';
          case 'producao':
            return r.status_key === 'producao-concluido';
          default:
            return true;
        }
      });
    }
    if (state.statusKey) out = out.filter((r) => r.status_key === state.statusKey);
    return out;
  }, [base, state.kpi, state.statusKey]);

  const columns = useMemo(() => {
    const map = new Map<string, SrRo[]>();
    for (const r of filtered) map.set(r.status_key, [...(map.get(r.status_key) || []), r]);
    return RO_STATUS_WORKFLOW.filter((s) => (map.get(s.key) || []).length > 0 || s.key !== 'outros').map((s) => ({
      def: s,
      items: (map.get(s.key) || []).sort(
        (a, b) => Number(b.prioritario) - Number(a.prioritario) || (b.grau || 0) - (a.grau || 0),
      ),
    }));
  }, [filtered]);

  const lista = useMemo(() => {
    const dir = state.sortDir === 'asc' ? 1 : -1;
    const val = (r: SrRo) => {
      switch (state.sortKey) {
        case 'numero':
          return r.numero ?? -1;
        case 'titulo':
          return r.titulo || '';
        case 'epico':
          return r.epico_nome || '';
        case 'status':
          return r.status_ordem ?? 99;
        case 'impacto':
          return r.impacto_nivel ?? -1;
        case 'urgencia':
          return r.urgencia_nivel ?? -1;
        case 'esforco':
          return r.esforco ?? -1;
        case 'tempo':
          return r.tempo_estimado_horas ?? -1;
        default:
          return r.grau ?? -1;
      }
    };
    return [...filtered].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'pt-BR') * dir;
    });
  }, [filtered, state.sortKey, state.sortDir]);

  const emAndamento = filtered.filter((r) => COMMITTED_STATUS_KEYS.includes(r.status_key));
  const homologacao = filtered.filter((r) => r.status_key === 'homologacao-validacao');
  const producao = filtered.filter((r) => r.status_key === 'producao-concluido');
  const criticas = filtered.filter((r) => isRoCritica(r));

  const unmapped = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of ros) if (r.status_key === 'outros') m.set(r.status || '—', (m.get(r.status || '—') || 0) + 1);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [ros]);
  const unmappedTotal = unmapped.reduce((a, x) => a + x[1], 0);

  const delta = (key: string, current: number) => (prevStatusCounts ? current - (prevStatusCounts[key] || 0) : null);

  const chips: FilterChip[] = [
    ...(state.busca ? [{ id: 'busca', group: 'Busca', value: state.busca, onRemove: () => setState({ busca: '' }) }] : []),
    ...Object.entries(state.filtros).flatMap(([k, vals]) =>
      (vals || []).map((v) => ({
        id: `${k}-${v}`,
        group: (FILTER_DEFS.find((d) => d[0] === k)?.[1] ?? (k === 'prioritario' ? 'Prioritário' : k)) as string,
        value: v,
        onRemove: () => setState({ filtros: { ...state.filtros, [k]: (state.filtros[k] || []).filter((x) => x !== v) } }),
      })),
    ),
    ...(state.kpi ? [{ id: 'kpi', group: 'Indicador', value: KPI_LABEL[state.kpi], onRemove: () => setState({ kpi: null }) }] : []),
    ...(state.statusKey
      ? [{ id: 'sk', group: 'Coluna', value: getRoStatusDef(state.statusKey).label, onRemove: () => setState({ statusKey: null }) }]
      : []),
  ];

  const clearAll = () => setState({ busca: '', filtros: {}, kpi: null, statusKey: null });
  const toggleKpi = (k: Exclude<RoKpi, null>) => setState({ kpi: state.kpi === k ? null : k });

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
          Nenhum RO importado ainda. Use “Importar Status Report” para carregar os dados.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        <KpiCard
          label="Total de ROs"
          value={filtered.length}
          tone="primary"
          icon={<ListTree className="h-4 w-4" />}
          sub={filtered.length !== ros.length ? `${filtered.length} de ${ros.length} ROs` : undefined}
        />
        <KpiCard
          label="Na carga atual"
          value={filtered.filter((r) => r.is_present_current_import).length}
          icon={<Database className="h-4 w-4" />}
          hint="ROs presentes na última importação. Clique para filtrar."
          onClick={() => toggleKpi('carga-atual')}
          active={state.kpi === 'carga-atual'}
        />
        <KpiCard
          label="Prioritárias"
          value={filtered.filter((r) => r.prioritario).length}
          tone="danger"
          icon={<Flag className="h-4 w-4" />}
          hint="ROs marcadas como prioritárias na origem. Clique para filtrar."
          onClick={() => toggleKpi('prioritarias')}
          active={state.kpi === 'prioritarias'}
        />
        <KpiCard
          label="Críticas"
          value={criticas.length}
          tone="warning"
          icon={<AlertTriangle className="h-4 w-4" />}
          hint={`${CRITICA_TOOLTIP} Clique para filtrar.`}
          onClick={() => toggleKpi('criticas')}
          active={state.kpi === 'criticas'}
        />
        <KpiCard
          label="Em andamento"
          value={emAndamento.length}
          icon={<Activity className="h-4 w-4" />}
          hint="Status considerados esforço comprometido (da análise até homologado/resolvido). Clique para filtrar."
          onClick={() => toggleKpi('andamento')}
          active={state.kpi === 'andamento'}
        />
        <KpiCard
          label="Em homologação"
          value={homologacao.length}
          icon={<ShieldCheck className="h-4 w-4" />}
          delta={delta('homologacao-validacao', homologacao.length)}
          hint="ROs em homologação/validação pelo cliente. Clique para filtrar."
          onClick={() => toggleKpi('homologacao')}
          active={state.kpi === 'homologacao'}
        />
        <KpiCard
          label="Produção / Concluído"
          value={producao.length}
          tone="success"
          icon={<CheckCircle2 className="h-4 w-4" />}
          delta={delta('producao-concluido', producao.length)}
          hint="ROs entregues em produção. Clique para filtrar."
          onClick={() => toggleKpi('producao')}
          active={state.kpi === 'producao'}
        />
        <KpiCard
          label="Esforço aberto"
          value={sum(emAndamento.map((r) => r.esforco)).toLocaleString('pt-BR')}
          icon={<Zap className="h-4 w-4" />}
          sub={`${sum(emAndamento.map((r) => r.tempo_estimado_horas)).toLocaleString('pt-BR')}h estimadas`}
          hint="Soma do esforço das ROs em status comprometido dentro do universo filtrado."
        />
      </div>

      <ActiveFiltersBar chips={chips} onClearAll={clearAll} summary={`${filtered.length} de ${ros.length} ROs`} />

      <Card className="sticky top-0 z-20">
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, título ou Sydle ID"
              className="pl-8"
              value={state.busca}
              onChange={(e) => setState({ busca: e.target.value })}
            />
          </div>
          {FILTER_DEFS.map(([key, label, accessor]) => (
            <MultiSelect
              key={key}
              className="w-[155px]"
              placeholder={label}
              options={(key === 'status' ? RO_STATUS_WORKFLOW.map((s) => s.label) : uniq(ros.map(accessor))).map((v) => ({
                value: v,
                label: v,
              }))}
              value={get(key)}
              onChange={setFiltro(key)}
            />
          ))}
          <MultiSelect
            className="w-[135px]"
            placeholder="Prioritário"
            options={[
              { value: 'Sim', label: 'Sim' },
              { value: 'Não', label: 'Não' },
            ]}
            value={get('prioritario')}
            onChange={setFiltro('prioritario')}
          />
          <div className="ml-auto flex items-center gap-1 rounded-md border border-border p-0.5">
            <Button
              variant={state.view === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => setState({ view: 'kanban' })}
              aria-label="Visualizar em kanban"
            >
              <Columns3 className="mr-1 h-3.5 w-3.5" /> Kanban
            </Button>
            <Button
              variant={state.view === 'lista' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => setState({ view: 'lista' })}
              aria-label="Visualizar em lista"
            >
              <Table2 className="mr-1 h-3.5 w-3.5" /> Lista
            </Button>
          </div>
          {chips.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Limpar filtros
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {!prevStatusCounts && <span>Primeira carga — histórico ainda não disponível para comparação.</span>}
        {unmappedTotal > 0 && (
          <button
            className="inline-flex items-center gap-1 underline decoration-dotted hover:text-foreground"
            onClick={() => setUnmappedOpen(true)}
          >
            <Info className="h-3.5 w-3.5" /> {unmappedTotal} ROs com status não mapeado
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhum RO encontrado" onClear={clearAll} />
      ) : state.view === 'kanban' ? (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {columns.map(({ def, items }) => (
            <div key={def.key} className="w-[300px] shrink-0">
              <div
                className={cn(
                  'cursor-pointer rounded-t-lg border border-b-0 border-border bg-muted/40 px-3 pb-2 pt-0 transition-colors hover:bg-muted/70',
                  state.statusKey === def.key && 'bg-primary/[0.06] border-primary/40',
                )}
                onClick={() => setState({ statusKey: state.statusKey === def.key ? null : def.key })}
              >
                <span className={cn('mb-2 block h-1 rounded-b', STAGE_ACCENT[def.key] || 'bg-muted-foreground/30')} />
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[11px] font-bold uppercase tracking-wide">{def.label}</p>
                  <Badge variant="secondary" className="tabular-nums">
                    {items.length}
                  </Badge>
                </div>
                <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-0.5">
                    <Zap className="h-3 w-3" /> {sum(items.map((r) => r.esforco)).toLocaleString('pt-BR')}
                  </span>
                  <span>· {sum(items.map((r) => r.tempo_estimado_horas)).toLocaleString('pt-BR')}h</span>
                  {prevStatusCounts && (
                    <span className="ml-auto">
                      {(() => {
                        const d = items.length - (prevStatusCounts[def.key] || 0);
                        if (d === 0) return null;
                        return (
                          <span className={d > 0 ? 'text-[hsl(var(--status-success))]' : 'text-destructive'}>
                            {d > 0 ? '↑' : '↓'} {Math.abs(d)}
                          </span>
                        );
                      })()}
                    </span>
                  )}
                </p>
              </div>
              <div className="max-h-[62vh] space-y-2 overflow-y-auto rounded-b-lg border border-border bg-background/60 p-2">
                {items.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Nenhum RO</p>}
                {items.map((r) => {
                  const critica = isRoCritica(r);
                  return (
                    <button
                      key={r.id}
                      onClick={() => onSelectRo(r)}
                      className={cn(
                        'relative w-full overflow-hidden rounded-lg border border-border bg-card p-2.5 pl-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm',
                        r.prioritario && 'border-destructive/40',
                      )}
                    >
                      {(critica || r.prioritario) && (
                        <span
                          className={cn(
                            'absolute inset-y-0 left-0 w-1',
                            r.prioritario ? 'bg-destructive' : 'bg-[hsl(var(--status-warning))]',
                          )}
                        />
                      )}
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[11px] font-bold text-primary">#{r.numero ?? '—'}</span>
                        {r.prioritario && (
                          <Badge className="h-4 bg-destructive px-1 text-[9px] uppercase text-destructive-foreground">
                            Prioritário
                          </Badge>
                        )}
                        {critica && !r.prioritario && (
                          <Badge variant="outline" className="h-4 border-[hsl(var(--status-warning))]/50 px-1 text-[9px] uppercase text-[hsl(var(--status-warning))]">
                            Crítica
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[13px] font-medium leading-snug">{r.titulo ?? 'Sem título'}</p>
                      {r.epico_nome && <p className="mt-1 truncate text-[10px] text-muted-foreground">{r.epico_nome}</p>}
                      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                        <span>Impacto: <b className="text-foreground">{cleanScaleLabel(r.impacto)}</b></span>
                        <span>Urgência: <b className="text-foreground">{cleanScaleLabel(r.urgencia)}</b></span>
                        {r.grau !== null && <span>Grau: <b className="text-foreground">{r.grau}</b></span>}
                        {r.esforco !== null && (
                          <span className="inline-flex items-center gap-0.5">
                            <Zap className="h-2.5 w-2.5" /> <b className="text-foreground">{r.esforco}</b>
                          </span>
                        )}
                        {r.tempo_estimado_horas !== null && <span>{r.tempo_estimado_horas}h</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-2 p-3">
              <p className="text-sm font-semibold">Lista analítica de ROs</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadCsv(
                    'status-report-ros',
                    lista.map((r) => ({
                      RO: r.numero,
                      Titulo: r.titulo,
                      Epico: r.epico_nome,
                      Status: getRoStatusDef(r.status_key).label,
                      StatusOriginal: r.status,
                      Prioridade: r.prioridade,
                      Prioritario: r.prioritario ? 'Sim' : 'Não',
                      Impacto: r.impacto,
                      Urgencia: r.urgencia,
                      Grau: r.grau,
                      Esforco: r.esforco,
                      Horas: r.tempo_estimado_horas,
                      Subprojeto: r.subprojeto,
                    })),
                  )
                }
              >
                <Download className="mr-2 h-4 w-4" /> Exportar CSV
              </Button>
            </div>
            <div className="max-h-[65vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    {sortBtn('numero', 'RO')}
                    {sortBtn('titulo', 'Título')}
                    {sortBtn('epico', 'Épico')}
                    {sortBtn('status', 'Status')}
                    <TableHead>Prioridade</TableHead>
                    {sortBtn('impacto', 'Impacto')}
                    {sortBtn('urgencia', 'Urgência')}
                    {sortBtn('grau', 'Grau', true)}
                    {sortBtn('esforco', 'Esforço', true)}
                    {sortBtn('tempo', 'Horas', true)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => onSelectRo(r)}>
                      <TableCell className="font-medium">
                        #{r.numero ?? '—'}
                        {r.prioritario && <Badge className="ml-1 h-4 bg-destructive px-1 text-[9px]">P</Badge>}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">{r.titulo}</TableCell>
                      <TableCell className="max-w-[160px] truncate text-muted-foreground">{r.epico_nome ?? '—'}</TableCell>
                      <TableCell className="text-xs">{getRoStatusDef(r.status_key).label}</TableCell>
                      <TableCell className="text-xs">{r.prioridade ?? '—'}</TableCell>
                      <TableCell className="text-xs">{cleanScaleLabel(r.impacto)}</TableCell>
                      <TableCell className="text-xs">{cleanScaleLabel(r.urgencia)}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.grau ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.esforco ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.tempo_estimado_horas ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={unmappedOpen} onOpenChange={setUnmappedOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Status originais não mapeados</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Estes status vindos do Status Report não possuem regra explícita de normalização e por isso são agrupados em
            “Outros”. O status original é sempre preservado — nada é descartado nem convertido por suposição.
          </p>
          <div className="max-h-[50vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status original</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unmapped.map(([s, n]) => (
                  <TableRow key={s}>
                    <TableCell>{s}</TableCell>
                    <TableCell className="text-right tabular-nums">{n}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
