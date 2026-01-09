import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import ModuleHeader from '@/components/shared/ModuleHeader';
import DataTable, { Column } from '@/components/shared/DataTable';
import FormDialog from '@/components/shared/FormDialog';
import StatusBadge from '@/components/shared/StatusBadge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Reuniao { id: string; data: string | null; tema: string; participantes: string | null; decisoes: string | null; responsaveis: string | null; prazo: string | null; status: string | null; ata_gerada: string | null; }
const defaultForm = { data: '', tema: '', participantes: '', decisoes: '', responsaveis: '', prazo: '', status: 'Pendente', ata_gerada: '' };

export default function Reunioes() {
  const [data, setData] = useState<Reuniao[]>([]); const [loading, setLoading] = useState(true); const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false); const [editingId, setEditingId] = useState<string | null>(null); const [form, setForm] = useState(defaultForm);
  const [aiLoading, setAiLoading] = useState(false);
  const { toast } = useToast(); const { user } = useAuth();

  const fetchData = async () => { setLoading(true); const { data, error } = await supabase.from('reunioes').select('*').order('data', { ascending: false }); if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' }); else setData(data || []); setLoading(false); };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = () => { setForm(defaultForm); setEditingId(null); setDialogOpen(true); };
  const handleEdit = (item: Reuniao) => { setForm({ data: item.data || '', tema: item.tema, participantes: item.participantes || '', decisoes: item.decisoes || '', responsaveis: item.responsaveis || '', prazo: item.prazo || '', status: item.status || 'Pendente', ata_gerada: item.ata_gerada || '' }); setEditingId(item.id); setDialogOpen(true); };
  const handleDelete = async (item: Reuniao) => { const { error } = await supabase.from('reunioes').delete().eq('id', item.id); if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' }); else { toast({ title: 'Sucesso', description: 'Reunião excluída' }); fetchData(); } };
  const handleSubmit = async () => {
    if (!form.tema) { toast({ title: 'Erro', description: 'Tema é obrigatório', variant: 'destructive' }); return; }
    setSaving(true); const payload = { ...form, data: form.data || null, prazo: form.prazo || null };
    if (editingId) { const { error } = await supabase.from('reunioes').update(payload).eq('id', editingId); if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' }); else { toast({ title: 'Sucesso', description: 'Reunião atualizada' }); setDialogOpen(false); fetchData(); } }
    else { const { error } = await supabase.from('reunioes').insert({ ...payload, user_id: user?.id }); if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' }); else { toast({ title: 'Sucesso', description: 'Reunião criada' }); setDialogOpen(false); fetchData(); } }
    setSaving(false);
  };

  const handleAI = async () => {
    if (data.length === 0) { toast({ title: 'Aviso', description: 'Adicione reuniões primeiro', variant: 'destructive' }); return; }
    setAiLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-ai', { body: { type: 'ata-reuniao', data: data[0] } });
      if (error) throw error;
      toast({ title: 'Ata Gerada', description: result.ata || 'Ata gerada com sucesso!' });
    } catch { toast({ title: 'Erro', description: 'Erro ao gerar ata com IA', variant: 'destructive' }); }
    setAiLoading(false);
  };

  const columns: Column<Reuniao>[] = [{ key: 'tema', label: 'Tema' }, { key: 'data', label: 'Data' }, { key: 'participantes', label: 'Participantes' }, { key: 'status', label: 'Status', render: (item) => <StatusBadge status={item.status || ''} /> }];

  return (
    <MainLayout>
      <ModuleHeader title="Reuniões" description="Atas e Decisões" onAdd={handleAdd} addLabel="Nova Reunião" onAI={handleAI} aiLabel="Gerar Ata com IA" aiLoading={aiLoading} />
      <DataTable data={data} columns={columns} onEdit={handleEdit} onDelete={handleDelete} loading={loading} emptyMessage="Nenhuma reunião cadastrada" />
      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editingId ? 'Editar Reunião' : 'Nova Reunião'} onSubmit={handleSubmit} loading={saving}>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4"><div><Label>Tema *</Label><Input value={form.tema} onChange={(e) => setForm({ ...form, tema: e.target.value })} /></div><div><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div></div>
          <div><Label>Participantes</Label><Textarea value={form.participantes} onChange={(e) => setForm({ ...form, participantes: e.target.value })} /></div>
          <div><Label>Decisões</Label><Textarea value={form.decisoes} onChange={(e) => setForm({ ...form, decisoes: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4"><div><Label>Responsáveis</Label><Input value={form.responsaveis} onChange={(e) => setForm({ ...form, responsaveis: e.target.value })} /></div><div><Label>Prazo</Label><Input type="date" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} /></div></div>
          <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Pendente">Pendente</SelectItem><SelectItem value="Concluído">Concluído</SelectItem></SelectContent></Select></div>
        </div>
      </FormDialog>
    </MainLayout>
  );
}
