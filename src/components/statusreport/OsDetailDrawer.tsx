import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Loader2 } from 'lucide-react';
import { fetchOsHistory, type SrEpic, type SrOs, type SrRo } from '@/hooks/useStatusReport';

const normalize = (v?: string | null) =>
  (v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-words">{value ?? '—'}</p>
    </div>
  );
}

export default function OsDetailDrawer({
  os,
  epics,
  ros,
  onClose,
  onSelectRo,
}: {
  os: SrOs | null;
  epics: SrEpic[];
  ros: SrRo[];
  onClose: () => void;
  onSelectRo: (ro: SrRo) => void;
}) {
  const [history, setHistory] = useState<any[] | null>(null);

  useEffect(() => {
    if (!os) return;
    setHistory(null);
    fetchOsHistory(os.id).then(setHistory).catch(() => setHistory([]));
  }, [os?.id]);

  if (!os) return null;

  const relatedEpics = epics.filter((e) => e.source === 'jira' && e.numero_os !== null && e.numero_os === os.numero);
  const epicNames = new Set(relatedEpics.map((e) => normalize(e.titulo)));
  const relatedRos = ros.filter((r) => epicNames.has(normalize(r.epico_nome)));

  return (
    <Sheet open={!!os} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="pr-6 text-left">
            <span className="text-muted-foreground">OS #{os.numero ?? '—'}</span> {os.titulo ?? ''}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge variant="secondary">{os.status_canonico || os.status_atual || '—'}</Badge>
          {os.responsavel && <Badge variant="outline">Responsável: {os.responsavel}</Badge>}
          {!os.is_present_current_import && <Badge variant="outline">Ausente na carga atual</Badge>}
        </div>

        {os.sydle_url && (
          <Button asChild variant="outline" size="sm" className="mt-3">
            <a href={os.sydle_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Abrir no Sydle
            </a>
          </Button>
        )}

        <Separator className="my-4" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo de OS" value={os.tipo_os} />
          <Field label="Subprojeto" value={os.subprojeto} />
          <Field label="Solicitante" value={os.solicitante} />
          <Field label="Status (original)" value={os.status_atual} />
          <Field label="Esforço" value={os.quantidade_esforco_fmt || os.quantidade_esforco} />
          <Field label="Valor do esforço" value={os.valor_esforco_fmt} />
          <Field label="Executado" value={os.quantidade_executada ?? '—'} />
          <Field label="Valor executado" value={os.valor_executado_fmt} />
          <Field
            label="Previsão de homologação"
            value={os.data_prevista_homologacao ? new Date(`${os.data_prevista_homologacao}T12:00:00`).toLocaleDateString('pt-BR') : '—'}
          />
          <Field
            label="Homologação"
            value={os.data_homologacao ? new Date(`${os.data_homologacao}T12:00:00`).toLocaleDateString('pt-BR') : '—'}
          />
        </div>

        <Separator className="my-4" />
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Épicos relacionados ({relatedEpics.length})
        </h3>
        {relatedEpics.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum épico vinculado a esta OS na origem dos dados.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {relatedEpics.map((e) => (
              <li key={e.id} className="rounded border border-border px-2 py-1">
                <span className="text-muted-foreground">{e.key}</span> {e.titulo}
                {e.status && <span className="ml-1 text-xs text-muted-foreground">· {e.status}</span>}
              </li>
            ))}
          </ul>
        )}

        <Separator className="my-4" />
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          ROs relacionadas ({relatedRos.length})
        </h3>
        <p className="mb-2 text-xs text-muted-foreground">
          Relação derivada da correspondência entre o nome do épico da RO e o épico vinculado à OS. ROs sem
          correspondência confiável não são exibidas aqui.
        </p>
        {relatedRos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma RO com vínculo confiável.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {relatedRos.map((r) => (
              <li key={r.id}>
                <button
                  className="w-full rounded border border-border px-2 py-1 text-left hover:border-primary/40 hover:bg-muted/50"
                  onClick={() => onSelectRo(r)}
                >
                  <span className="text-muted-foreground">#{r.numero}</span> {r.titulo}
                  {r.prioritario && <Badge className="ml-1 bg-destructive text-destructive-foreground">P</Badge>}
                </button>
              </li>
            ))}
          </ul>
        )}

        <Separator className="my-4" />
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Histórico da OS</h3>
        {history === null ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum snapshot registrado.</p>
        ) : (
          <ol className="relative space-y-3 border-l border-border pl-4">
            {history.map((h) => (
              <li key={h.import_id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                <p className="text-xs text-muted-foreground">{new Date(h.imported_at).toLocaleDateString('pt-BR')}</p>
                <p className="text-sm font-medium">{h.status_canonico || h.status_atual || '—'}</p>
                <p className="text-xs text-muted-foreground">
                  Responsável: {h.responsavel ?? '—'} · Esforço: {h.quantidade_esforco ?? '—'}
                </p>
              </li>
            ))}
          </ol>
        )}
      </SheetContent>
    </Sheet>
  );
}
