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

interface Indicador {
  id: string;
  nome: string;
  tipo: string | null;
  fonte: string | null;
  responsavel: string | null;
  ultima_atualizacao: string | null;
  status: string | null;
  observacoes: string | null;
}

const defaultForm = {
  nome: '',
  tipo: 'operacional',
  fonte: '',
  responsavel: '',
  ultima_atualizacao: '',
  status: 'Ativo',
  observacoes: '',
};

export default function Indicadores() {
  const [data, setData] = useState<Indicador[]>([]);
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
      .from('indicadores')
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

  const handleEdit = (item: Indicador) => {
    setForm({
      nome: item.nome,
      tipo: item.tipo || 'operacional',
      fonte: item.fonte || '',
      responsavel: item.responsavel || '',
      ultima_atualizacao: item.ultima_atualizacao || '',
      status: item.status || 'Ativo',
      observacoes: item.observacoes || '',
    });
    setEditingId(item.id);
    setDialogOpen(true);
  };

  const handleDelete = async (item: Indicador) => {
    const { error } = await supabase.from('indicadores').delete().eq('id', item.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Indicador excluído' });
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
      ultima_atualizacao: form.ultima_atualizacao || null,
    };

    if (editingId) {
      const { error } = await supabase.from('indicadores').update(payload).eq('id', editingId);
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso', description: 'Indicador atualizado' });
        setDialogOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase.from('indicadores').insert({ ...payload, user_id: user?.id });
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso', description: 'Indicador criado' });
        setDialogOpen(false);
        fetchData();
      }
    }
    setSaving(false);
  };

  const columns: Column<Indicador>[] = [
    { key: 'nome', label: 'Nome' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'fonte', label: 'Fonte' },
    { key: 'responsavel', label: 'Responsável' },
    { key: 'status', label: 'Status', render: (item) => <StatusBadge status={item.status || ''} /> },
  ];

  return (
    <MainLayout>
      <ModuleHeader
        title="Indicadores"
        description="Indicadores de Desempenho"
        onAdd={handleAdd}
        addLabel="Novo Indicador"
      />

      <DataTable
        data={data}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
        emptyMessage="Nenhum indicador cadastrado"
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingId ? 'Editar Indicador' : 'Novo Indicador'}
        onSubmit={handleSubmit}
        loading={saving}
      >
        <div className="grid gap-4">
          <div>
            <Label htmlFor="nome">Nome do Indicador *</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Nome do indicador"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="estratégico">Estratégico</SelectItem>
                  <SelectItem value="operacional">Operacional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Em análise">Em análise</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fonte">Fonte</Label>
              <Input
                id="fonte"
                value={form.fonte}
                onChange={(e) => setForm({ ...form, fonte: e.target.value })}
                placeholder="Fonte dos dados"
              />
            </div>
            <div>
              <Label htmlFor="responsavel">Responsável</Label>
              <Input
                id="responsavel"
                value={form.responsavel}
                onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                placeholder="Nome do responsável"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="ultima_atualizacao">Última Atualização</Label>
            <Input
              id="ultima_atualizacao"
              type="date"
              value={form.ultima_atualizacao}
              onChange={(e) => setForm({ ...form, ultima_atualizacao: e.target.value })}
            />
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
