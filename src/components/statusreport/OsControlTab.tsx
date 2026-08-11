import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/shared/MultiSelect';
import KpiCard from './KpiCard';
import OsDetailDrawer from './OsDetailDrawer';
import { Search } from 'lucide-react';
import type { SrEpic, SrOs, SrRo } from '@/hooks/useStatusReport';

const uniq = (v: (string | null)[]) => Array.from(new Set(v.filter(Boolean) as string[])).sort();
const normalize = (v?: string | null) =>
  (v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

export default function OsControlTab({
  oss,
  ros,
  epics,
  onSelectRo,
}: {
  oss: SrOs[];
  ros: SrRo[];
  epics: SrEpic[];
  onSelectRo: (ro: SrRo) => void;
}) {
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<string[]>([]);
  const [responsavel, setResponsavel] = useState<string[]>([]);
  const [subprojeto, setSubprojeto] = useState<string[]>([]);
  const [selected, setSelected] = useState<SrOs | null>(null);

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
        };
      }),
    [oss, epicsByOsNumero, rosByEpicName],
  );

  const filtered = useMemo(() => {
    const q = normalize(busca);
    return enriched.filter(({ os }) => {
      if (status.length && !status.includes(os.status_canonico || os.status_atual || '—')) return false;
      if (responsavel.length && !responsavel.includes(os.responsavel || '—')) return false;
      if (subprojeto.length && !subprojeto.includes(os.subprojeto || '—')) return false;
      if (q && !normalize(`${os.numero} ${os.titulo}`).includes(q)) return false;
      return true;
    });
  }, [enriched, busca, status, responsavel, subprojeto]);

  const totalEsforco = filtered.reduce((a, x) => a + (x.os.quantidade_esforco || 0), 0);
  const concluidas = filtered.filter((x) => /faturad|homologa[çc][ãa]o|conclu/i.test(x.os.status_canonico || '')).length;
  const totalRos = filtered.reduce((a, x) => a + x.ros.length, 0);
  const totalPrioritarias = filtered.reduce((a, x) => a + x.prioritarias, 0);

  if (!oss.length) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          Nenhuma OS importada ainda. Use “Importar Status Report” para carregar os dados.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Total de OSs" value={filtered.length} tone="primary" />
        <KpiCard label="Em andamento" value={filtered.length - concluidas} />
        <KpiCard label="Em homologação / faturamento" value={concluidas} tone="success" />
        <KpiCard label="Esforço associado" value={totalEsforco.toLocaleString('pt-BR')} hint="Soma do esforço das OSs filtradas" />
        <KpiCard label="ROs relacionadas" value={totalRos} hint="Vínculo derivado do épico da OS" />
        <KpiCard label="ROs prioritárias" value={totalPrioritarias} tone="danger" />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por número ou título" className="pl-8" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <MultiSelect
            className="w-[200px]"
            placeholder="Status"
            options={uniq(oss.map((o) => o.status_canonico || o.status_atual || '—')).map((v) => ({ value: v, label: v }))}
            value={status}
            onChange={setStatus}
          />
          <MultiSelect
            className="w-[170px]"
            placeholder="Responsável"
            options={uniq(oss.map((o) => o.responsavel || '—')).map((v) => ({ value: v, label: v }))}
            value={responsavel}
            onChange={setResponsavel}
          />
          <MultiSelect
            className="w-[190px]"
            placeholder="Subprojeto"
            options={uniq(oss.map((o) => o.subprojeto || '—')).map((v) => ({ value: v, label: v }))}
            value={subprojeto}
            onChange={setSubprojeto}
          />
          {(busca || status.length || responsavel.length || subprojeto.length) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBusca('');
                setStatus([]);
                setResponsavel([]);
                setSubprojeto([]);
              }}
            >
              Limpar filtros
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map(({ os, epics: relEpics, ros: relRos, prioritarias }) => (
          <button key={os.id} className="text-left" onClick={() => setSelected(os)}>
            <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">OS #{os.numero ?? '—'}</p>
                    <p className="font-semibold leading-snug">{os.titulo ?? 'Sem título'}</p>
                  </div>
                  {os.responsavel && <Badge variant="outline" className="shrink-0">{os.responsavel}</Badge>}
                </div>
                <Badge variant="secondary" className="font-normal">{os.status_canonico || os.status_atual || '—'}</Badge>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
                  <span>Esforço: <b className="text-foreground">{os.quantidade_esforco_fmt || os.quantidade_esforco || '—'}</b></span>
                  <span>Épicos: <b className="text-foreground">{relEpics.length}</b></span>
                  <span>ROs: <b className="text-foreground">{relRos.length}</b></span>
                  <span>Prioritárias: <b className="text-foreground">{prioritarias}</b></span>
                  {os.data_prevista_homologacao && (
                    <span className="col-span-2">
                      Previsão homologação:{' '}
                      <b className="text-foreground">
                        {new Date(`${os.data_prevista_homologacao}T12:00:00`).toLocaleDateString('pt-BR')}
                      </b>
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <OsDetailDrawer os={selected} epics={epics} ros={ros} onClose={() => setSelected(null)} onSelectRo={onSelectRo} />
    </div>
  );
}
