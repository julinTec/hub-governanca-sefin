import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/shared/MultiSelect';
import KpiCard from './KpiCard';
import { Search } from 'lucide-react';
import { cleanScaleLabel, COMMITTED_STATUS_KEYS, RO_STATUS_WORKFLOW, getRoStatusDef } from '@/lib/statusReport/config';
import type { SrRo } from '@/hooks/useStatusReport';

const uniq = (v: (string | null)[]) => Array.from(new Set(v.filter(Boolean) as string[])).sort();
const normalize = (v?: string | null) =>
  (v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
const sum = (arr: (number | null)[]) => arr.reduce((a, x) => a + (x || 0), 0);

export default function RoControlTab({
  ros,
  prevStatusCounts,
  onSelectRo,
}: {
  ros: SrRo[];
  prevStatusCounts: Record<string, number> | null;
  onSelectRo: (ro: SrRo) => void;
}) {
  const [busca, setBusca] = useState('');
  const [f, setF] = useState<Record<string, string[]>>({});
  const set = (k: string) => (v: string[]) => setF((p) => ({ ...p, [k]: v }));
  const get = (k: string) => f[k] || [];

  const filtered = useMemo(() => {
    const q = normalize(busca);
    return ros.filter((r) => {
      const check = (k: string, val: string | null) => !get(k).length || get(k).includes(val || '—');
      if (!check('epico', r.epico_nome)) return false;
      if (!check('status', getRoStatusDef(r.status_key).label)) return false;
      if (!check('tipo', r.tipo)) return false;
      if (!check('validacao', r.tipo_validacao)) return false;
      if (!check('prioridade', r.prioridade)) return false;
      if (!check('impacto', r.impacto)) return false;
      if (!check('urgencia', r.urgencia)) return false;
      if (!check('solicitante', r.solicitante)) return false;
      if (!check('subprojeto', r.subprojeto)) return false;
      if (get('prioritario').length) {
        const want = get('prioritario').includes('Sim');
        const notWant = get('prioritario').includes('Não');
        if (r.prioritario && !want) return false;
        if (!r.prioritario && !notWant) return false;
      }
      if (q && !normalize(`${r.numero} ${r.titulo} ${r.sydle_id}`).includes(q)) return false;
      return true;
    });
  }, [ros, busca, f]);

  const columns = useMemo(() => {
    const map = new Map<string, SrRo[]>();
    for (const r of filtered) map.set(r.status_key, [...(map.get(r.status_key) || []), r]);
    return RO_STATUS_WORKFLOW.filter((s) => (map.get(s.key) || []).length > 0 || s.key !== 'outros').map((s) => ({
      def: s,
      items: (map.get(s.key) || []).sort((a, b) => Number(b.prioritario) - Number(a.prioritario) || (b.grau || 0) - (a.grau || 0)),
    }));
  }, [filtered]);

  const emAndamento = filtered.filter((r) => COMMITTED_STATUS_KEYS.includes(r.status_key));
  const homologacao = filtered.filter((r) => r.status_key === 'homologacao-validacao');
  const producao = filtered.filter((r) => r.status_key === 'producao-concluido');
  const criticas = filtered.filter((r) => (r.impacto_nivel ?? 0) >= 5 || /cr[íi]tic/i.test(r.prioridade || ''));

  const delta = (key: string, current: number) =>
    prevStatusCounts ? current - (prevStatusCounts[key] || 0) : null;

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
      {!prevStatusCounts && (
        <p className="text-xs text-muted-foreground">Primeira carga — histórico ainda não disponível para comparação.</p>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        <KpiCard label="Total de ROs" value={filtered.length} tone="primary" />
        <KpiCard label="Na carga atual" value={filtered.filter((r) => r.is_present_current_import).length} />
        <KpiCard label="Prioritárias" value={filtered.filter((r) => r.prioritario).length} tone="danger" />
        <KpiCard label="Críticas" value={criticas.length} tone="warning" hint="Impacto nível 5 ou prioridade Crítica" />
        <KpiCard label="Em andamento" value={emAndamento.length} hint="Status considerados comprometidos" />
        <KpiCard label="Em homologação" value={homologacao.length} delta={delta('homologacao-validacao', homologacao.length)} />
        <KpiCard label="Produção / Concluído" value={producao.length} tone="success" delta={delta('producao-concluido', producao.length)} />
        <KpiCard
          label="Esforço aberto"
          value={sum(emAndamento.map((r) => r.esforco)).toLocaleString('pt-BR')}
          hint={`${sum(emAndamento.map((r) => r.tempo_estimado_horas)).toLocaleString('pt-BR')}h estimadas`}
        />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por número, título ou Sydle ID" className="pl-8" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          {[
            ['epico', 'Épico', uniq(ros.map((r) => r.epico_nome))],
            ['status', 'Status', RO_STATUS_WORKFLOW.map((s) => s.label)],
            ['tipo', 'Tipo', uniq(ros.map((r) => r.tipo))],
            ['validacao', 'Validação', uniq(ros.map((r) => r.tipo_validacao))],
            ['prioridade', 'Prioridade', uniq(ros.map((r) => r.prioridade))],
            ['impacto', 'Impacto', uniq(ros.map((r) => r.impacto))],
            ['urgencia', 'Urgência', uniq(ros.map((r) => r.urgencia))],
            ['solicitante', 'Solicitante', uniq(ros.map((r) => r.solicitante))],
            ['subprojeto', 'Subprojeto', uniq(ros.map((r) => r.subprojeto))],
            ['prioritario', 'Prioritário', ['Sim', 'Não']],
          ].map(([key, label, opts]) => (
            <MultiSelect
              key={key as string}
              className="w-[160px]"
              placeholder={label as string}
              options={(opts as string[]).map((v) => ({ value: v, label: v }))}
              value={get(key as string)}
              onChange={set(key as string)}
            />
          ))}
          {(busca || Object.values(f).some((v) => v.length)) && (
            <Button variant="ghost" size="sm" onClick={() => { setBusca(''); setF({}); }}>
              Limpar filtros
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3 overflow-x-auto pb-3">
        {columns.map(({ def, items }) => (
          <div key={def.key} className="w-[280px] shrink-0">
            <div className="rounded-t-lg border border-b-0 border-border bg-muted/60 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-semibold uppercase tracking-wide">{def.label}</p>
                <Badge variant="secondary" className="tabular-nums">{items.length}</Badge>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Esforço: {sum(items.map((r) => r.esforco)).toLocaleString('pt-BR')} · Tempo:{' '}
                {sum(items.map((r) => r.tempo_estimado_horas)).toLocaleString('pt-BR')}h
              </p>
            </div>
            <div className="max-h-[65vh] space-y-2 overflow-y-auto rounded-b-lg border border-border bg-background p-2">
              {items.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Nenhum RO</p>}
              {items.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onSelectRo(r)}
                  className={`w-full rounded-lg border bg-card p-2.5 text-left transition-colors hover:border-primary/40 ${
                    r.prioritario ? 'border-destructive/40' : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground">#{r.numero ?? '—'}</span>
                    {r.prioritario && <Badge className="h-4 bg-destructive px-1 text-[10px] text-destructive-foreground">Prioritário</Badge>}
                    {r.prioridade && <Badge variant="outline" className="h-4 px-1 text-[10px]">{r.prioridade}</Badge>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug">{r.titulo ?? 'Sem título'}</p>
                  {r.epico_nome && <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{r.epico_nome}</p>}
                  <div className="mt-1.5 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                    {r.tipo && <span className="rounded bg-muted px-1">{r.tipo}</span>}
                    <span className="rounded bg-muted px-1">Imp: {cleanScaleLabel(r.impacto)}</span>
                    <span className="rounded bg-muted px-1">Urg: {cleanScaleLabel(r.urgencia)}</span>
                    {r.grau !== null && <span className="rounded bg-muted px-1">Grau {r.grau}</span>}
                    {r.esforco !== null && <span className="rounded bg-muted px-1">Esf {r.esforco}</span>}
                    {r.tempo_estimado_horas !== null && <span className="rounded bg-muted px-1">{r.tempo_estimado_horas}h</span>}
                    {r.previsao_atendimento && (
                      <span className="rounded bg-muted px-1">
                        {new Date(`${r.previsao_atendimento}T12:00:00`).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
