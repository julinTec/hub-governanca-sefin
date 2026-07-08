import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { X, Filter, Loader2, Target, ClipboardList, TrendingUp, Users } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Objetivo {
  id: string; objetivo: string; ciclo: string; responsavel: string | null; status: string | null;
}
interface KR {
  id: string; objetivo_id: string; kr: string; codigo: string | null;
  responsavel: string | null; status: string | null; percentual: number | null;
  lider: string | null; equipe: string | null;
}
interface Acao {
  id: string; key_result_id: string; acao: string; responsavel: string | null;
  status: string | null; prazo: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  'Concluído': 'hsl(142 71% 45%)',
  'Em andamento': 'hsl(45 93% 47%)',
  'Atrasado': 'hsl(0 84% 60%)',
  'A iniciar': 'hsl(215 20% 65%)',
  'Cancelado': 'hsl(0 0% 55%)',
};

const normalizeStatus = (s: string | null | undefined): string => {
  if (!s) return 'Sem status';
  const n = s.toLowerCase().trim();
  if (['concluído', 'concluido'].includes(n)) return 'Concluído';
  if (['em andamento'].includes(n)) return 'Em andamento';
  if (['atrasado', 'crítico', 'critico'].includes(n)) return 'Atrasado';
  if (['a iniciar', 'pendente', 'não iniciado', 'nao iniciado'].includes(n)) return 'A iniciar';
  if (['cancelado'].includes(n)) return 'Cancelado';
  return s;
};

const colorFor = (status: string) => STATUS_COLORS[status] || 'hsl(215 16% 47%)';

interface StatCardProps { label: string; value: number | string; color?: string; icon?: React.ReactNode; }
function StatCard({ label, value, color, icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold" style={color ? { color } : undefined}>{value}</p>
          </div>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function OKRDashboardGerencial({ open, onClose }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [krs, setKrs] = useState<KR[]>([]);
  const [acoes, setAcoes] = useState<Acao[]>([]);

  // Filtros globais
  const [fObjetivo, setFObjetivo] = useState('all');
  const [fLider, setFLider] = useState('all');
  const [fEquipe, setFEquipe] = useState('all');
  const [fRespAcao, setFRespAcao] = useState('all');

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

  // Aplica filtros
  const filteredKrs = useMemo(() => krs.filter(k => {
    if (fObjetivo !== 'all' && k.objetivo_id !== fObjetivo) return false;
    if (fLider !== 'all' && k.lider !== fLider) return false;
    if (fEquipe !== 'all' && k.equipe !== fEquipe) return false;
    if (fRespAcao !== 'all') {
      const has = acoes.some(a => a.key_result_id === k.id && a.responsavel === fRespAcao);
      if (!has) return false;
    }
    return true;
  }), [krs, acoes, fObjetivo, fLider, fEquipe, fRespAcao]);

  const filteredKrIds = useMemo(() => new Set(filteredKrs.map(k => k.id)), [filteredKrs]);

  const filteredAcoes = useMemo(() => acoes.filter(a => {
    if (!filteredKrIds.has(a.key_result_id)) return false;
    if (fRespAcao !== 'all' && a.responsavel !== fRespAcao) return false;
    return true;
  }), [acoes, filteredKrIds, fRespAcao]);

  const clearFilters = () => {
    setFObjetivo('all'); setFLider('all'); setFEquipe('all'); setFRespAcao('all');
  };

  // Contadores
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

  // Gráfico 1: KRs por Equipe (com filtro de status embutido)
  const krPorEquipe = useMemo(() => {
    const src = statusKrEquipe === 'all'
      ? filteredKrs
      : filteredKrs.filter(k => normalizeStatus(k.status) === statusKrEquipe);
    const map: Record<string, number> = {};
    src.forEach(k => { const eq = k.equipe || 'Sem equipe'; map[eq] = (map[eq] || 0) + 1; });
    return Object.entries(map).map(([equipe, qtd]) => ({ equipe, qtd })).sort((a, b) => b.qtd - a.qtd);
  }, [filteredKrs, statusKrEquipe]);

  // Gráfico 2: Ações por Equipe/Status (empilhado)
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
    return Object.entries(map).map(([equipe, statuses]) => ({ equipe, ...statuses }));
  }, [filteredAcoes, filteredKrs]);

  const acoesStatusKeys = useMemo(() => {
    const set = new Set<string>();
    filteredAcoes.forEach(a => set.add(normalizeStatus(a.status)));
    return Array.from(set);
  }, [filteredAcoes]);

  // Gráfico 3: Pizza status KRs
  const pizzaKr = useMemo(() =>
    Object.entries(krByStatus).map(([name, value]) => ({ name, value })),
    [krByStatus]);

  // Gráfico 4: % conclusão por KR (top 15)
  const percPorKr = useMemo(() =>
    [...filteredKrs]
      .map(k => ({ nome: k.codigo || k.kr.slice(0, 20), pct: k.percentual || 0 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 15),
    [filteredKrs]);

  // Gráfico 5: KRs por Líder
  const krPorLider = useMemo(() => {
    const src = statusKrLider === 'all'
      ? filteredKrs
      : filteredKrs.filter(k => normalizeStatus(k.status) === statusKrLider);
    const map: Record<string, number> = {};
    src.forEach(k => { const l = k.lider || 'Sem líder'; map[l] = (map[l] || 0) + 1; });
    return Object.entries(map).map(([lider, qtd]) => ({ lider, qtd })).sort((a, b) => b.qtd - a.qtd);
  }, [filteredKrs, statusKrLider]);

  const allKrStatuses = useMemo(() =>
    Array.from(new Set(krs.map(k => normalizeStatus(k.status)))).sort(),
    [krs]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
        <div>
          <h2 className="font-semibold text-foreground">Dashboard Gerencial — OKRs</h2>
          <p className="text-xs text-muted-foreground">Visão consolidada por Objetivo, Líder, Equipe e Responsável</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-6">
          {/* Filtros */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="h-4 w-4" /> Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Objetivo</label>
                <Select value={fObjetivo} onValueChange={setFObjetivo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {objetivos.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.objetivo.slice(0, 60)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Líder</label>
                <Select value={fLider} onValueChange={setFLider}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {lideres.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Equipe</label>
                <Select value={fEquipe} onValueChange={setFEquipe}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {equipes.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Responsável pela Ação</label>
                <Select value={fRespAcao} onValueChange={setFRespAcao}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {respAcoes.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full">Limpar filtros</Button>
              </div>
            </CardContent>
          </Card>

          {/* KRs por status */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Key Results</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard label="Total KRs" value={totalKr} icon={<Target className="h-5 w-5" />} />
              {['Concluído', 'Em andamento', 'Atrasado', 'A iniciar', 'Cancelado'].map(s => (
                <StatCard key={s} label={s} value={krByStatus[s] || 0} color={colorFor(s)} />
              ))}
            </div>
          </div>

          {/* Ações por status */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ações</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard label="Total Ações" value={totalAcao} icon={<ClipboardList className="h-5 w-5" />} />
              {['Concluído', 'Em andamento', 'Atrasado', 'A iniciar', 'Cancelado'].map(s => (
                <StatCard key={s} label={s} value={acaoByStatus[s] || 0} color={colorFor(s)} />
              ))}
            </div>
          </div>

          {/* KPIs */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">KPIs</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <StatCard label="% médio conclusão das ações por KR" value={`${mediaPerc}%`} icon={<TrendingUp className="h-5 w-5" />} />
              <StatCard label="% KRs concluídos" value={`${pctKrConcluidos}%`} icon={<Target className="h-5 w-5" />} />
              <StatCard label="Objetivos ativos" value={objsAtivos} icon={<Users className="h-5 w-5" />} />
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm">KRs por Equipe</CardTitle>
                <Select value={statusKrEquipe} onValueChange={setStatusKrEquipe}>
                  <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos status</SelectItem>
                    {allKrStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={krPorEquipe}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="equipe" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="qtd" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição de Status dos KRs</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pizzaKr} dataKey="value" nameKey="name" outerRadius={90} innerRadius={50} label>
                      {pizzaKr.map((e, i) => <Cell key={i} fill={colorFor(e.name)} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Ações por Equipe / Status</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={acoesPorEquipeStatus}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="equipe" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    {acoesStatusKeys.map(s => (
                      <Bar key={s} dataKey={s} stackId="a" fill={colorFor(s)} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm">KRs por Líder</CardTitle>
                <Select value={statusKrLider} onValueChange={setStatusKrLider}>
                  <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos status</SelectItem>
                    {allKrStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={krPorLider} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="lider" tick={{ fontSize: 11 }} width={140} />
                    <Tooltip />
                    <Bar dataKey="qtd" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm">% de Conclusão por KR (Top 15)</CardTitle></CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={percPorKr} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={140} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Bar dataKey="pct" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
