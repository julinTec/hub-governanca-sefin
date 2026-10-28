import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/shared/StatusBadge';
import { Loader2, Target, Search, X, AlertTriangle, LayoutDashboard, CalendarDays, BarChart3 } from 'lucide-react';
import ModuleHeader from '@/components/shared/ModuleHeader';
import OKRDashboardGerencial from '@/components/okrs/OKRDashboardGerencial';
import OKRAcoesPorData from '@/components/okrs/OKRAcoesPorData';
import OKRPainelBI from '@/components/okrs/OKRPainelBI';
import { fmtDateBr } from '@/lib/utils';
import { chamarApiPublica, PublicoApiError } from '@/lib/publicoApi';

interface AcaoPublica {
  id: string;
  key_result_id: string;
  numero: number | null;
  acao: string;
  responsavel: string | null;
  prazo: string | null;
  status: string | null;
}

interface KrPublica {
  id: string;
  objetivo_id: string;
  kr: string;
  codigo: string | null;
  tipo: string | null;
  responsavel: string | null;
  status: string | null;
  meta: number | null;
  valor_atual: number | null;
  percentual: number | null;
  periodicidade: string | null;
  baseline: string | null;
  fonte_dados: string | null;
  lider: string | null;
  equipe: string | null;
  entregas_esperadas: string | null;
  datas_revisao: string | null;
  acoes: AcaoPublica[];
}

interface ObjetivoPublico {
  id: string;
  objetivo: string;
  ciclo: string;
  responsavel: string | null;
  status: string | null;
  observacoes: string | null;
  key_results: KrPublica[];
}

const extractCodigoParts = (codigo: string | null) => (codigo?.match(/\d+/g) || []).map(Number);

const compareKrCodigo = (a: KrPublica, b: KrPublica) => {
  const aCodigo = a.codigo?.trim();
  const bCodigo = b.codigo?.trim();
  if (!aCodigo && !bCodigo) return a.kr.localeCompare(b.kr, 'pt-BR');
  if (!aCodigo) return 1;
  if (!bCodigo) return -1;
  const aParts = extractCodigoParts(aCodigo);
  const bParts = extractCodigoParts(bCodigo);
  const maxLength = Math.max(aParts.length, bParts.length);
  for (let index = 0; index < maxLength; index += 1) {
    const aPart = aParts[index] ?? -1;
    const bPart = bParts[index] ?? -1;
    if (aPart !== bPart) return aPart - bPart;
  }
  return aCodigo.localeCompare(bCodigo, 'pt-BR', { numeric: true, sensitivity: 'base' });
};

export default function PublicoOkrsView({ token }: { token: string }) {
  const [objetivos, setObjetivos] = useState<ObjetivoPublico[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [filterLider, setFilterLider] = useState('all');
  const [filterEquipe, setFilterEquipe] = useState('all');
  const [filterResponsavelAcao, setFilterResponsavelAcao] = useState('all');
  const [searchKr, setSearchKr] = useState('');
  const [openObjetivos, setOpenObjetivos] = useState<string[]>([]);
  const [openKrs, setOpenKrs] = useState<string[]>([]);

  useEffect(() => {
    chamarApiPublica<{ objetivos: ObjetivoPublico[] }>(token, 'okrs')
      .then((data) => setObjetivos(data.objetivos || []))
      .catch((err) => setErro(err instanceof PublicoApiError ? err.message : 'Falha ao carregar OKRs'))
      .finally(() => setLoading(false));
  }, [token]);

  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [acoesDataOpen, setAcoesDataOpen] = useState(false);
  const [biOpen, setBiOpen] = useState(false);

  // Mesmos dados da API publica, no formato que os paineis da tela interna esperam.
  const dadosPaineis = useMemo(() => {
    const krs = objetivos.flatMap((o) => o.key_results);
    return {
      objetivos: objetivos.map(({ id, objetivo, ciclo, responsavel, status }) => ({ id, objetivo, ciclo, responsavel, status })),
      krs: krs.map(({ id, objetivo_id, kr, codigo, responsavel, status, percentual, lider, equipe }) => ({
        id, objetivo_id, kr, codigo, responsavel, status, percentual, lider, equipe,
      })),
      acoes: krs.flatMap((k) => k.acoes.map(({ id, acao, responsavel, status, prazo }) => ({
        id, key_result_id: k.id, acao, responsavel, status, prazo,
      }))),
    };
  }, [objetivos]);

  const cabecalho = (
    <ModuleHeader title="OKRs" description="Objetivos e Resultados-Chave">
      <Button variant="outline" onClick={() => setDashboardOpen(true)} disabled={loading || !!erro}>
        <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard Gerencial
      </Button>
      <Button variant="outline" onClick={() => setAcoesDataOpen(true)} disabled={loading || !!erro}>
        <CalendarDays className="h-4 w-4 mr-2" /> Ações por Data
      </Button>
      <Button variant="outline" onClick={() => setBiOpen(true)}>
        <BarChart3 className="h-4 w-4 mr-2" /> Painel BI
      </Button>
    </ModuleHeader>
  );

  const paineis = (
    <>
      <OKRDashboardGerencial open={dashboardOpen} onClose={() => setDashboardOpen(false)} dados={dadosPaineis} />
      <OKRAcoesPorData
        open={acoesDataOpen}
        onOpenChange={setAcoesDataOpen}
        acoes={dadosPaineis.acoes}
        keyResults={dadosPaineis.krs}
        somenteLeitura
      />
      <OKRPainelBI open={biOpen} onClose={() => setBiOpen(false)} />
    </>
  );

  if (loading) {
    return (
      <>
        {cabecalho}
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        {paineis}
      </>
    );
  }

  if (erro) {
    return (
      <>
        {cabecalho}
        <div className="flex items-center gap-2 justify-center py-12 text-destructive">
          <AlertTriangle className="h-5 w-5" /> {erro}
        </div>
        {paineis}
      </>
    );
  }

  const keyResults = objetivos.flatMap((o) => o.key_results);
  const acoes = keyResults.flatMap((k) => k.acoes);

  const lideresOptions = Array.from(new Set(keyResults.map((k) => k.lider).filter((v): v is string => !!v && v.trim() !== ''))).sort();
  const equipesOptions = Array.from(new Set(keyResults.map((k) => k.equipe).filter((v): v is string => !!v && v.trim() !== ''))).sort();
  const responsaveisAcaoOptions = Array.from(new Set(acoes.map((a) => a.responsavel).filter((v): v is string => !!v && v.trim() !== ''))).sort();

  const searchKrNormalized = searchKr.trim().toLowerCase().replace(/\s+/g, '');
  const hasActiveFilters = filterLider !== 'all' || filterResponsavelAcao !== 'all' || filterEquipe !== 'all' || searchKrNormalized !== '';

  const filteredAcoes = acoes.filter((a) => filterResponsavelAcao === 'all' || a.responsavel === filterResponsavelAcao);

  const filteredKrs = keyResults
    .filter((kr) => {
      if (filterLider !== 'all' && kr.lider !== filterLider) return false;
      if (filterEquipe !== 'all' && kr.equipe !== filterEquipe) return false;
      if (filterResponsavelAcao !== 'all') {
        const krHasMatchingAcao = filteredAcoes.some((a) => kr.acoes.some((ka) => ka.id === a.id));
        if (!krHasMatchingAcao) return false;
      }
      if (searchKrNormalized) {
        const codigoMatch = (kr.codigo || '').toLowerCase().replace(/\s+/g, '').includes(searchKrNormalized);
        const descMatch = kr.kr.toLowerCase().includes(searchKrNormalized);
        if (!codigoMatch && !descMatch) return false;
      }
      return true;
    })
    .sort(compareKrCodigo);

  const filteredObjetivos = hasActiveFilters
    ? objetivos.filter((obj) => filteredKrs.some((kr) => kr.objetivo_id === obj.id))
    : objetivos;

  const effectiveOpenObjetivos = hasActiveFilters ? filteredObjetivos.map((o) => o.id) : openObjetivos;
  const effectiveOpenKrs = hasActiveFilters ? filteredKrs.map((k) => k.id) : openKrs;

  const clearFilters = () => {
    setFilterLider('all');
    setFilterEquipe('all');
    setFilterResponsavelAcao('all');
    setSearchKr('');
  };

  return (
    <div className="space-y-4">
      {cabecalho}
      {paineis}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <Label className="text-xs text-muted-foreground mb-1 block">Buscar por KR</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={searchKr} onChange={(e) => setSearchKr(e.target.value)} placeholder="Ex: KR1.1, resultado..." className="pl-9" />
              </div>
            </div>
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs text-muted-foreground mb-1 block">Líder</Label>
              <Select value={filterLider} onValueChange={setFilterLider}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {lideresOptions.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs text-muted-foreground mb-1 block">Responsável pela ação</Label>
              <Select value={filterResponsavelAcao} onValueChange={setFilterResponsavelAcao}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {responsaveisAcaoOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs text-muted-foreground mb-1 block">Equipe</Label>
              <Select value={filterEquipe} onValueChange={setFilterEquipe}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {equipesOptions.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-3 w-3 mr-1" /> Limpar filtros
              </Button>
            )}
          </div>
          {hasActiveFilters && (
            <p className="text-xs text-muted-foreground mt-2">
              Mostrando {filteredObjetivos.length} objetivo(s) · {filteredKrs.length} KR(s)
            </p>
          )}
        </CardContent>
      </Card>

      {filteredObjetivos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {objetivos.length === 0 ? 'Nenhum objetivo cadastrado' : 'Nenhum resultado para os filtros aplicados'}
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-4" value={effectiveOpenObjetivos} onValueChange={hasActiveFilters ? undefined : setOpenObjetivos}>
          {filteredObjetivos.map((obj) => {
            const krs = filteredKrs.filter((kr) => kr.objetivo_id === obj.id);
            return (
              <AccordionItem key={obj.id} value={obj.id} className="border rounded-lg bg-card">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <Target className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground">{obj.objetivo}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Ciclo: {obj.ciclo} · Responsável: {obj.responsavel || '—'} · KRs: {krs.length}
                      </div>
                    </div>
                    <StatusBadge status={obj.status || ''} />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {obj.observacoes && <p className="text-sm text-muted-foreground mb-4">📝 {obj.observacoes}</p>}
                  {krs.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Nenhum Key Result cadastrado para este objetivo.</p>
                  ) : (
                    <div className="space-y-4">
                      {krs.map((kr) => {
                        const krAcoes = filterResponsavelAcao !== 'all'
                          ? filteredAcoes.filter((a) => kr.acoes.some((ka) => ka.id === a.id))
                          : kr.acoes;
                        return (
                          <Card key={kr.id} className="border-l-4 border-l-primary/50">
                            <div className="p-4 pb-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="text-sm font-semibold">
                                    {kr.codigo && <span className="text-primary mr-2">{kr.codigo}</span>}
                                    {kr.kr}
                                  </div>
                                  {kr.tipo && <span className="text-xs text-muted-foreground">{kr.tipo}</span>}
                                </div>
                                <StatusBadge status={kr.status || ''} />
                              </div>
                            </div>
                            <CardContent className="pt-0">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-xs mb-4">
                                {kr.lider && <div><span className="text-muted-foreground">Líder:</span> {kr.lider}</div>}
                                {kr.equipe && <div><span className="text-muted-foreground">Equipe:</span> {kr.equipe}</div>}
                                {kr.periodicidade && <div><span className="text-muted-foreground">Periodicidade:</span> {kr.periodicidade}</div>}
                                {kr.baseline && <div><span className="text-muted-foreground">Baseline:</span> {kr.baseline}</div>}
                                {kr.meta != null && <div><span className="text-muted-foreground">Meta:</span> {kr.meta}</div>}
                                {kr.valor_atual != null && <div><span className="text-muted-foreground">Valor Atual:</span> {kr.valor_atual}</div>}
                                <div className="col-span-full mt-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-xs">Progresso:</span>
                                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${kr.percentual || 0}%` }} />
                                    </div>
                                    <span className="text-xs font-medium">{kr.percentual || 0}%</span>
                                  </div>
                                </div>
                              </div>
                              {krAcoes.length > 0 && (
                                <div className="mt-2">
                                  <button
                                    type="button"
                                    onClick={() => setOpenKrs((prev) => (prev.includes(kr.id) ? prev.filter((id) => id !== kr.id) : [...prev, kr.id]))}
                                    className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2"
                                  >
                                    Plano de Ação ({krAcoes.length})
                                  </button>
                                  {effectiveOpenKrs.includes(kr.id) && (
                                    <div className="rounded-md border overflow-hidden">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="text-xs">
                                            <TableHead className="w-10">Nº</TableHead>
                                            <TableHead>Ação</TableHead>
                                            <TableHead className="w-28">Responsável</TableHead>
                                            <TableHead className="w-24">Prazo</TableHead>
                                            <TableHead className="w-28">Status</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {krAcoes.map((acao) => (
                                            <TableRow key={acao.id} className="text-xs">
                                              <TableCell>{acao.numero}</TableCell>
                                              <TableCell>{acao.acao}</TableCell>
                                              <TableCell>{acao.responsavel || '—'}</TableCell>
                                              <TableCell>{fmtDateBr(acao.prazo)}</TableCell>
                                              <TableCell><StatusBadge status={acao.status || ''} /></TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
