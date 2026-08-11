import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Loader2 } from 'lucide-react';
import { cleanScaleLabel, getRoStatusDef, valorPorEsforco } from '@/lib/statusReport/config';
import { fetchRoHistory, type RoHistoryEntry, type SrRo } from '@/hooks/useStatusReport';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-words">{value ?? '—'}</p>
    </div>
  );
}

export default function RoDetailDrawer({ ro, onClose }: { ro: SrRo | null; onClose: () => void }) {
  const [history, setHistory] = useState<RoHistoryEntry[] | null>(null);

  useEffect(() => {
    if (!ro) return;
    setHistory(null);
    fetchRoHistory(ro.id).then(setHistory).catch(() => setHistory([]));
  }, [ro?.id]);

  if (!ro) return null;
  const vpe = valorPorEsforco(ro.grau, ro.esforco);

  return (
    <Sheet open={!!ro} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="pr-6 text-left">
            <span className="text-muted-foreground">#{ro.numero ?? '—'}</span> {ro.titulo ?? 'RO sem título'}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge variant="secondary">{getRoStatusDef(ro.status_key).label}</Badge>
          {ro.prioritario && <Badge className="bg-destructive text-destructive-foreground">Prioritário</Badge>}
          {!ro.is_present_current_import && <Badge variant="outline">Ausente na carga atual</Badge>}
        </div>

        {ro.sydle_url && (
          <Button asChild variant="outline" size="sm" className="mt-3">
            <a href={ro.sydle_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Abrir no Sydle
            </a>
          </Button>
        )}

        <Separator className="my-4" />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Status (original)" value={ro.status} />
          <Field label="Épico" value={ro.epico_nome} />
          <Field label="Tipo" value={ro.tipo} />
          <Field label="Tipo de validação" value={ro.tipo_validacao} />
          <Field label="Solicitante" value={ro.solicitante} />
          <Field label="Subprojeto" value={ro.subprojeto} />
          <Field label="Prioridade" value={`${ro.prioridade ?? '—'}${ro.prioridade_nota !== null ? ` (${ro.prioridade_nota})` : ''}`} />
          <Field label="Impacto" value={cleanScaleLabel(ro.impacto)} />
          <Field label="Urgência" value={cleanScaleLabel(ro.urgencia)} />
          <Field label="Grau" value={ro.grau ?? '—'} />
          <Field label="Esforço" value={ro.esforco ?? '—'} />
          <Field label="Tempo estimado" value={ro.tempo_estimado_horas !== null ? `${ro.tempo_estimado_horas}h` : '—'} />
          <Field label="Previsão de atendimento" value={ro.previsao_atendimento ? new Date(`${ro.previsao_atendimento}T12:00:00`).toLocaleDateString('pt-BR') : '—'} />
          <Field label="Valor por Esforço" value={vpe !== null ? vpe.toFixed(2) : '—'} />
          <Field label="Sydle ID" value={ro.sydle_id} />
          <Field label="Visto pela primeira vez" value={new Date(ro.first_seen_at).toLocaleDateString('pt-BR')} />
        </div>

        <Separator className="my-4" />

        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Histórico do RO</h3>
        {history === null ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum snapshot registrado.</p>
        ) : (
          <ol className="relative space-y-3 border-l border-border pl-4">
            {history.map((h, i) => {
              const prev = i > 0 ? history[i - 1] : null;
              const changed = prev && prev.status !== h.status;
              return (
                <li key={h.import_id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                  <p className="text-xs text-muted-foreground">
                    {h.source_generated_at
                      ? new Date(h.source_generated_at).toLocaleDateString('pt-BR')
                      : new Date(h.imported_at).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-sm font-medium">{h.status ?? '—'}</p>
                  {changed && (
                    <p className="text-xs text-muted-foreground">
                      {prev!.status} <span>→</span> {h.status}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Prioridade: {h.prioridade ?? '—'} · Impacto: {cleanScaleLabel(h.impacto)} · Esforço: {h.esforco ?? '—'}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </SheetContent>
    </Sheet>
  );
}
