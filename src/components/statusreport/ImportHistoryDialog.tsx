import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchImportDetail, type SrImport } from '@/hooks/useStatusReport';

export default function ImportHistoryDialog({
  open,
  onOpenChange,
  imports,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  imports: SrImport[];
}) {
  const [selected, setSelected] = useState<SrImport | null>(null);
  const [detail, setDetail] = useState<{ logs: any[]; changes: any[] } | null>(null);

  useEffect(() => {
    if (!selected) return;
    setDetail(null);
    fetchImportDetail(selected.id).then(setDetail).catch(() => setDetail({ logs: [], changes: [] }));
  }, [selected?.id]);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSelected(null); }}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Histórico de Importações</DialogTitle>
        </DialogHeader>

        {!selected ? (
          <ScrollArea className="max-h-[65vh]">
            {imports.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma importação registrada.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead className="text-right">ROs</TableHead>
                    <TableHead className="text-right">OSs</TableHead>
                    <TableHead className="text-right">Épicos</TableHead>
                    <TableHead className="text-right">Novos</TableHead>
                    <TableHead className="text-right">Alterados</TableHead>
                    <TableHead className="text-right">Ausentes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Duração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imports.map((i) => (
                    <TableRow key={i.id} className="cursor-pointer" onClick={() => setSelected(i)}>
                      <TableCell>{new Date(i.imported_at).toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{i.filename}</TableCell>
                      <TableCell className="text-xs">{i.imported_by_email ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{i.total_ros}</TableCell>
                      <TableCell className="text-right tabular-nums">{i.total_oss}</TableCell>
                      <TableCell className="text-right tabular-nums">{i.total_epics}</TableCell>
                      <TableCell className="text-right tabular-nums">{i.new_ros}</TableCell>
                      <TableCell className="text-right tabular-nums">{i.changed_ros}</TableCell>
                      <TableCell className="text-right tabular-nums">{i.missing_ros}</TableCell>
                      <TableCell>
                        <Badge variant={i.status === 'completed' ? 'secondary' : 'outline'}>{i.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {i.duration_ms ? `${(i.duration_ms / 1000).toFixed(1)}s` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        ) : (
          <ScrollArea className="max-h-[65vh] pr-3">
            <button className="mb-3 text-sm text-primary hover:underline" onClick={() => setSelected(null)}>
              ← Voltar para a lista
            </button>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="rounded border border-border p-2">Arquivo: <b>{selected.filename}</b></div>
                <div className="rounded border border-border p-2">Hash: <span className="font-mono text-[10px]">{selected.file_hash.slice(0, 16)}…</span></div>
                <div className="rounded border border-border p-2">
                  Status Report: <b>{selected.source_generated_at ? new Date(selected.source_generated_at).toLocaleString('pt-BR') : '—'}</b>
                </div>
                <div className="rounded border border-border p-2">
                  Anterior: <b>{selected.previous_import_id ? 'sim' : 'primeira carga'}</b>
                </div>
              </div>

              <div>
                <h4 className="mb-1 font-semibold">Logs</h4>
                {!detail ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : detail.logs.length === 0 ? (
                  <p className="text-muted-foreground">Sem logs.</p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {detail.logs.map((l) => (
                      <li key={l.id} className="flex gap-2 rounded border border-border px-2 py-1">
                        <Badge variant={l.level === 'error' ? 'destructive' : l.level === 'warning' ? 'outline' : 'secondary'} className="h-4 px-1 text-[10px]">
                          {l.level}
                        </Badge>
                        <span className="text-muted-foreground">{l.stage}</span>
                        <span>{l.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4 className="mb-1 font-semibold">Mudanças detectadas ({detail?.changes.length ?? 0})</h4>
                {detail && detail.changes.length > 0 && (
                  <ul className="space-y-1 text-xs">
                    {detail.changes.slice(0, 300).map((c) => (
                      <li key={c.id} className="rounded border border-border px-2 py-1">
                        <b>#{c.status_report_ros?.numero ?? '—'}</b> {c.status_report_ros?.titulo ?? ''} —{' '}
                        <span className="text-muted-foreground">{c.change_type}</span>
                        {c.field_name && (
                          <>
                            {' '}({c.field_name}: {c.old_value ?? '—'} → {c.new_value ?? '—'})
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
