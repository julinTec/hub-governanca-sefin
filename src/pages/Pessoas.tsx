import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import ModuleHeader from '@/components/shared/ModuleHeader';
import DataTable, { Column } from '@/components/shared/DataTable';
import FormDialog from '@/components/shared/FormDialog';
import StatusBadge from '@/components/shared/StatusBadge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Pessoa { id: string; nome: string; cargo: string | null; area: string | null; ultima_validacao_ponto: string | null; status_plano_trabalho: string | null; observacoes: string | null; }
const defaultForm = { nome: '', cargo: '', area: '', ultima_validacao_ponto: '', status_plano_trabalho: 'Pendente', observacoes: '' };

export default function Pessoas() {
  const [data, setData] = useState<Pessoa[]>([]); const [loading, setLoading] = useState(true); const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false); const [editingId, setEditingId] = useState<string | null>(null); const [form, setForm] = useState(defaultForm);
  const { toast } = useToast(); const { user } = useAuth();

  const fetchData = async () => { setLoading(true); const { data, error } = await supabase.from('pessoas').select('*').order('nome'); if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' }); else setData(data || []); setLoading(false); };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = () => { setForm(defaultForm); setEditingId(null); setDialogOpen(true); };
  const handleEdit = (item: Pessoa) => { setForm({ nome: item.nome, cargo: item.cargo || '', area: item.area || '', ultima_validacao_ponto: item.ultima_validacao_ponto || '', status_plano_trabalho: item.status_plano_trabalho || 'Pendente', observacoes: item.observacoes || '' }); setEditingId(item.id); setDialogOpen(true); };
  const handleDelete = async (item: Pessoa) => { const { error } = await supabase.from('pessoas').delete().eq('id', item.id); if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' }); else { toast({ title: 'Sucesso', description: 'Pessoa excluída' }); fetchData(); } };
  const handleSubmit = async () => {
    if (!form.nome) { toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' }); return; }
    setSaving(true); const payload = { ...form, ultima_validacao_ponto: form.ultima_validacao_ponto || null };
    if (editingId) { const { error } = await supabase.from('pessoas').update(payload).eq('id', editingId); if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' }); else { toast({ title: 'Sucesso', description: 'Pessoa atualizada' }); setDialogOpen(false); fetchData(); } }
    else { const { error } = await supabase.from('pessoas').insert({ ...payload, user_id: user?.id }); if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' }); else { toast({ title: 'Sucesso', description: 'Pessoa criada' }); setDialogOpen(false); fetchData(); } }
    setSaving(false);
  };

  const columns: Column<Pessoa>[] = [{ key: 'nome', label: 'Nome' }, { key: 'cargo', label: 'Cargo' }, { key: 'area', label: 'Área' }, { key: 'status_plano_trabalho', label: 'Plano de Trabalho', render: (item) => <StatusBadge status={item.status_plano_trabalho || ''} /> }];

  return (
    <MainLayout>
      <ModuleHeader title="Pessoas" description="Gestão de Pessoas" onAdd={handleAdd} addLabel="Nova Pessoa" />
      <DataTable data={data} columns={columns} onEdit={handleEdit} onDelete={handleDelete} loading={loading} emptyMessage="Nenhuma pessoa cadastrada" />
      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editingId ? 'Editar Pessoa' : 'Nova Pessoa'} onSubmit={handleSubmit} loading={saving}>
        <div className="grid gap-4">
          <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4"><div><Label>Cargo</Label><Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div><div><Label>Área</Label><Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></div></div>
          <div className="grid grid-cols-2 gap-4"><div><Label>Última Validação Ponto</Label><Input type="date" value={form.ultima_validacao_ponto} onChange={(e) => setForm({ ...form, ultima_validacao_ponto: e.target.value })} /></div><div><Label>Status Plano de Trabalho</Label><Input value={form.status_plano_trabalho} onChange={(e) => setForm({ ...form, status_plano_trabalho: e.target.value })} /></div></div>
          <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
        </div>
      </FormDialog>
    </MainLayout>
  );
}
