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

interface Decisao { id: string; data: string | null; tema: string; decisao: string | null; justificativa: string | null; responsavel: string | null; impacto: string | null; status: string | null; }
const defaultForm = { data: '', tema: '', decisao: '', justificativa: '', responsavel: '', impacto: '', status: 'Implementada' };

export default function Decisoes() {
  const [data, setData] = useState<Decisao[]>([]); const [loading, setLoading] = useState(true); const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false); const [editingId, setEditingId] = useState<string | null>(null); const [form, setForm] = useState(defaultForm);
  const { toast } = useToast(); const { user } = useAuth();

  const fetchData = async () => { setLoading(true); const { data, error } = await supabase.from('decisoes').select('*').order('data', { ascending: false }); if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' }); else setData(data || []); setLoading(false); };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = () => { setForm(defaultForm); setEditingId(null); setDialogOpen(true); };
  const handleEdit = (item: Decisao) => { setForm({ data: item.data || '', tema: item.tema, decisao: item.decisao || '', justificativa: item.justificativa || '', responsavel: item.responsavel || '', impacto: item.impacto || '', status: item.status || 'Implementada' }); setEditingId(item.id); setDialogOpen(true); };
  const handleDelete = async (item: Decisao) => { const { error } = await supabase.from('decisoes').delete().eq('id', item.id); if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' }); else { toast({ title: 'Sucesso', description: 'Decisão excluída' }); fetchData(); } };
  const handleSubmit = async () => {
    if (!form.tema) { toast({ title: 'Erro', description: 'Tema é obrigatório', variant: 'destructive' }); return; }
    setSaving(true); const payload = { ...form, data: form.data || null };
    if (editingId) { const { error } = await supabase.from('decisoes').update(payload).eq('id', editingId); if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' }); else { toast({ title: 'Sucesso', description: 'Decisão atualizada' }); setDialogOpen(false); fetchData(); } }
    else { const { error } = await supabase.from('decisoes').insert({ ...payload, user_id: user?.id }); if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' }); else { toast({ title: 'Sucesso', description: 'Decisão criada' }); setDialogOpen(false); fetchData(); } }
    setSaving(false);
  };

  const columns: Column<Decisao>[] = [{ key: 'tema', label: 'Tema' }, { key: 'data', label: 'Data' }, { key: 'responsavel', label: 'Responsável' }, { key: 'impacto', label: 'Impacto' }, { key: 'status', label: 'Status', render: (item) => <StatusBadge status={item.status || ''} /> }];

  return (
    <MainLayout>
      <ModuleHeader title="Decisões" description="Registro de Decisões Institucionais" onAdd={handleAdd} addLabel="Nova Decisão" />
      <DataTable data={data} columns={columns} onEdit={handleEdit} onDelete={handleDelete} loading={loading} emptyMessage="Nenhuma decisão cadastrada" />
      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editingId ? 'Editar Decisão' : 'Nova Decisão'} onSubmit={handleSubmit} loading={saving}>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4"><div><Label>Tema *</Label><Input value={form.tema} onChange={(e) => setForm({ ...form, tema: e.target.value })} /></div><div><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div></div>
          <div><Label>Decisão</Label><Textarea value={form.decisao} onChange={(e) => setForm({ ...form, decisao: e.target.value })} /></div>
          <div><Label>Justificativa</Label><Textarea value={form.justificativa} onChange={(e) => setForm({ ...form, justificativa: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4"><div><Label>Responsável</Label><Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div><div><Label>Impacto</Label><Input value={form.impacto} onChange={(e) => setForm({ ...form, impacto: e.target.value })} /></div></div>
          <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Implementada">Implementada</SelectItem><SelectItem value="Em implementação">Em implementação</SelectItem><SelectItem value="Pendente">Pendente</SelectItem></SelectContent></Select></div>
        </div>
      </FormDialog>
    </MainLayout>
  );
}
