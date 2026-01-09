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

interface AgendaItem {
  id: string;
  tipo: string | null;
  atividade: string;
  data: string | null;
  responsavel: string | null;
  status: string | null;
  observacoes: string | null;
}

const defaultForm = { tipo: 'semanal', atividade: '', data: '', responsavel: '', status: 'Pendente', observacoes: '' };

export default function Agenda() {
  const [data, setData] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('agenda').select('*').order('data', { ascending: true });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else setData(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = () => { setForm(defaultForm); setEditingId(null); setDialogOpen(true); };
  const handleEdit = (item: AgendaItem) => {
    setForm({ tipo: item.tipo || 'semanal', atividade: item.atividade, data: item.data || '', responsavel: item.responsavel || '', status: item.status || 'Pendente', observacoes: item.observacoes || '' });
    setEditingId(item.id); setDialogOpen(true);
  };
  const handleDelete = async (item: AgendaItem) => {
    const { error } = await supabase.from('agenda').delete().eq('id', item.id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Sucesso', description: 'Item excluído' }); fetchData(); }
  };
  const handleSubmit = async () => {
    if (!form.atividade) { toast({ title: 'Erro', description: 'Atividade é obrigatória', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = { ...form, data: form.data || null };
    if (editingId) {
      const { error } = await supabase.from('agenda').update(payload).eq('id', editingId);
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Sucesso', description: 'Item atualizado' }); setDialogOpen(false); fetchData(); }
    } else {
      const { error } = await supabase.from('agenda').insert({ ...payload, user_id: user?.id });
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Sucesso', description: 'Item criado' }); setDialogOpen(false); fetchData(); }
    }
    setSaving(false);
  };

  const columns: Column<AgendaItem>[] = [
    { key: 'atividade', label: 'Atividade' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'data', label: 'Data' },
    { key: 'responsavel', label: 'Responsável' },
    { key: 'status', label: 'Status', render: (item) => <StatusBadge status={item.status || ''} /> },
  ];

  return (
    <MainLayout>
      <ModuleHeader title="Agenda" description="Atividades e Compromissos" onAdd={handleAdd} addLabel="Nova Atividade" />
      <DataTable data={data} columns={columns} onEdit={handleEdit} onDelete={handleDelete} loading={loading} emptyMessage="Nenhuma atividade cadastrada" />
      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editingId ? 'Editar Atividade' : 'Nova Atividade'} onSubmit={handleSubmit} loading={saving}>
        <div className="grid gap-4">
          <div><Label>Atividade *</Label><Input value={form.atividade} onChange={(e) => setForm({ ...form, atividade: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Tipo</Label><Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="semanal">Semanal</SelectItem><SelectItem value="mensal">Mensal</SelectItem><SelectItem value="semestral">Semestral</SelectItem><SelectItem value="anual">Anual</SelectItem></SelectContent></Select></div>
            <div><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Responsável</Label><Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Pendente">Pendente</SelectItem><SelectItem value="Concluído">Concluído</SelectItem><SelectItem value="Atrasado">Atrasado</SelectItem></SelectContent></Select></div>
          </div>
          <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
        </div>
      </FormDialog>
    </MainLayout>
  );
}
