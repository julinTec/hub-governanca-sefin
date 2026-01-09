import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import ModuleHeader from '@/components/shared/ModuleHeader';
import DataTable, { Column } from '@/components/shared/DataTable';
import FormDialog from '@/components/shared/FormDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Consultoria { id: string; fluxo_analise: string; documentos_enviados: string | null; pendencias: string | null; proxima_reuniao: string | null; observacoes_estrategicas: string | null; }
const defaultForm = { fluxo_analise: '', documentos_enviados: '', pendencias: '', proxima_reuniao: '', observacoes_estrategicas: '' };

export default function Consultoria() {
  const [data, setData] = useState<Consultoria[]>([]); const [loading, setLoading] = useState(true); const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false); const [editingId, setEditingId] = useState<string | null>(null); const [form, setForm] = useState(defaultForm);
  const { toast } = useToast(); const { user } = useAuth();

  const fetchData = async () => { setLoading(true); const { data, error } = await supabase.from('consultoria').select('*').order('created_at', { ascending: false }); if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' }); else setData(data || []); setLoading(false); };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = () => { setForm(defaultForm); setEditingId(null); setDialogOpen(true); };
  const handleEdit = (item: Consultoria) => { setForm({ fluxo_analise: item.fluxo_analise, documentos_enviados: item.documentos_enviados || '', pendencias: item.pendencias || '', proxima_reuniao: item.proxima_reuniao || '', observacoes_estrategicas: item.observacoes_estrategicas || '' }); setEditingId(item.id); setDialogOpen(true); };
  const handleDelete = async (item: Consultoria) => { const { error } = await supabase.from('consultoria').delete().eq('id', item.id); if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' }); else { toast({ title: 'Sucesso', description: 'Item excluído' }); fetchData(); } };
  const handleSubmit = async () => {
    if (!form.fluxo_analise) { toast({ title: 'Erro', description: 'Fluxo em análise é obrigatório', variant: 'destructive' }); return; }
    setSaving(true); const payload = { ...form, proxima_reuniao: form.proxima_reuniao || null };
    if (editingId) { const { error } = await supabase.from('consultoria').update(payload).eq('id', editingId); if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' }); else { toast({ title: 'Sucesso', description: 'Item atualizado' }); setDialogOpen(false); fetchData(); } }
    else { const { error } = await supabase.from('consultoria').insert({ ...payload, user_id: user?.id }); if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' }); else { toast({ title: 'Sucesso', description: 'Item criado' }); setDialogOpen(false); fetchData(); } }
    setSaving(false);
  };

  const columns: Column<Consultoria>[] = [{ key: 'fluxo_analise', label: 'Fluxo em Análise' }, { key: 'pendencias', label: 'Pendências' }, { key: 'proxima_reuniao', label: 'Próxima Reunião' }];

  return (
    <MainLayout>
      <ModuleHeader title="Consultoria" description="Projetos de Consultoria" onAdd={handleAdd} addLabel="Novo Item" />
      <DataTable data={data} columns={columns} onEdit={handleEdit} onDelete={handleDelete} loading={loading} emptyMessage="Nenhum item cadastrado" />
      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editingId ? 'Editar Item' : 'Novo Item'} onSubmit={handleSubmit} loading={saving}>
        <div className="grid gap-4">
          <div><Label>Fluxo em Análise *</Label><Input value={form.fluxo_analise} onChange={(e) => setForm({ ...form, fluxo_analise: e.target.value })} /></div>
          <div><Label>Documentos Enviados</Label><Textarea value={form.documentos_enviados} onChange={(e) => setForm({ ...form, documentos_enviados: e.target.value })} /></div>
          <div><Label>Pendências</Label><Textarea value={form.pendencias} onChange={(e) => setForm({ ...form, pendencias: e.target.value })} /></div>
          <div><Label>Próxima Reunião</Label><Input type="date" value={form.proxima_reuniao} onChange={(e) => setForm({ ...form, proxima_reuniao: e.target.value })} /></div>
          <div><Label>Observações Estratégicas</Label><Textarea value={form.observacoes_estrategicas} onChange={(e) => setForm({ ...form, observacoes_estrategicas: e.target.value })} /></div>
        </div>
      </FormDialog>
    </MainLayout>
  );
}
