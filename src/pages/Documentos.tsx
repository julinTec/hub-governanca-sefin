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

interface Documento { id: string; nome: string; tipo: string | null; area_relacionada: string | null; link: string | null; observacoes: string | null; }
const defaultForm = { nome: '', tipo: '', area_relacionada: '', link: '', observacoes: '' };

export default function Documentos() {
  const [data, setData] = useState<Documento[]>([]); const [loading, setLoading] = useState(true); const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false); const [editingId, setEditingId] = useState<string | null>(null); const [form, setForm] = useState(defaultForm);
  const { toast } = useToast(); const { user } = useAuth();

  const fetchData = async () => { setLoading(true); const { data, error } = await supabase.from('documentos').select('*').order('nome'); if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' }); else setData(data || []); setLoading(false); };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = () => { setForm(defaultForm); setEditingId(null); setDialogOpen(true); };
  const handleEdit = (item: Documento) => { setForm({ nome: item.nome, tipo: item.tipo || '', area_relacionada: item.area_relacionada || '', link: item.link || '', observacoes: item.observacoes || '' }); setEditingId(item.id); setDialogOpen(true); };
  const handleDelete = async (item: Documento) => { const { error } = await supabase.from('documentos').delete().eq('id', item.id); if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' }); else { toast({ title: 'Sucesso', description: 'Documento excluído' }); fetchData(); } };
  const handleSubmit = async () => {
    if (!form.nome) { toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' }); return; }
    setSaving(true);
    if (editingId) { const { error } = await supabase.from('documentos').update(form).eq('id', editingId); if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' }); else { toast({ title: 'Sucesso', description: 'Documento atualizado' }); setDialogOpen(false); fetchData(); } }
    else { const { error } = await supabase.from('documentos').insert({ ...form, user_id: user?.id }); if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' }); else { toast({ title: 'Sucesso', description: 'Documento criado' }); setDialogOpen(false); fetchData(); } }
    setSaving(false);
  };

  const columns: Column<Documento>[] = [{ key: 'nome', label: 'Nome' }, { key: 'tipo', label: 'Tipo' }, { key: 'area_relacionada', label: 'Área' }, { key: 'link', label: 'Link', render: (item) => item.link ? <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-primary underline">Abrir</a> : '-' }];

  return (
    <MainLayout>
      <ModuleHeader title="Documentos" description="Repositório de Documentos" onAdd={handleAdd} addLabel="Novo Documento" />
      <DataTable data={data} columns={columns} onEdit={handleEdit} onDelete={handleDelete} loading={loading} emptyMessage="Nenhum documento cadastrado" />
      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editingId ? 'Editar Documento' : 'Novo Documento'} onSubmit={handleSubmit} loading={saving}>
        <div className="grid gap-4">
          <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4"><div><Label>Tipo</Label><Input value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} /></div><div><Label>Área Relacionada</Label><Input value={form.area_relacionada} onChange={(e) => setForm({ ...form, area_relacionada: e.target.value })} /></div></div>
          <div><Label>Link</Label><Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="URL do documento" /></div>
          <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
        </div>
      </FormDialog>
    </MainLayout>
  );
}
