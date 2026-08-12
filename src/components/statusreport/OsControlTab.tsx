import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/shared/MultiSelect';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import KpiCard from './KpiCard';
import OsDetailDrawer from './OsDetailDrawer';
import ActiveFiltersBar, { type FilterChip } from './ActiveFiltersBar';
import EmptyState from './EmptyState';
import {
  Search,
  Layers,
  Activity,
  CheckCircle2,
  Zap,
  ListTree,
  AlertTriangle,
  CalendarClock,
  LayoutGrid,
  Table2,
  ArrowUpDown,
  Download,
  Link2Off,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  isOsConcluida,
  osPrazoStatus,
  OS_PRAZO_LABEL,
  srNormalize as normalize,
  VINCULO_OS_RO_TOOLTIP,
  type OsPrazoKey,
} from '@/lib/statusReport/config';
import { downloadCsv } from '@/lib/statusReport/exportCsv';
import type { SrEpic, SrOs, SrRo } from '@/hooks/useStatusReport';

const uniq = (v: (string | null)[]) => Array.from(new Set(v.filter(Boolean) as string[])).sort();

export type OsKpi = 'andamento' | 'concluidas' | 'com-ros' | 'com-prioritarias' | null;

export interface OsTabState {
  busca: string;
  status: string[];
  responsavel: string[];
  subprojeto: string[];
  prazo: string[];
  kpi: OsKpi;
  view: 'cards' | 'tabela';
  sortKey: string;
  sortDir: 'asc' | 'desc';
  selectedId: string | null;
}

export const OS_TAB_INITIAL: OsTabState = {
  busca: '',
  status: [],
  responsavel: [],
  subprojeto: [],
  prazo: [],
  kpi: null,
  view: 'cards',
  sortKey: 'numero',
  sortDir: 'asc',
  selectedId: null,
};

const prazoTone: Record<OsPrazoKey, string> = {
  concluida: 'border-[hsl(var(--status-success))]/40 text-[hsl(var(--status-success))] bg-[hsl(var(--status-success))]/10',
  'no-prazo': 'border-[hsl(var(--status-success))]/40 text-[hsl(var(--status-success))] bg-[hsl(var(--status-success))]/10',
  proxima: 'border-[hsl(var(--status-warning))]/50 text-[hsl(var(--status-warning))] bg-[hsl(var(--status-warning))]/10',
  atrasada: 'border-destructive/40 text-destructive bg-destructive/10',
  'sem-previsao': 'border-border text-muted-foreground bg-muted/60',
};

const fmtDate = (d?: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR') : '—');

export default function OsControlTab({
  oss,
  ros,
  epics,
  state,
  setState,
  onSelectRo,
}: {
  oss: SrOs[];
  ros: SrRo[];
  epics: SrEpic[];
  state: OsTabState;
  setState: (patch: Partial<OsTabState>) => void;
  onSelectRo: (ro: SrRo) => void;
}) {
  const epicsByOsNumero = useMemo(() => {
    const m = new Map<number, SrEpic[]>();
    for (const e of epics) {
      if (e.source === 'jira' && e.numero_os !== null) {
        m.set(e.numero_os, [...(m.get(e.numero_os) || []), e]);
      }
    }
    return m;
  }, [epics]);

  const rosByEpicName = useMemo(() => {
    const m = new Map<string, SrRo[]>();
    for (const r of ros) {
      const k = normalize(r.epico_nome);
      if (!k) continue;
      m.set(k, [...(m.get(k) || []), r]);
    }
    return m;
  }, [ros]);

  const enriched = useMemo(
    () =>
      oss.map((os) => {
        const relEpics = os.numero !== null ? epicsByOsNumero.get(os.numero) || [] : [];
        const relRos = relEpics.flatMap((e) => rosByEpicName.get(normalize(e.titulo)) || []);
        const dedup = Array.from(new Map(relRos.map((r) => [r.id, r])).values());
        return {
          os,
          epics: relEpics,
          ros: dedup,
          prioritarias: dedup.filter((r) => r.prioritario).length,
          prazo: osPrazoStatus(os),
        };
      }),
    [oss, epicsByOsNumero, rosByEpicName],
  );

  /** Auditoria global do vínculo OS → Épico → RO (independe dos filtros) */
  const auditoria = useMemo(() => {
    const linked = new Set<string>();
    for (const e of enriched) for (const r of e.ros) linked.add(r.id);
    return { comVinculo: linked.size, semVinculo: ros.length - linked.size, total: ros.length };
  }, [enriched, ros.length]);

  // base = filtros explícitos (sem KPI), usado para calcular “x de y”
  const base = useMemo(() => {
    const q = normalize(state.busca);
    return enriched.filter(({ os, prazo }) => {
      if (state.status.length && !state.status.includes(os.status_canonico || os.status_atual || '—')) return false;
      if (state.responsavel.length && !state.responsavel.includes(os.responsavel || '—')) return false;
      if (state.subprojeto.length && !state.subprojeto.includes(os.subprojeto || '—')) return false;
      if (state.prazo.length && !state.prazo.includes(OS_PRAZO_LABEL[prazo].label)) return false;
      if (q && !normalize(`${os.numero} ${os.titulo}`).includes(q)) return false;
      return true;
    });
  }, [enriched, state.busca, state.status, state.responsavel, state.subprojeto, state.prazo]);

  const filtered = useMemo(() => {
    if (!state.kpi) return base;
    return base.filter((x) => {
      switch (state.kpi) {
        case 'andamento':
          return !isOsConcluida(x.os);
        case 'concluidas':
          return isOsConcluida(x.os);
        case 'com-ros':
          return x.ros.length > 0;
        case 'com-prioritarias':
          return x.prioritarias > 0;
        default:
          return true;
      }
    });
  }, [base, state.kpi]);

  const sorted = useMemo(() => {
    const dir = state.sortDir === 'asc' ? 1 : -1;
    const val = (x: (typeof filtered)[number]) => {
      switch (state.sortKey) {
        case 'titulo':
          return x.os.titulo || '';
        case 'status':
          return x.os.status_canonico || x.os.status_atual || '';
        case 'responsavel':
          return x.os.responsavel || '';
        case 'esforco':
          return x.os.quantidade_esforco ?? -1;
        case 'epicos':
          return x.epics.length;
        case 'ros':
          return x.ros.length;
        case 'prioritarias':
          return x.prioritarias;
        case 'prazo':
          return OS_PRAZO_LABEL[x.prazo].label;
        case 'previsao':
          return x.os.data_prevista_homologacao || '';
        default:
          return x.os.numero ?? -1;
      }
    };
    return [...filtered].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'pt-BR') * dir;
    });
  }, [filtered, state.sortKey, state.sortDir]);

  const totalEsforco = filtered.reduce((a, x) => a + (x.os.quantidade_esforco || 0), 0);
  const concluidas = filtered.filter((x) => isOsConcluida(x.os)).length;
  const totalRos = filtered.reduce((a, x) => a + x.ros.length, 0);
  const totalPrioritarias = filtered.reduce((a, x) => a + x.prioritarias, 0);
  const atrasadas = filtered.filter((x) => x.prazo === 'atrasada').length;

  const KPI_LABEL: Record<Exclude<OsKpi, null>, string> = {
    andamento: 'Em andamento',
    concluidas: 'Em homologação / faturamento',
    'com-ros': 'Com ROs relacionadas',
    'com-prioritarias': 'Com ROs prioritárias',
  };

  const chips: FilterChip[] = [
    ...(state.busca ? [{ id: 'busca', group: 'Busca', value: state.busca, onRemove: () => setState({ busca: '' }) }] : []),
    ...state.status.map((v) => ({ id: `s-${v}`, group: 'Status', value: v, onRemove: () => setState({ status: state.status.filter((x) => x !== v) }) })),
    ...state.responsavel.map((v) => ({ id: `r-${v}`, group: 'Responsável', value: v, onRemove: () => setState({ responsavel: state.responsavel.filter((x) => x !== v) }) })),
    ...state.subprojeto.map((v) => ({ id: `sp-${v}`, group: 'Subprojeto', value: v, onRemove: () => setState({ subprojeto: state.subprojeto.filter((x) => x !== v) }) })),
    ...state.prazo.map((v) => ({ id: `p-${v}`, group: 'Prazo', value: v, onRemove: () => setState({ prazo: state.prazo.filter((x) => x !== v) }) })),
    ...(state.kpi ? [{ id: 'kpi', group: 'Indicador', value: KPI_LABEL[state.kpi], onRemove: () => setState({ kpi: null }) }] : []),
  ];

  const clearAll = () =>
    setState({ busca: '', status: [], responsavel: [], subprojeto: [], prazo: [], kpi: null });

  const toggleKpi = (k: Exclude<OsKpi, null>) => setState({ kpi: state.kpi === k ? null : k });

  const sortBtn = (key: string, label: string, right = false) => (
    <TableHead className={right ? 'text-right' : undefined}>
      <button
        className={cn('inline-flex items-center gap-1 hover:text-foreground', state.sortKey === key && 'text-foreground font-semibold')}
        onClick={() => setState({ sortKey: key, sortDir: state.sortKey === key && state.sortDir === 'asc' ? 'desc' : 'asc' })}
      >
        {label} <ArrowUpDown className="h-3 w-3 opacity-50" />
      </button>
    </TableHead>
  );

  if (!oss.length) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          Nenhuma OS importada ainda. Use “Importar Status Report” para carregar os dados.
        </CardContent>
      </Card>
    );
  }

  const selected = oss.find((o) => o.id === state.selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Total de OSs" value={filtered.length} tone="primary" icon={<Layers className="h-4 w-4" />}
          sub={base.length !== oss.length || state.kpi ? `${filtered.length} de ${oss.length} OSs` : undefined} />
        <KpiCard
          label="Em andamento"
          value={filtered.length - concluidas}
          icon={<Activity className="h-4 w-4" />}
          hint="OSs que ainda não atingiram homologação/faturamento. Clique para filtrar."
          onClick={() => toggleKpi('andamento')}
          active={state.kpi === 'andamento'}
          sub={atrasadas ? `${atrasadas} atrasada(s)` : undefined}
        />
        <KpiCard
          label="Em homologação / faturamento"
          value={concluidas}
          tone="success"
          icon={<CheckCircle2 className="h-4 w-4" />}
          hint="OSs já homologadas, em homologação ou faturadas. Clique para filtrar."
          onClick={() => toggleKpi('concluidas')}
          active={state.kpi === 'concluidas'}
        />
        <KpiCard
          label="Esforço associado"
          value={totalEsforco.toLocaleString('pt-BR')}
          icon={<Zap className="h-4 w-4" />}
          hint="Soma da quantidade de esforço das OSs no universo filtrado."
        />
        <KpiCard
          label="ROs relacionadas"
          value={totalRos}
          icon={<ListTree className="h-4 w-4" />}
          hint={VINCULO_OS_RO_TOOLTIP}
          onClick={() => toggleKpi('com-ros')}
          active={state.kpi === 'com-ros'}
          sub={
            auditoria.semVinculo > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Link2Off className="h-3 w-3" /> {auditoria.semVinculo} de {auditoria.total} ROs sem vínculo direto com OS
              </span>
            ) : undefined
          }
        />
        <KpiCard
          label="ROs prioritárias"
          value={totalPrioritarias}
          tone="danger"
          icon={<AlertTriangle className="h-4 w-4" />}
          hint="ROs marcadas como prioritárias entre as ROs vinculadas às OSs filtradas. Clique para ver apenas OSs com ROs prioritárias."
          onClick={() => toggleKpi('com-prioritarias')}
          active={state.kpi === 'com-prioritarias'}
        />
      </div>

      <ActiveFiltersBar chips={chips} onClearAll={clearAll} summary={`${filtered.length} de ${oss.length} OSs`} />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número ou título"
              className="pl-8"
              value={state.busca}
              onChange={(e) => setState({ busca: e.target.value })}
            />
          </div>
          <MultiSelect
            className="w-[190px]"
            placeholder="Status"
            options={uniq(oss.map((o) => o.status_canonico || o.status_atual || '—')).map((v) => ({ value: v, label: v }))}
            value={state.status}
            onChange={(v) => setState({ status: v })}
          />
          <MultiSelect
            className="w-[160px]"
            placeholder="Responsável"
            options={uniq(oss.map((o) => o.responsavel || '—')).map((v) => ({ value: v, label: v }))}
            value={state.responsavel}
            onChange={(v) => setState({ responsavel: v })}
          />
          <MultiSelect
            className="w-[180px]"
            placeholder="Subprojeto"
            options={uniq(oss.map((o) => o.subprojeto || '—')).map((v) => ({ value: v, label: v }))}
            value={state.subprojeto}
            onChange={(v) => setState({ subprojeto: v })}
          />
          <MultiSelect
            className="w-[180px]"
            placeholder="Prazo"
            options={Object.values(OS_PRAZO_LABEL).map((v) => ({ value: v.label, label: v.label }))}
            value={state.prazo}
            onChange={(v) => setState({ prazo: v })}
          />
          <div className="ml-auto flex items-center gap-1 rounded-md border border-border p-0.5">
            <Button
              variant={state.view === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => setState({ view: 'cards' })}
              aria-label="Visualizar em cards"
            >
              <LayoutGrid className="mr-1 h-3.5 w-3.5" /> Cards
            </Button>
            <Button
              variant={state.view === 'tabela' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => setState({ view: 'tabela' })}
              aria-label="Visualizar em tabela"
            >
              <Table2 className="mr-1 h-3.5 w-3.5" /> Tabela
            </Button>
          </div>
          {chips.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Limpar filtros
            </Button>
          )}
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhuma OS encontrada" onClear={clearAll} />
      ) : state.view === 'cards' ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map(({ os, epics: relEpics, ros: relRos, prioritarias, prazo }) => (
            <button key={os.id} className="text-left" onClick={() => setState({ selectedId: os.id })}>
              <Card className="group h-full border-border transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
                <CardContent className="space-y-2.5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">OS #{os.numero ?? '—'}</p>
                    <div className="flex shrink-0 items-center gap-1">
                      {os.responsavel && (
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                          {os.responsavel}
                        </Badge>
                      )}
                      <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px]', prazoTone[prazo])}>
                        {OS_PRAZO_LABEL[prazo].label}
                      </Badge>
                    </div>
                  </div>
                  <p className="font-semibold leading-snug group-hover:text-primary">{os.titulo ?? 'Sem título'}</p>
                  <Badge variant="secondary" className="font-normal">
                    {os.status_canonico || os.status_atual || '—'}
                  </Badge>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-border pt-2.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" /> Esforço{' '}
                      <b className="text-foreground">{os.quantidade_esforco_fmt || os.quantidade_esforco || '—'}</b>
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="h-3 w-3" /> Épicos <b className="text-foreground">{relEpics.length}</b>
                    </span>
                    <span className="flex items-center gap-1">
                      <ListTree className="h-3 w-3" /> ROs <b className="text-foreground">{relRos.length}</b>
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Prioritárias{' '}
                      <b className={cn(prioritarias > 0 ? 'text-destructive' : 'text-foreground')}>{prioritarias}</b>
                    </span>
                    {os.data_prevista_homologacao && (
                      <span className="col-span-2 flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" /> Homologação{' '}
                        <b className="text-foreground">{fmtDate(os.data_prevista_homologacao)}</b>
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-2 p-3">
              <p className="text-sm font-semibold">Visão analítica das OSs</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadCsv(
                    'status-report-oss',
                    sorted.map(({ os, epics: e, ros: r, prioritarias, prazo }) => ({
                      OS: os.numero,
                      Titulo: os.titulo,
                      Status: os.status_canonico || os.status_atual,
                      Responsavel: os.responsavel,
                      Subprojeto: os.subprojeto,
                      Esforco: os.quantidade_esforco,
                      Epicos: e.length,
                      ROs: r.length,
                      Prioritarias: prioritarias,
                      Prazo: OS_PRAZO_LABEL[prazo].label,
                      PrevisaoHomologacao: os.data_prevista_homologacao ?? '',
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
                    {sortBtn('numero', 'OS')}
                    {sortBtn('titulo', 'Título')}
                    {sortBtn('status', 'Status')}
                    {sortBtn('responsavel', 'Responsável')}
                    {sortBtn('esforco', 'Esforço', true)}
                    {sortBtn('epicos', 'Épicos', true)}
                    {sortBtn('ros', 'ROs', true)}
                    {sortBtn('prioritarias', 'Prior.', true)}
                    {sortBtn('prazo', 'Prazo')}
                    {sortBtn('previsao', 'Previsão')}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map(({ os, epics: relEpics, ros: relRos, prioritarias, prazo }) => (
                    <TableRow key={os.id} className="cursor-pointer" onClick={() => setState({ selectedId: os.id })}>
                      <TableCell className="font-medium">#{os.numero ?? '—'}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{os.titulo}</TableCell>
                      <TableCell className="text-xs">{os.status_canonico || os.status_atual || '—'}</TableCell>
                      <TableCell className="text-xs">{os.responsavel ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{os.quantidade_esforco ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{relEpics.length}</TableCell>
                      <TableCell className="text-right tabular-nums">{relRos.length}</TableCell>
                      <TableCell className="text-right tabular-nums">{prioritarias}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px]', prazoTone[prazo])}>
                          {OS_PRAZO_LABEL[prazo].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{fmtDate(os.data_prevista_homologacao)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help underline decoration-dotted">Como o vínculo OS → RO é calculado?</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm text-xs leading-snug">{VINCULO_OS_RO_TOOLTIP}</TooltipContent>
        </Tooltip>
        · {auditoria.comVinculo} de {auditoria.total} ROs possuem vínculo confiável com alguma OS.
      </p>

      <OsDetailDrawer
        os={selected}
        epics={epics}
        ros={ros}
        onClose={() => setState({ selectedId: null })}
        onSelectRo={onSelectRo}
      />
    </div>
  );
}
