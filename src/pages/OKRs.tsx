import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import ModuleHeader from '@/components/shared/ModuleHeader';
import FormDialog from '@/components/shared/FormDialog';
import StatusBadge from '@/components/shared/StatusBadge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Pencil, Trash2, ChevronDown, Target, ClipboardList } from 'lucide-react';

interface OKRObjetivo {
  id: string;
  objetivo: string;
  ciclo: string;
  responsavel: string | null;
  status: string | null;
  observacoes: string | null;
  observacao_reuniao: string | null;
  created_at: string;
}

interface KeyResult {
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
}

interface Acao {
  id: string;
  key_result_id: string;
  user_id: string;
  numero: number | null;
  acao: string;
  responsavel: string | null;
  prazo: string | null;
  status: string | null;
}

const defaultObjForm = {
  objetivo: '', ciclo: '2026.1', responsavel: '', status: 'Em andamento',
  observacoes: '', observacao_reuniao: '',
};

const defaultKrForm = {
  kr: '', codigo: '', tipo: '', responsavel: '', status: 'Em andamento',
  meta: '', valor_atual: '', periodicidade: '', baseline: '',
  fonte_dados: '', lider: '', equipe: '', entregas_esperadas: '', datas_revisao: '',
};

const defaultAcaoForm = {
  acao: '', responsavel: '', prazo: '', status: 'A iniciar', numero: '',
};

export default function OKRs() {
  const [objetivos, setObjetivos] = useState<OKRObjetivo[]>([]);
  const [keyResults, setKeyResults] = useState<KeyResult[]>([]);
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [objDialogOpen, setObjDialogOpen] = useState(false);
  const [krDialogOpen, setKrDialogOpen] = useState(false);
  const [acaoDialogOpen, setAcaoDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Forms
  const [objForm, setObjForm] = useState(defaultObjForm);
  const [krForm, setKrForm] = useState(defaultKrForm);
  const [acaoForm, setAcaoForm] = useState(defaultAcaoForm);

  // Editing IDs
  const [editingObjId, setEditingObjId] = useState<string | null>(null);
  const [editingKrId, setEditingKrId] = useState<string | null>(null);
  const [editingAcaoId, setEditingAcaoId] = useState<string | null>(null);

  // Context for creating KR/Acao
  const [selectedObjetivoId, setSelectedObjetivoId] = useState<string | null>(null);
  const [selectedKrId, setSelectedKrId] = useState<string | null>(null);

  const { toast } = useToast();
  const { user } = useAuth();

  const fetchAll = async () => {
    setLoading(true);
    const [objRes, krRes, acaoRes] = await Promise.all([
      supabase.from('okr_objetivos').select('*').order('created_at', { ascending: false }),
      supabase.from('okr_key_results').select('*').order('created_at', { ascending: true }),
      supabase.from('okr_acoes').select('*').order('numero', { ascending: true }),
    ]);
    if (objRes.error) toast({ title: 'Erro', description: objRes.error.message, variant: 'destructive' });
    else setObjetivos(objRes.data || []);
    if (krRes.error) toast({ title: 'Erro', description: krRes.error.message, variant: 'destructive' });
    else setKeyResults(krRes.data || []);
    if (acaoRes.error) toast({ title: 'Erro', description: acaoRes.error.message, variant: 'destructive' });
    else setAcoes(acaoRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ---- OBJETIVO CRUD ----
  const handleAddObj = () => { setObjForm(defaultObjForm); setEditingObjId(null); setObjDialogOpen(true); };
  const handleEditObj = (obj: OKRObjetivo) => {
    setObjForm({
      objetivo: obj.objetivo, ciclo: obj.ciclo, responsavel: obj.responsavel || '',
      status: obj.status || 'Em andamento', observacoes: obj.observacoes || '',
      observacao_reuniao: obj.observacao_reuniao || '',
    });
    setEditingObjId(obj.id);
    setObjDialogOpen(true);
  };
  const handleDeleteObj = async (id: string) => {
    const { error } = await supabase.from('okr_objetivos').delete().eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Sucesso', description: 'Objetivo excluído' }); fetchAll(); }
  };
  const handleSubmitObj = async () => {
    if (!objForm.objetivo || !objForm.ciclo) { toast({ title: 'Erro', description: 'Preencha os campos obrigatórios', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = { ...objForm };
    if (editingObjId) {
      const { error } = await supabase.from('okr_objetivos').update(payload).eq('id', editingObjId);
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Sucesso', description: 'Objetivo atualizado' }); setObjDialogOpen(false); fetchAll(); }
    } else {
      const { error } = await supabase.from('okr_objetivos').insert({ ...payload, user_id: user?.id });
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Sucesso', description: 'Objetivo criado' }); setObjDialogOpen(false); fetchAll(); }
    }
    setSaving(false);
  };

  // ---- KR CRUD ----
  const handleAddKr = (objetivoId: string) => {
    setKrForm(defaultKrForm); setEditingKrId(null); setSelectedObjetivoId(objetivoId); setKrDialogOpen(true);
  };
  const handleEditKr = (kr: KeyResult) => {
    setKrForm({
      kr: kr.kr, codigo: kr.codigo || '', tipo: kr.tipo || '', responsavel: kr.responsavel || '',
      status: kr.status || 'Em andamento', meta: kr.meta?.toString() || '', valor_atual: kr.valor_atual?.toString() || '',
      periodicidade: kr.periodicidade || '',
      baseline: kr.baseline || '', fonte_dados: kr.fonte_dados || '', lider: kr.lider || '',
      equipe: kr.equipe || '', entregas_esperadas: kr.entregas_esperadas || '', datas_revisao: kr.datas_revisao || '',
    });
    setEditingKrId(kr.id); setSelectedObjetivoId(kr.objetivo_id); setKrDialogOpen(true);
  };
  const handleDeleteKr = async (id: string) => {
    const { error } = await supabase.from('okr_key_results').delete().eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Sucesso', description: 'KR excluído' }); fetchAll(); }
  };
  const handleSubmitKr = async () => {
    if (!krForm.kr) { toast({ title: 'Erro', description: 'Preencha a descrição do KR', variant: 'destructive' }); return; }
    setSaving(true);
    const payload: any = {
      kr: krForm.kr, codigo: krForm.codigo || null, tipo: krForm.tipo || null,
      responsavel: krForm.responsavel || null, status: krForm.status || null,
      meta: krForm.meta ? parseFloat(krForm.meta) : null,
      valor_atual: krForm.valor_atual ? parseFloat(krForm.valor_atual) : null,
      periodicidade: krForm.periodicidade || null, baseline: krForm.baseline || null,
      fonte_dados: krForm.fonte_dados || null, lider: krForm.lider || null,
      equipe: krForm.equipe || null, entregas_esperadas: krForm.entregas_esperadas || null,
      datas_revisao: krForm.datas_revisao || null,
    };
    if (editingKrId) {
      const { error } = await supabase.from('okr_key_results').update(payload).eq('id', editingKrId);
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Sucesso', description: 'KR atualizado' }); setKrDialogOpen(false); fetchAll(); }
    } else {
      payload.objetivo_id = selectedObjetivoId;
      const { error } = await supabase.from('okr_key_results').insert(payload);
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Sucesso', description: 'KR criado' }); setKrDialogOpen(false); fetchAll(); }
    }
    setSaving(false);
  };

  // ---- ACAO CRUD ----
  const handleAddAcao = (krId: string) => {
    const krAcoes = acoes.filter(a => a.key_result_id === krId);
    const nextNum = krAcoes.length > 0 ? Math.max(...krAcoes.map(a => a.numero || 0)) + 1 : 1;
    setAcaoForm({ ...defaultAcaoForm, numero: nextNum.toString() });
    setEditingAcaoId(null); setSelectedKrId(krId); setAcaoDialogOpen(true);
  };
  const handleEditAcao = (acao: Acao) => {
    setAcaoForm({
      acao: acao.acao, responsavel: acao.responsavel || '', prazo: acao.prazo || '',
      status: acao.status || 'A iniciar', numero: acao.numero?.toString() || '',
    });
    setEditingAcaoId(acao.id); setSelectedKrId(acao.key_result_id); setAcaoDialogOpen(true);
  };
  const handleDeleteAcao = async (id: string) => {
    const { error } = await supabase.from('okr_acoes').delete().eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Sucesso', description: 'Ação excluída' }); fetchAll(); }
  };
  const handleSubmitAcao = async () => {
    if (!acaoForm.acao) { toast({ title: 'Erro', description: 'Preencha a descrição da ação', variant: 'destructive' }); return; }
    setSaving(true);
    const payload: any = {
      acao: acaoForm.acao, responsavel: acaoForm.responsavel || null,
      prazo: acaoForm.prazo || null, status: acaoForm.status || 'A iniciar',
      numero: acaoForm.numero ? parseInt(acaoForm.numero) : null,
    };
    if (editingAcaoId) {
      const { error } = await supabase.from('okr_acoes').update(payload).eq('id', editingAcaoId);
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Sucesso', description: 'Ação atualizada' }); setAcaoDialogOpen(false); fetchAll(); }
    } else {
      payload.key_result_id = selectedKrId;
      payload.user_id = user?.id;
      const { error } = await supabase.from('okr_acoes').insert(payload);
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Sucesso', description: 'Ação criada' }); setAcaoDialogOpen(false); fetchAll(); }
    }
    setSaving(false);
  };

  const getKrsForObj = (objId: string) => keyResults.filter(kr => kr.objetivo_id === objId);
  const getAcoesForKr = (krId: string) => acoes.filter(a => a.key_result_id === krId);

  if (loading) {
    return (
      <MainLayout>
        <ModuleHeader title="OKRs" description="Objetivos e Resultados-Chave" onAdd={handleAddObj} addLabel="Novo Objetivo" />
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <ModuleHeader title="OKRs" description="Objetivos e Resultados-Chave" onAdd={handleAddObj} addLabel="Novo Objetivo" />

      {objetivos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum objetivo cadastrado</div>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {objetivos.map((obj) => {
            const krs = getKrsForObj(obj.id);
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
                  {/* Objetivo actions */}
                  <div className="flex gap-2 mb-4">
                    <Button size="sm" variant="outline" onClick={() => handleEditObj(obj)}>
                      <Pencil className="h-3 w-3 mr-1" /> Editar Objetivo
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDeleteObj(obj.id)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Excluir
                    </Button>
                    <Button size="sm" onClick={() => handleAddKr(obj.id)}>
                      <Plus className="h-3 w-3 mr-1" /> Novo KR
                    </Button>
                  </div>

                  {obj.observacoes && (
                    <p className="text-sm text-muted-foreground mb-4">📝 {obj.observacoes}</p>
                  )}

                  {/* Key Results */}
                  {krs.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Nenhum Key Result cadastrado para este objetivo.</p>
                  ) : (
                    <div className="space-y-4">
                      {krs.map((kr) => {
                        const krAcoes = getAcoesForKr(kr.id);
                        return (
                          <Card key={kr.id} className="border-l-4 border-l-primary/50">
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <CardTitle className="text-sm font-semibold">
                                    {kr.codigo && <span className="text-primary mr-2">{kr.codigo}</span>}
                                    {kr.kr}
                                  </CardTitle>
                                  {kr.tipo && <span className="text-xs text-muted-foreground">{kr.tipo}</span>}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <StatusBadge status={kr.status || ''} />
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditKr(kr)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteKr(kr.id)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              {/* KR details grid */}
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
                                {kr.fonte_dados && <div><span className="text-muted-foreground">Fonte:</span> {kr.fonte_dados}</div>}
                                {kr.datas_revisao && <div><span className="text-muted-foreground">Revisão:</span> {kr.datas_revisao}</div>}
                              </div>
                              {kr.entregas_esperadas && (
                                <p className="text-xs text-muted-foreground mb-4">
                                  <span className="font-medium">Entregas esperadas:</span> {kr.entregas_esperadas}
                                </p>
                              )}

                              {/* Plano de Ação */}
                              <div className="mt-2">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                    <ClipboardList className="h-3 w-3" /> Plano de Ação ({krAcoes.length})
                                  </h4>
                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAddAcao(kr.id)}>
                                    <Plus className="h-3 w-3 mr-1" /> Ação
                                  </Button>
                                </div>
                                {krAcoes.length > 0 && (
                                  <div className="rounded-md border overflow-hidden">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="text-xs">
                                          <TableHead className="w-10">Nº</TableHead>
                                          <TableHead>Ação</TableHead>
                                          <TableHead className="w-28">Responsável</TableHead>
                                          <TableHead className="w-24">Prazo</TableHead>
                                          <TableHead className="w-28">Status</TableHead>
                                          <TableHead className="w-16"></TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {krAcoes.map((acao) => (
                                          <TableRow key={acao.id} className="text-xs">
                                            <TableCell>{acao.numero}</TableCell>
                                            <TableCell>{acao.acao}</TableCell>
                                            <TableCell>{acao.responsavel || '—'}</TableCell>
                                            <TableCell>{acao.prazo || '—'}</TableCell>
                                            <TableCell><StatusBadge status={acao.status || ''} /></TableCell>
                                            <TableCell>
                                              <div className="flex gap-1">
                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleEditAcao(acao)}>
                                                  <Pencil className="h-3 w-3" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDeleteAcao(acao.id)}>
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                              </div>
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

      {/* Dialog: Objetivo */}
      <FormDialog open={objDialogOpen} onOpenChange={setObjDialogOpen} title={editingObjId ? 'Editar Objetivo' : 'Novo Objetivo'} onSubmit={handleSubmitObj} loading={saving}>
        <div className="grid gap-4">
          <div>
            <Label>Objetivo *</Label>
            <Input value={objForm.objetivo} onChange={(e) => setObjForm({ ...objForm, objetivo: e.target.value })} placeholder="Descreva o objetivo" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Ciclo *</Label>
              <Select value={objForm.ciclo} onValueChange={(v) => setObjForm({ ...objForm, ciclo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025.1">2025.1</SelectItem>
                  <SelectItem value="2025.2">2025.2</SelectItem>
                  <SelectItem value="2026.1">2026.1</SelectItem>
                  <SelectItem value="2026.2">2026.2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={objForm.status} onValueChange={(v) => setObjForm({ ...objForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Em andamento">Em andamento</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                  <SelectItem value="Atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Responsável</Label>
            <Input value={objForm.responsavel} onChange={(e) => setObjForm({ ...objForm, responsavel: e.target.value })} />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={objForm.observacoes} onChange={(e) => setObjForm({ ...objForm, observacoes: e.target.value })} />
          </div>
          <div>
            <Label>Observação da Reunião</Label>
            <Textarea value={objForm.observacao_reuniao} onChange={(e) => setObjForm({ ...objForm, observacao_reuniao: e.target.value })} />
          </div>
        </div>
      </FormDialog>

      {/* Dialog: Key Result */}
      <FormDialog open={krDialogOpen} onOpenChange={setKrDialogOpen} title={editingKrId ? 'Editar Key Result' : 'Nova Ficha de KR'} onSubmit={handleSubmitKr} loading={saving}>
        <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Código (ex: KR1.1)</Label>
              <Input value={krForm.codigo} onChange={(e) => setKrForm({ ...krForm, codigo: e.target.value })} placeholder="KR1.1" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={krForm.tipo} onValueChange={(v) => setKrForm({ ...krForm, tipo: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Entrega/Implementação">Entrega/Implementação</SelectItem>
                  <SelectItem value="Resultado">Resultado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Descrição do KR *</Label>
            <Textarea value={krForm.kr} onChange={(e) => setKrForm({ ...krForm, kr: e.target.value })} placeholder="Descreva o resultado-chave" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Líder</Label>
              <Input value={krForm.lider} onChange={(e) => setKrForm({ ...krForm, lider: e.target.value })} />
            </div>
            <div>
              <Label>Responsável</Label>
              <Input value={krForm.responsavel} onChange={(e) => setKrForm({ ...krForm, responsavel: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Equipe</Label>
            <Input value={krForm.equipe} onChange={(e) => setKrForm({ ...krForm, equipe: e.target.value })} placeholder="Membros da equipe" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Meta</Label>
              <Input type="number" value={krForm.meta} onChange={(e) => setKrForm({ ...krForm, meta: e.target.value })} />
            </div>
            <div>
              <Label>Valor Atual</Label>
              <Input type="number" value={krForm.valor_atual} onChange={(e) => setKrForm({ ...krForm, valor_atual: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">ℹ️ O % de progresso é calculado automaticamente com base na conclusão das ações do plano de ação.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Periodicidade</Label>
              <Select value={krForm.periodicidade} onValueChange={(v) => setKrForm({ ...krForm, periodicidade: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mensal">Mensal</SelectItem>
                  <SelectItem value="Bimestral">Bimestral</SelectItem>
                  <SelectItem value="Trimestral">Trimestral</SelectItem>
                  <SelectItem value="Semestral">Semestral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={krForm.status} onValueChange={(v) => setKrForm({ ...krForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Em andamento">Em andamento</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                  <SelectItem value="Atrasado">Atrasado</SelectItem>
                  <SelectItem value="A iniciar">A iniciar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Baseline</Label>
            <Input value={krForm.baseline} onChange={(e) => setKrForm({ ...krForm, baseline: e.target.value })} placeholder="Valor de referência inicial" />
          </div>
          <div>
            <Label>Fonte de Dados</Label>
            <Input value={krForm.fonte_dados} onChange={(e) => setKrForm({ ...krForm, fonte_dados: e.target.value })} />
          </div>
          <div>
            <Label>Entregas Finais Esperadas</Label>
            <Textarea value={krForm.entregas_esperadas} onChange={(e) => setKrForm({ ...krForm, entregas_esperadas: e.target.value })} />
          </div>
          <div>
            <Label>Datas de Revisão</Label>
            <Input value={krForm.datas_revisao} onChange={(e) => setKrForm({ ...krForm, datas_revisao: e.target.value })} placeholder="Ex: Mar, Jun, Set" />
          </div>
        </div>
      </FormDialog>

      {/* Dialog: Ação */}
      <FormDialog open={acaoDialogOpen} onOpenChange={setAcaoDialogOpen} title={editingAcaoId ? 'Editar Ação' : 'Nova Ação'} onSubmit={handleSubmitAcao} loading={saving}>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nº</Label>
              <Input type="number" value={acaoForm.numero} onChange={(e) => setAcaoForm({ ...acaoForm, numero: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={acaoForm.status} onValueChange={(v) => setAcaoForm({ ...acaoForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A iniciar">A iniciar</SelectItem>
                  <SelectItem value="Em andamento">Em andamento</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                  <SelectItem value="Atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Descrição da Ação *</Label>
            <Textarea value={acaoForm.acao} onChange={(e) => setAcaoForm({ ...acaoForm, acao: e.target.value })} placeholder="Descreva a ação" />
          </div>
          <div>
            <Label>Responsável</Label>
            <Input value={acaoForm.responsavel} onChange={(e) => setAcaoForm({ ...acaoForm, responsavel: e.target.value })} />
          </div>
          <div>
            <Label>Prazo</Label>
            <Input type="date" value={acaoForm.prazo} onChange={(e) => setAcaoForm({ ...acaoForm, prazo: e.target.value })} />
          </div>
        </div>
      </FormDialog>
    </MainLayout>
  );
}
