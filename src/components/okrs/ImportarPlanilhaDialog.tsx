import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Upload, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { parseOkrWorkbook, normalizeText, ParsedKR, ParsedSheet } from '@/lib/okrImport';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
  userId: string | undefined;
}

type DupAction = 'ignorar' | 'atualizar' | 'copia';

interface KrRow extends ParsedKR {
  selected: boolean;
  existingId: string | null;
  existingObjetivoId: string | null;
  dupAction: DupAction;
}

export default function ImportarPlanilhaDialog({ open, onOpenChange, onImported, userId }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<'upload' | 'loading' | 'preview' | 'saving'>('upload');
  const [parsed, setParsed] = useState<ParsedSheet | null>(null);
  const [rows, setRows] = useState<KrRow[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('upload'); setParsed(null); setRows([]); setError(null); setDragOver(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const processFile = useCallback(async (file: File) => {
    setError(null);
    setStep('loading');
    try {
      const buf = await file.arrayBuffer();
      const result = parseOkrWorkbook(buf);
      if (result.krs.length === 0) {
        setError('Nenhuma aba no padrão "KR X.Y" encontrada na planilha.');
        setStep('upload');
        return;
      }
      // Buscar existentes para detectar duplicidade
      const [{ data: objs }, { data: krs }] = await Promise.all([
        supabase.from('okr_objetivos').select('id, objetivo'),
        supabase.from('okr_key_results').select('id, codigo, objetivo_id'),
      ]);
      const objByNorm = new Map<string, string>();
      (objs || []).forEach((o: any) => objByNorm.set(normalizeText(o.objetivo), o.id));
      const krByCodigo = new Map<string, { id: string; objetivo_id: string }>();
      (krs || []).forEach((k: any) => {
        if (k.codigo) krByCodigo.set(k.codigo.replace(/\s+/g, '').toLowerCase(), { id: k.id, objetivo_id: k.objetivo_id });
      });

      const newRows: KrRow[] = result.krs.map(kr => {
        const existing = krByCodigo.get(kr.codigo.replace(/\s+/g, '').toLowerCase()) || null;
        return {
          ...kr,
          selected: true,
          existingId: existing?.id || null,
          existingObjetivoId: existing?.objetivo_id || objByNorm.get(normalizeText(kr.objetivoTexto)) || null,
          dupAction: 'atualizar',
        };
      });
      setParsed(result);
      setRows(newRows);
      setStep('preview');
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao ler planilha: ${err.message || err}`);
      setStep('upload');
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const updateRow = (idx: number, patch: Partial<KrRow>) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleConfirm = async () => {
    if (!userId) { toast({ title: 'Usuário não autenticado', variant: 'destructive' }); return; }
    setStep('saving');
    try {
      const selected = rows.filter(r => r.selected);
      // 1) Recarregar objetivos existentes
      const { data: existingObjs } = await supabase.from('okr_objetivos').select('id, objetivo');
      const objByNorm = new Map<string, string>();
      (existingObjs || []).forEach((o: any) => objByNorm.set(normalizeText(o.objetivo), o.id));

      // 2) Criar objetivos faltantes
      const objsToCreate = new Map<string, string>(); // norm -> texto
      selected.forEach(r => {
        if (!r.objetivoTexto) return;
        const norm = normalizeText(r.objetivoTexto);
        if (!objByNorm.has(norm) && !objsToCreate.has(norm)) objsToCreate.set(norm, r.objetivoTexto);
      });
      if (objsToCreate.size > 0) {
        const payload = Array.from(objsToCreate.entries()).map(([, texto]) => ({
          objetivo: texto, ciclo: '2026.1', status: 'Em andamento', responsavel: 'Envolvidos no processo', user_id: userId,
        }));
        const { data: inserted, error } = await supabase.from('okr_objetivos').insert(payload).select('id, objetivo');
        if (error) throw error;
        (inserted || []).forEach((o: any) => objByNorm.set(normalizeText(o.objetivo), o.id));
      }

      let createdKrs = 0, updatedKrs = 0, skippedKrs = 0, createdAcoes = 0;

      for (const r of selected) {
        const objetivo_id = r.existingObjetivoId || objByNorm.get(normalizeText(r.objetivoTexto));
        if (!objetivo_id) { skippedKrs++; continue; }

        let krId: string | null = null;

        if (r.existingId) {
          if (r.dupAction === 'ignorar') { skippedKrs++; continue; }
          if (r.dupAction === 'atualizar') {
            const { error } = await supabase.from('okr_key_results').update({
              kr: r.kr, codigo: r.codigo, tipo: r.tipo, periodicidade: r.periodicidade,
              baseline: r.baseline, fonte_dados: r.fonte_dados, lider: r.lider, responsavel: r.lider,
              equipe: r.equipe, entregas_esperadas: r.entregas_esperadas, datas_revisao: r.datas_revisao,
              status: r.status,
            }).eq('id', r.existingId);
            if (error) throw error;
            krId = r.existingId; updatedKrs++;
          } else if (r.dupAction === 'copia') {
            const { data, error } = await supabase.from('okr_key_results').insert({
              objetivo_id, kr: r.kr, codigo: `${r.codigo}-cópia`, tipo: r.tipo,
              periodicidade: r.periodicidade, baseline: r.baseline, fonte_dados: r.fonte_dados,
              lider: r.lider, responsavel: r.lider, equipe: r.equipe,
              entregas_esperadas: r.entregas_esperadas, datas_revisao: r.datas_revisao, status: r.status,
            }).select('id').single();
            if (error) throw error;
            krId = data.id; createdKrs++;
          }
        } else {
          const { data, error } = await supabase.from('okr_key_results').insert({
            objetivo_id, kr: r.kr, codigo: r.codigo, tipo: r.tipo,
            periodicidade: r.periodicidade, baseline: r.baseline, fonte_dados: r.fonte_dados,
            lider: r.lider, responsavel: r.lider, equipe: r.equipe,
            entregas_esperadas: r.entregas_esperadas, datas_revisao: r.datas_revisao, status: r.status,
          }).select('id').single();
          if (error) throw error;
          krId = data.id; createdKrs++;
        }

        if (krId && r.acoes.length > 0) {
          const acoesPayload = r.acoes.map(a => ({
            key_result_id: krId, user_id: userId, numero: a.numero,
            acao: a.acao || '(sem descrição)', responsavel: a.responsavel,
            prazo: a.prazo, status: a.status,
          }));
          // Para "atualizar", apaga ações antigas e reinsere
          if (r.existingId && r.dupAction === 'atualizar') {
            await supabase.from('okr_acoes').delete().eq('key_result_id', krId);
          }
          const { error } = await supabase.from('okr_acoes').insert(acoesPayload);
          if (error) throw error;
          createdAcoes += acoesPayload.length;
        }
      }

      toast({
        title: 'Importação concluída com sucesso',
        description: `${createdKrs} KR(s) criado(s), ${updatedKrs} atualizado(s), ${skippedKrs} ignorado(s), ${createdAcoes} ação(ões) salva(s).`,
      });
      onImported();
      handleClose(false);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro na importação', description: err.message || String(err), variant: 'destructive' });
      setStep('preview');
    }
  };

  const selectedCount = rows.filter(r => r.selected).length;
  const totalAcoesSelected = rows.filter(r => r.selected).reduce((acc, r) => acc + r.acoes.length, 0);
  const novosObjetivos = (() => {
    if (!parsed) return 0;
    const set = new Set<string>();
    rows.filter(r => r.selected && r.objetivoTexto && !r.existingObjetivoId).forEach(r => set.add(normalizeText(r.objetivoTexto)));
    return set.size;
  })();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Planilha de OKRs</DialogTitle>
          <DialogDescription>
            Envie a planilha .xlsx no padrão "Ficha KRs 2026.1-SEFIN" para importar Objetivos, KRs e Plano de Ação.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'
              }`}
            >
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Arraste o arquivo .xlsx aqui ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-1">Apenas abas no formato "KR X.Y" serão importadas</p>
              <Input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={onFileChange}
              />
            </div>
            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {step === 'loading' && (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
            <p className="text-muted-foreground">Lendo planilha e identificando OKRs...</p>
          </div>
        )}

        {step === 'saving' && (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
            <p className="text-muted-foreground">Salvando objetivos, KRs e ações...</p>
          </div>
        )}

        {step === 'preview' && parsed && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{novosObjetivos}</div><div className="text-xs text-muted-foreground">Novos objetivos</div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{selectedCount}</div><div className="text-xs text-muted-foreground">KRs selecionados</div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{totalAcoesSelected}</div><div className="text-xs text-muted-foreground">Ações</div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{rows.filter(r => r.existingId).length}</div><div className="text-xs text-muted-foreground">KRs já existentes</div></CardContent></Card>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
              {rows.map((r, idx) => (
                <Card key={r.sheetName} className={r.selected ? '' : 'opacity-50'}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={r.selected}
                        onCheckedChange={(c) => updateRow(idx, { selected: !!c })}
                        className="mt-1"
                      />
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Código</label>
                          <Input value={r.codigo} onChange={(e) => updateRow(idx, { codigo: e.target.value })} className="h-8" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Líder</label>
                          <Input value={r.lider || ''} onChange={(e) => updateRow(idx, { lider: e.target.value })} className="h-8" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs text-muted-foreground">Descrição do KR</label>
                          <Input value={r.kr} onChange={(e) => updateRow(idx, { kr: e.target.value })} className="h-8" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs text-muted-foreground">Objetivo relacionado</label>
                          <Input value={r.objetivoTexto} disabled className="h-8 bg-muted" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Equipe</label>
                          <Input value={r.equipe || ''} onChange={(e) => updateRow(idx, { equipe: e.target.value })} className="h-8" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Periodicidade</label>
                          <Input value={r.periodicidade || ''} onChange={(e) => updateRow(idx, { periodicidade: e.target.value })} className="h-8" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Status</label>
                          <Select value={r.status} onValueChange={(v) => updateRow(idx, { status: v })}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A iniciar">A iniciar</SelectItem>
                              <SelectItem value="Em andamento">Em andamento</SelectItem>
                              <SelectItem value="Concluído">Concluído</SelectItem>
                              <SelectItem value="Atrasado">Atrasado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {r.existingId && (
                          <div>
                            <label className="text-xs text-muted-foreground">KR já existe — ação</label>
                            <Select value={r.dupAction} onValueChange={(v) => updateRow(idx, { dupAction: v as DupAction })}>
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ignorar">Ignorar</SelectItem>
                                <SelectItem value="atualizar">Atualizar</SelectItem>
                                <SelectItem value="copia">Criar cópia</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-7">
                      <Badge variant="secondary">{r.acoes.length} ação(ões)</Badge>
                      {r.existingId && <Badge variant="outline">Já existente</Badge>}
                      {!r.existingObjetivoId && r.objetivoTexto && <Badge>Novo objetivo</Badge>}
                      {r.alerts.map((a, i) => (
                        <Badge key={i} variant="outline" className="text-amber-700 border-amber-300">
                          <AlertTriangle className="h-3 w-3 mr-1" />{a}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => reset()}>Trocar arquivo</Button>
              <Button onClick={handleConfirm} disabled={selectedCount === 0}>
                <Upload className="h-4 w-4 mr-2" />
                Confirmar importação ({selectedCount})
              </Button>
            </>
          )}
          {step === 'upload' && (
            <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
