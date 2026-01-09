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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Processo {
  id: string;
  nome: string;
  area: string | null;
  dono_processo: string | null;
  status: string | null;
  ultima_revisao: string | null;
  proxima_revisao: string | null;
  link_fluxograma: string | null;
  impactado_consultoria: boolean | null;
  observacoes: string | null;
}

const defaultForm = {
  nome: '',
  area: '',
  dono_processo: '',
  status: 'Ativo',
  ultima_revisao: '',
  proxima_revisao: '',
  link_fluxograma: '',
  impactado_consultoria: false,
  observacoes: '',
};

export default function Processos() {
  const [data, setData] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('processos')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setData(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = () => {
    setForm(defaultForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: Processo) => {
    setForm({
      nome: item.nome,
      area: item.area || '',
      dono_processo: item.dono_processo || '',
      status: item.status || 'Ativo',
      ultima_revisao: item.ultima_revisao || '',
      proxima_revisao: item.proxima_revisao || '',
      link_fluxograma: item.link_fluxograma || '',
      impactado_consultoria: item.impactado_consultoria || false,
      observacoes: item.observacoes || '',
    });
    setEditingId(item.id);
    setDialogOpen(true);
  };

  const handleDelete = async (item: Processo) => {
    const { error } = await supabase.from('processos').delete().eq('id', item.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Processo excluído' });
      fetchData();
    }
  };

  const handleSubmit = async () => {
    if (!form.nome) {
      toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const payload = {
      ...form,
      ultima_revisao: form.ultima_revisao || null,
      proxima_revisao: form.proxima_revisao || null,
    };

    if (editingId) {
      const { error } = await supabase.from('processos').update(payload).eq('id', editingId);
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso', description: 'Processo atualizado' });
        setDialogOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase.from('processos').insert({ ...payload, user_id: user?.id });
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso', description: 'Processo criado' });
        setDialogOpen(false);
        fetchData();
      }
    }
    setSaving(false);
  };

  const columns: Column<Processo>[] = [
    { key: 'nome', label: 'Nome' },
    { key: 'area', label: 'Área' },
    { key: 'dono_processo', label: 'Dono' },
    { key: 'status', label: 'Status', render: (item) => <StatusBadge status={item.status || ''} /> },
    { key: 'impactado_consultoria', label: 'Consultoria', render: (item) => item.impactado_consultoria ? 'Sim' : 'Não' },
  ];

  return (
    <MainLayout>
      <ModuleHeader
        title="Processos"
        description="Gestão de Processos Organizacionais"
        onAdd={handleAdd}
        addLabel="Novo Processo"
      />

      <DataTable
        data={data}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
        emptyMessage="Nenhum processo cadastrado"
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingId ? 'Editar Processo' : 'Novo Processo'}
        onSubmit={handleSubmit}
        loading={saving}
      >
        <div className="grid gap-4">
          <div>
            <Label htmlFor="nome">Nome do Processo *</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Nome do processo"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="area">Área</Label>
              <Input
                id="area"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                placeholder="Área responsável"
              />
            </div>
            <div>
              <Label htmlFor="dono">Dono do Processo</Label>
              <Input
                id="dono"
                value={form.dono_processo}
                onChange={(e) => setForm({ ...form, dono_processo: e.target.value })}
                placeholder="Nome do responsável"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ultima_revisao">Última Revisão</Label>
              <Input
                id="ultima_revisao"
                type="date"
                value={form.ultima_revisao}
                onChange={(e) => setForm({ ...form, ultima_revisao: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="proxima_revisao">Próxima Revisão</Label>
              <Input
                id="proxima_revisao"
                type="date"
                value={form.proxima_revisao}
                onChange={(e) => setForm({ ...form, proxima_revisao: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Em revisão">Em revisão</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="link">Link do Fluxograma</Label>
            <Input
              id="link"
              value={form.link_fluxograma}
              onChange={(e) => setForm({ ...form, link_fluxograma: e.target.value })}
              placeholder="URL do fluxograma"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="consultoria"
              checked={form.impactado_consultoria}
              onCheckedChange={(checked) => setForm({ ...form, impactado_consultoria: !!checked })}
            />
            <Label htmlFor="consultoria">Impactado pela consultoria?</Label>
          </div>
          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Observações gerais"
            />
          </div>
        </div>
      </FormDialog>
    </MainLayout>
  );
}
