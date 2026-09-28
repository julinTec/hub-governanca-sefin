import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { fmtDateBr } from '@/lib/utils';

const STATUS = ['A iniciar', 'Em andamento', 'Concluído', 'Atrasado'];

interface Acao { id: string; key_result_id: string; acao: string; responsavel: string | null; prazo: string | null; status: string | null; }
interface Kr { id: string; codigo: string | null; kr: string; }

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  acoes: Acao[];
  keyResults: Kr[];
  onStatusChanged: (id: string, status: string) => void;
}

export default function OKRAcoesPorData({ open, onOpenChange, acoes, keyResults, onStatusChanged }: Props) {
  const { toast } = useToast();
  const [busca, setBusca] = useState('');
  const [resp, setResp] = useState('all');
  const [st, setSt] = useState('all');
  const today = new Date().toISOString().slice(0, 10);

  const krMap = useMemo(() => new Map(keyResults.map((k) => [k.id, k])), [keyResults]);
  const responsaveis = useMemo(
    () => Array.from(new Set(acoes.map((a) => a.responsavel?.trim()).filter(Boolean) as string[])).sort(),
    [acoes],
  );

  const rows = useMemo(() => {
    const q = busca.toLowerCase().replace(/\s+/g, '');
    return acoes
      .filter((a) => {
        const kr = krMap.get(a.key_result_id);
        if (resp !== 'all' && a.responsavel?.trim() !== resp) return false;
        if (st !== 'all' && (a.status || 'A iniciar') !== st) return false;
        if (q) {
          const hay = `${kr?.codigo || ''}${a.acao}`.toLowerCase().replace(/\s+/g, '');
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (!a.prazo && !b.prazo) return 0;
        if (!a.prazo) return 1;
        if (!b.prazo) return -1;
        return a.prazo.localeCompare(b.prazo);
      });
  }, [acoes, krMap, busca, resp, st]);

  const changeStatus = async (id: string, status: string) => {
    onStatusChanged(id, status);
    const { error } = await supabase.from('okr_acoes').update({ status }).eq('id', id);
    if (error) toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    else toast({ title: 'Status atualizado' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Ações por Data ({rows.length})</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por KR ou ação" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <Select value={resp} onValueChange={setResp}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              {responsaveis.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={st} onValueChange={setSt}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 overflow-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-muted">
              <TableRow>
                <TableHead className="w-24">KR</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead className="w-40">Responsável</TableHead>
                <TableHead className="w-28">Data</TableHead>
                <TableHead className="w-44">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => {
                const kr = krMap.get(a.key_result_id);
                const vencida = !!a.prazo && a.prazo < today && a.status !== 'Concluído';
                return (
                  <TableRow key={a.id} className="text-sm">
                    <TableCell className="font-semibold whitespace-nowrap">{kr?.codigo || '—'}</TableCell>
                    <TableCell>{a.acao}</TableCell>
                    <TableCell>{a.responsavel || '—'}</TableCell>
                    <TableCell className={vencida ? 'text-destructive font-semibold' : ''}>{fmtDateBr(a.prazo)}</TableCell>
                    <TableCell>
                      <Select value={a.status || 'A iniciar'} onValueChange={(v) => changeStatus(a.id, v)}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma ação encontrada</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
