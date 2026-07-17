import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/shared/MultiSelect';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  X, Filter, Loader2, Target, ClipboardList, TrendingUp, Users,
  CheckCircle2, Clock, AlertTriangle, CircleDashed, Ban,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LabelList,
} from 'recharts';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Objetivo { id: string; objetivo: string; ciclo: string; responsavel: string | null; status: string | null; }
interface KR {
  id: string; objetivo_id: string; kr: string; codigo: string | null;
  responsavel: string | null; status: string | null; percentual: number | null;
  lider: string | null; equipe: string | null;
}
interface Acao {
  id: string; key_result_id: string; acao: string; responsavel: string | null;
  status: string | null; prazo: string | null;
}

const STATUS_ORDER = ['Concluído', 'Em andamento', 'Atrasado', 'A iniciar', 'Cancelado'];

const STATUS_COLORS: Record<string, string> = {
  'Concluído': 'hsl(152 76% 40%)',
  'Em andamento': 'hsl(38 95% 52%)',
  'Atrasado': 'hsl(0 78% 58%)',
  'A iniciar': 'hsl(217 20% 62%)',
  'Cancelado': 'hsl(0 0% 45%)',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  'Concluído': <CheckCircle2 className="h-4 w-4" />,
  'Em andamento': <Clock className="h-4 w-4" />,
  'Atrasado': <AlertTriangle className="h-4 w-4" />,
  'A iniciar': <CircleDashed className="h-4 w-4" />,
  'Cancelado': <Ban className="h-4 w-4" />,
};

const normalizeStatus = (s: string | null | undefined): string => {
  if (!s) return 'A iniciar';
  const n = s.toLowerCase().trim();
  if (['concluído', 'concluido'].includes(n)) return 'Concluído';
  if (['em andamento'].includes(n)) return 'Em andamento';
  if (['atrasado', 'crítico', 'critico'].includes(n)) return 'Atrasado';
  if (['a iniciar', 'pendente', 'não iniciado', 'nao iniciado'].includes(n)) return 'A iniciar';
  if (['cancelado'].includes(n)) return 'Cancelado';
  return s;
};

const colorFor = (status: string) => STATUS_COLORS[status] || 'hsl(215 16% 47%)';
const truncate = (s: string, n = 16) => (s.length > n ? s.slice(0, n) + '…' : s);
const pctColor = (v: number) =>
  v >= 80 ? STATUS_COLORS['Concluído'] : v >= 40 ? STATUS_COLORS['Em andamento'] : STATUS_COLORS['Atrasado'];

interface StatCardProps {
  label: string;
  value: number | string;
  color?: string;
  icon?: React.ReactNode;
  accent?: boolean;
}
function StatCard({ label, value, color, icon, accent }: StatCardProps) {
  return (
    <div
      className="relative rounded-lg border border-border/60 bg-card p-3 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
    >
      {color && (
        <span
          className="absolute left-0 top-0 h-full w-[3px]"
          style={{ background: color }}
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground truncate">
            {label}
          </p>
          <p
            className="mt-0.5 text-xl font-semibold tracking-tight tabular-nums leading-tight"
            style={color && accent ? { color } : undefined}
          >
            {value}
          </p>
        </div>
        {icon && (
          <div
            className="shrink-0 rounded-full p-1.5"
            style={{
              background: color ? `${color.replace('hsl', 'hsl').replace(')', ' / 0.12)')}` : 'hsl(var(--primary) / 0.10)',
              color: color || 'hsl(var(--primary))',
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground shrink-0">
        {children}
      </h3>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover/95 backdrop-blur px-3 py-2 shadow-lg text-xs">
      {label !== undefined && <p className="font-medium text-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function OKRDashboardGerencial({ open, onClose }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [krs, setKrs] = useState<KR[]>([]);
  const [acoes, setAcoes] = useState<Acao[]>([]);

  // Filtros globais (multi-seleção)
  const [fObjetivo, setFObjetivo] = useState<string[]>([]);
  const [fLider, setFLider] = useState<string[]>([]);
  const [fEquipe, setFEquipe] = useState<string[]>([]);
  const [fRespAcao, setFRespAcao] = useState<string[]>([]);

  // Filtros de gráficos
  const [statusKrEquipe, setStatusKrEquipe] = useState('all');
  const [statusKrLider, setStatusKrLider] = useState('all');

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const [o, k, a] = await Promise.all([
        supabase.from('okr_objetivos').select('id,objetivo,ciclo,responsavel,status'),
        supabase.from('okr_key_results').select('id,objetivo_id,kr,codigo,responsavel,status,percentual,lider,equipe'),
        supabase.from('okr_acoes').select('id,key_result_id,acao,responsavel,status,prazo'),
      ]);
      if (o.error || k.error || a.error) {
        toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
      }
      setObjetivos((o.data as Objetivo[]) || []);
      setKrs((k.data as KR[]) || []);
      setAcoes((a.data as Acao[]) || []);
      setLoading(false);
    };
    load();
  }, [open, toast]);

  const uniq = (arr: (string | null | undefined)[]) =>
    Array.from(new Set(arr.filter((v): v is string => !!v && v.trim() !== ''))).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const lideres = useMemo(() => uniq(krs.map(k => k.lider)), [krs]);
  const equipes = useMemo(() => uniq(krs.map(k => k.equipe)), [krs]);
  const respAcoes = useMemo(() => uniq(acoes.map(a => a.responsavel)), [acoes]);

  const inSel = (sel: string[], val: string | null | undefined) =>
    sel.length === 0 || (val != null && sel.includes(val));

  const filteredKrs = useMemo(() => krs.filter(k => {
    if (!inSel(fObjetivo, k.objetivo_id)) return false;
    if (!inSel(fLider, k.lider)) return false;
    if (!inSel(fEquipe, k.equipe)) return false;
    if (fRespAcao.length > 0) {
      const has = acoes.some(a => a.key_result_id === k.id && a.responsavel && fRespAcao.includes(a.responsavel));
      if (!has) return false;
    }
    return true;
  }), [krs, acoes, fObjetivo, fLider, fEquipe, fRespAcao]);

  const filteredKrIds = useMemo(() => new Set(filteredKrs.map(k => k.id)), [filteredKrs]);

  const filteredAcoes = useMemo(() => acoes.filter(a => {
    if (!filteredKrIds.has(a.key_result_id)) return false;
    if (!inSel(fRespAcao, a.responsavel)) return false;
    return true;
  }), [acoes, filteredKrIds, fRespAcao]);

  const activeFilterCount = fObjetivo.length + fLider.length + fEquipe.length + fRespAcao.length;
  const clearFilters = () => { setFObjetivo([]); setFLider([]); setFEquipe([]); setFRespAcao([]); };

  const krByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    filteredKrs.forEach(k => { const s = normalizeStatus(k.status); map[s] = (map[s] || 0) + 1; });
    return map;
  }, [filteredKrs]);

  const acaoByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    filteredAcoes.forEach(a => { const s = normalizeStatus(a.status); map[s] = (map[s] || 0) + 1; });
    return map;
  }, [filteredAcoes]);

  const totalKr = filteredKrs.length;
  const totalAcao = filteredAcoes.length;
  const mediaPerc = totalKr === 0 ? 0
    : Math.round(filteredKrs.reduce((sum, k) => sum + (k.percentual || 0), 0) / totalKr);
  const pctKrConcluidos = totalKr === 0 ? 0
    : Math.round(((krByStatus['Concluído'] || 0) / totalKr) * 100);
  const objsAtivos = useMemo(() => {
    const ids = new Set(filteredKrs.map(k => k.objetivo_id));
    return objetivos.filter(o => ids.has(o.id)).length;
  }, [filteredKrs, objetivos]);

  const krPorEquipe = useMemo(() => {
    const src = statusKrEquipe === 'all'
      ? filteredKrs
      : filteredKrs.filter(k => normalizeStatus(k.status) === statusKrEquipe);
    const map: Record<string, number> = {};
    src.forEach(k => { const eq = k.equipe || 'Sem equipe'; map[eq] = (map[eq] || 0) + 1; });
    return Object.entries(map).map(([equipe, qtd]) => ({ equipe, equipeShort: truncate(equipe, 18), qtd }))
      .sort((a, b) => b.qtd - a.qtd);
  }, [filteredKrs, statusKrEquipe]);

  const acoesPorEquipeStatus = useMemo(() => {
    const krEquipe: Record<string, string> = {};
    filteredKrs.forEach(k => { krEquipe[k.id] = k.equipe || 'Sem equipe'; });
    const map: Record<string, Record<string, number>> = {};
    filteredAcoes.forEach(a => {
      const eq = krEquipe[a.key_result_id] || 'Sem equipe';
      const s = normalizeStatus(a.status);
      if (!map[eq]) map[eq] = {};
      map[eq][s] = (map[eq][s] || 0) + 1;
    });
    return Object.entries(map)
      .map(([equipe, statuses]) => ({ equipe, equipeShort: truncate(equipe, 18), ...statuses }))
      .sort((a: any, b: any) => {
        const sumA = STATUS_ORDER.reduce((s, k) => s + (a[k] || 0), 0);
        const sumB = STATUS_ORDER.reduce((s, k) => s + (b[k] || 0), 0);
        return sumB - sumA;
      });
  }, [filteredAcoes, filteredKrs]);

  const acoesStatusKeys = useMemo(() => {
    const set = new Set<string>();
    filteredAcoes.forEach(a => set.add(normalizeStatus(a.status)));
    return STATUS_ORDER.filter(s => set.has(s));
  }, [filteredAcoes]);

  const pizzaKr = useMemo(() =>
    STATUS_ORDER
      .map(name => ({ name, value: krByStatus[name] || 0 }))
      .filter(e => e.value > 0),
    [krByStatus]);

  const percPorKr = useMemo(() =>
    [...filteredKrs]
      .map(k => ({
        nome: k.codigo || truncate(k.kr, 22),
        nomeFull: k.kr,
        pct: k.percentual || 0,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 15),
    [filteredKrs]);

  const krPorLider = useMemo(() => {
    const src = statusKrLider === 'all'
      ? filteredKrs
      : filteredKrs.filter(k => normalizeStatus(k.status) === statusKrLider);
    const map: Record<string, number> = {};
    src.forEach(k => { const l = k.lider || 'Sem líder'; map[l] = (map[l] || 0) + 1; });
    return Object.entries(map).map(([lider, qtd]) => ({ lider, liderShort: truncate(lider, 20), qtd }))
      .sort((a, b) => b.qtd - a.qtd);
  }, [filteredKrs, statusKrLider]);

  const allKrStatuses = useMemo(() =>
    STATUS_ORDER.filter(s => krs.some(k => normalizeStatus(k.status) === s)),
    [krs]);

  if (!open) return null;

  const gridStroke = 'hsl(var(--border))';

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-16 border-b border-border/60 bg-gradient-to-b from-background to-muted/20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground leading-tight">
              Dashboard Gerencial — OKRs
            </h2>
            <p className="text-xs text-muted-foreground">
              Visão consolidada por Objetivo, Líder, Equipe e Responsável
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-2 rounded-full">
          <X className="h-4 w-4" /> Fechar
        </Button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto px-6 py-6 space-y-8 bg-muted/10">
          {/* Filtros */}
          <div className="rounded-xl border border-border/60 bg-card shadow-sm">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Filter className="h-3.5 w-3.5" /> FILTROS
                {activeFilterCount > 0 && (
                  <span className="ml-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold">
                    {activeFilterCount} ativo{activeFilterCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-muted-foreground hover:text-foreground transition"
                >
                  Limpar tudo
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 px-4 pb-4">
              <MultiSelect
                placeholder="Objetivo"
                options={objetivos.map(o => ({ value: o.id, label: o.objetivo }))}
                value={fObjetivo}
                onChange={setFObjetivo}
              />
              <MultiSelect
                placeholder="Líder"
                options={lideres.map(l => ({ value: l, label: l }))}
                value={fLider}
                onChange={setFLider}
              />
              <MultiSelect
                placeholder="Equipe"
                options={equipes.map(e => ({ value: e, label: e }))}
                value={fEquipe}
                onChange={setFEquipe}
              />
              <MultiSelect
                placeholder="Responsável pela Ação"
                options={respAcoes.map(r => ({ value: r, label: r }))}
                value={fRespAcao}
                onChange={setFRespAcao}
              />
            </div>
          </div>

          {/* KRs por status */}
          <section>
            <SectionTitle>Key Results</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard label="Total KRs" value={totalKr} icon={<Target className="h-4 w-4" />} />
              {STATUS_ORDER.map(s => (
                <StatCard
                  key={s}
                  label={s}
                  value={krByStatus[s] || 0}
                  color={colorFor(s)}
                  icon={STATUS_ICONS[s]}
                  accent
                />
              ))}
            </div>
          </section>

          {/* Ações por status */}
          <section>
            <SectionTitle>Ações</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard label="Total Ações" value={totalAcao} icon={<ClipboardList className="h-4 w-4" />} />
              {STATUS_ORDER.map(s => (
                <StatCard
                  key={s}
                  label={s}
                  value={acaoByStatus[s] || 0}
                  color={colorFor(s)}
                  icon={STATUS_ICONS[s]}
                  accent
                />
              ))}
            </div>
          </section>

          {/* KPIs */}
          <section>
            <SectionTitle>Indicadores</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <StatCard label="% médio conclusão das ações por KR" value={`${mediaPerc}%`} icon={<TrendingUp className="h-4 w-4" />} />
              <StatCard label="% KRs concluídos" value={`${pctKrConcluidos}%`} icon={<CheckCircle2 className="h-4 w-4" />} />
              <StatCard label="Objetivos ativos" value={objsAtivos} icon={<Users className="h-4 w-4" />} />
            </div>
          </section>

          {/* Gráficos */}
          <section>
            <SectionTitle>Análises</SectionTitle>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* KRs por Equipe */}
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-semibold">KRs por Equipe</CardTitle>
                  <Select value={statusKrEquipe} onValueChange={setStatusKrEquipe}>
                    <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos status</SelectItem>
                      {allKrStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    {krPorEquipe.length > 8 ? (
                      <BarChart data={krPorEquipe} layout="vertical" margin={{ left: 8, right: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.4} horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke={gridStroke} />
                        <YAxis type="category" dataKey="equipeShort" tick={{ fontSize: 11 }} width={140} stroke={gridStroke} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
                        <Bar dataKey="qtd" name="KRs" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} maxBarSize={22}>
                          <LabelList dataKey="qtd" position="right" style={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} />
                        </Bar>
                      </BarChart>
                    ) : (
                      <BarChart data={krPorEquipe} margin={{ top: 16, right: 8, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.4} vertical={false} />
                        <XAxis dataKey="equipeShort" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={80} stroke={gridStroke} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke={gridStroke} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
                        <Bar dataKey="qtd" name="KRs" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={44}>
                          <LabelList dataKey="qtd" position="top" style={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} />
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Distribuição status KRs */}
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Distribuição de Status dos KRs</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pizzaKr}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={95}
                        innerRadius={58}
                        paddingAngle={2}
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      >
                        {pizzaKr.map((e, i) => <Cell key={i} fill={colorFor(e.name)} />)}
                        <LabelList
                          dataKey="value"
                          position="outside"
                          style={{ fontSize: 11, fill: 'hsl(var(--foreground))', fontWeight: 500 }}
                        />
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        iconType="circle"
                        wrapperStyle={{ fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Ações por Equipe / Status */}
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Ações por Equipe / Status</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={acoesPorEquipeStatus} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.4} vertical={false} />
                      <XAxis dataKey="equipeShort" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={80} stroke={gridStroke} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke={gridStroke} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
                      {acoesStatusKeys.map((s, i) => (
                        <Bar
                          key={s}
                          dataKey={s}
                          stackId="a"
                          fill={colorFor(s)}
                          maxBarSize={44}
                          radius={i === acoesStatusKeys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* KRs por Líder */}
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-semibold">KRs por Líder</CardTitle>
                  <Select value={statusKrLider} onValueChange={setStatusKrLider}>
                    <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos status</SelectItem>
                      {allKrStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={krPorLider} layout="vertical" margin={{ left: 8, right: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.4} horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke={gridStroke} />
                      <YAxis type="category" dataKey="liderShort" tick={{ fontSize: 11 }} width={150} stroke={gridStroke} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
                      <Bar dataKey="qtd" name="KRs" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} maxBarSize={22}>
                        <LabelList dataKey="qtd" position="right" style={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* % Conclusão por KR */}
              <Card className="lg:col-span-2 border-border/60 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">% de Conclusão por KR (Top 15)</CardTitle>
                </CardHeader>
                <CardContent className="h-[26rem]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={percPorKr} layout="vertical" margin={{ left: 8, right: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.4} horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke={gridStroke} />
                      <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={160} stroke={gridStroke} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} formatter={(v: any) => `${v}%`} />
                      <Bar dataKey="pct" name="Conclusão" radius={[0, 6, 6, 0]} maxBarSize={22}>
                        {percPorKr.map((e, i) => <Cell key={i} fill={pctColor(e.pct)} />)}
                        <LabelList
                          dataKey="pct"
                          position="right"
                          formatter={(v: any) => `${v}%`}
                          style={{ fontSize: 11, fill: 'hsl(var(--foreground))', fontWeight: 500 }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
