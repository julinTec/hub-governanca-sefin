import { useCallback, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, FileCode2, Loader2, UploadCloud } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  commitImport,
  DuplicateImportError,
  prepareImport,
  type ImportPreview,
} from '@/lib/statusReport/importer';
import { ParseError } from '@/lib/statusReport/parser';

type Step = 'upload' | 'reading' | 'preview' | 'saving' | 'done';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: () => void;
}

export default function ImportStatusReportDialog({ open, onOpenChange, onImported }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [stageMsg, setStageMsg] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{ importId: string; durationMs: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('upload');
    setPreview(null);
    setErrorMsg(null);
    setResult(null);
    setStageMsg('');
  };

  const handleClose = (v: boolean) => {
    if (step === 'saving') return;
    onOpenChange(v);
    if (!v) setTimeout(reset, 200);
  };

  const handleFile = useCallback(async (file: File) => {
    setErrorMsg(null);
    if (!/\.html?$/i.test(file.name)) {
      setErrorMsg('Selecione um arquivo .html exportado do Status Report.');
      return;
    }
    setStep('reading');
    try {
      setStageMsg('Lendo arquivo...');
      const p = await prepareImport(file);
      setPreview(p);
      setStep('preview');
    } catch (e: any) {
      setStep('upload');
      if (e instanceof DuplicateImportError) {
        setErrorMsg(`Este arquivo já foi importado em ${new Date(e.importedAt).toLocaleString('pt-BR')}.`);
      } else if (e instanceof ParseError) {
        setErrorMsg(e.message);
      } else {
        setErrorMsg(e?.message || 'Não foi possível ler o arquivo.');
      }
    }
  }, []);

  const confirm = async () => {
    if (!preview) return;
    setStep('saving');
    try {
      const res = await commitImport(preview, (_stage, message) => setStageMsg(message));
      setResult({ importId: res.importId, durationMs: res.durationMs });
      setStep('done');
      onImported();
    } catch (e: any) {
      setStep('preview');
      setErrorMsg(e?.message || 'Falha ao persistir a importação. Nenhuma alteração foi concluída.');
      toast({ title: 'Importação falhou', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar Status Report</DialogTitle>
          <DialogDescription>
            Envie o arquivo .html exportado do Status Report. O arquivo é lido como texto — nenhum script é executado.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Não foi possível continuar</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {step === 'upload' && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
              dragging ? 'border-primary bg-primary/5' : 'border-border'
            }`}
          >
            <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">Arraste o arquivo HTML aqui</p>
            <p className="text-sm text-muted-foreground">ou</p>
            <Button className="mt-3" onClick={() => inputRef.current?.click()}>
              Selecionar arquivo
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".html,.htm,text/html"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
            />
          </div>
        )}

        {(step === 'reading' || step === 'saving') && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{stageMsg || 'Processando...'}</p>
          </div>
        )}

        {step === 'preview' && preview && (
          <ScrollArea className="max-h-[60vh] pr-3">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <FileCode2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{preview.filename}</span>
                <span className="text-muted-foreground">
                  {preview.parsed.generatedAt
                    ? `• Status Report de ${new Date(preview.parsed.generatedAt).toLocaleString('pt-BR')}`
                    : ''}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { l: 'ROs encontrados', v: preview.totals.ros },
                  { l: 'OSs encontradas', v: preview.totals.oss },
                  { l: 'Épicos encontrados', v: preview.totals.epics },
                ].map((k) => (
                  <div key={k.l} className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="text-[11px] uppercase text-muted-foreground">{k.l}</p>
                    <p className="text-xl font-semibold tabular-nums">{k.v}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Comparação com a carga anterior</p>
                {preview.previousImport ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {[
                      { l: 'Novos', v: preview.diff.newRos.length },
                      { l: 'Alterados', v: preview.diff.changedRos.length },
                      { l: 'Sem alteração', v: preview.diff.unchangedCount },
                      { l: 'Ausentes', v: preview.diff.missingRos.length },
                      { l: 'Retornaram', v: preview.diff.returnedRos.length },
                    ].map((k) => (
                      <div key={k.l} className="rounded-lg border border-border p-2 text-center">
                        <p className="text-[11px] uppercase text-muted-foreground">{k.l}</p>
                        <p className="text-lg font-semibold tabular-nums">{k.v}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Primeira carga — histórico ainda não disponível.</p>
                )}
              </div>

              {preview.diff.statusTransitions.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium">Mudanças de status</p>
                  <ul className="space-y-1 text-sm">
                    {preview.diff.statusTransitions.slice(0, 15).map((t) => (
                      <li key={`${t.from}-${t.to}`} className="flex items-center justify-between gap-2 rounded border border-border px-2 py-1">
                        <span className="truncate">
                          {t.from} <span className="text-muted-foreground">→</span> {t.to}
                        </span>
                        <Badge variant="secondary">{t.count}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-medium">Distribuição por status (normalizado)</p>
                <div className="flex flex-wrap gap-1.5">
                  {preview.statusDistribution.map((d) => (
                    <Badge key={d.key} variant="outline" className="font-normal">
                      {d.label}: <span className="ml-1 font-semibold">{d.count}</span>
                    </Badge>
                  ))}
                </div>
              </div>

              {preview.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{preview.warnings.length} aviso(s) de validação</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-1 max-h-32 list-disc space-y-0.5 overflow-y-auto pl-4 text-xs">
                      {preview.warnings.slice(0, 30).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => handleClose(false)}>
                  Cancelar
                </Button>
                <Button onClick={confirm}>Confirmar importação</Button>
              </div>
            </div>
          </ScrollArea>
        )}

        {step === 'done' && preview && result && (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-[hsl(var(--status-success))]" />
            <div>
              <p className="text-lg font-semibold">Importação concluída</p>
              <p className="text-sm text-muted-foreground">
                {preview.totals.ros} ROs, {preview.totals.oss} OSs e {preview.totals.epics} épicos processados em{' '}
                {(result.durationMs / 1000).toFixed(1)}s.
              </p>
            </div>
            <div className="mx-auto grid max-w-md grid-cols-2 gap-2 text-left text-sm">
              <div className="rounded border border-border p-2">Novos: <b>{preview.diff.newRos.length}</b></div>
              <div className="rounded border border-border p-2">Alterados: <b>{preview.diff.changedRos.length}</b></div>
              <div className="rounded border border-border p-2">Ausentes: <b>{preview.diff.missingRos.length}</b></div>
              <div className="rounded border border-border p-2">Retornaram: <b>{preview.diff.returnedRos.length}</b></div>
            </div>
            <Button onClick={() => handleClose(false)}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
