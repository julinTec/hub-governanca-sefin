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

interface Contrato {
  id: string;
  numero_contrato: string;
  objeto: string | null;
  empresa: string | null;
  fiscal: string | null;
  status: string | null;
  ultimo_atesto: string | null;
  proximo_atesto: string | null;
  observacoes: string | null;
}

const defaultForm = {
  numero_contrato: '',
  objeto: '',
  empresa: '',
  fiscal: '',
  status: 'Ativo',
  ultimo_atesto: '',
  proximo_atesto: '',
  observacoes: '',
};

export default function Contratos() {
  const [data, setData] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [aiLoading, setAiLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contratos')
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

  const handleEdit = (item: Contrato) => {
    setForm({
      numero_contrato: item.numero_contrato,
      objeto: item.objeto || '',
      empresa: item.empresa || '',
      fiscal: item.fiscal || '',
      status: item.status || 'Ativo',
      ultimo_atesto: item.ultimo_atesto || '',
      proximo_atesto: item.proximo_atesto || '',
      observacoes: item.observacoes || '',
    });
    setEditingId(item.id);
    setDialogOpen(true);
  };

  const handleDelete = async (item: Contrato) => {
    const { error } = await supabase.from('contratos').delete().eq('id', item.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Contrato excluído' });
      fetchData();
    }
  };

  const handleSubmit = async () => {
    if (!form.numero_contrato) {
      toast({ title: 'Erro', description: 'Número do contrato é obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const payload = {
      ...form,
      ultimo_atesto: form.ultimo_atesto || null,
      proximo_atesto: form.proximo_atesto || null,
    };

    if (editingId) {
      const { error } = await supabase.from('contratos').update(payload).eq('id', editingId);
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso', description: 'Contrato atualizado' });
        setDialogOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase.from('contratos').insert({ ...payload, user_id: user?.id });
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso', description: 'Contrato criado' });
        setDialogOpen(false);
        fetchData();
      }
    }
    setSaving(false);
  };

  const handleAI = async () => {
    if (data.length === 0) {
      toast({ title: 'Aviso', description: 'Adicione contratos primeiro', variant: 'destructive' });
      return;
    }
    setAiLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-ai', {
        body: { 
          type: 'contrato-text',
          data: data[0]
        },
      });
      if (error) throw error;
      toast({ title: 'Texto Gerado', description: result.text || 'Texto gerado com sucesso!' });
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao gerar texto com IA', variant: 'destructive' });
    }
    setAiLoading(false);
  };

  const columns: Column<Contrato>[] = [
    { key: 'numero_contrato', label: 'Número' },
    { key: 'objeto', label: 'Objeto' },
    { key: 'empresa', label: 'Empresa' },
    { key: 'fiscal', label: 'Fiscal' },
    { key: 'status', label: 'Status', render: (item) => <StatusBadge status={item.status || ''} /> },
  ];

  return (
    <MainLayout>
      <ModuleHeader
        title="Contratos"
        description="Gestão de Contratos e Atestos"
        onAdd={handleAdd}
        addLabel="Novo Contrato"
        onAI={handleAI}
        aiLabel="Gerar Texto SEGOV"
        aiLoading={aiLoading}
      />

      <DataTable
        data={data}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
        emptyMessage="Nenhum contrato cadastrado"
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingId ? 'Editar Contrato' : 'Novo Contrato'}
        onSubmit={handleSubmit}
        loading={saving}
      >
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="numero">Número do Contrato *</Label>
              <Input
                id="numero"
                value={form.numero_contrato}
                onChange={(e) => setForm({ ...form, numero_contrato: e.target.value })}
                placeholder="Ex: 001/2026"
              />
            </div>
            <div>
              <Label htmlFor="empresa">Empresa</Label>
              <Input
                id="empresa"
                value={form.empresa}
                onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                placeholder="Nome da empresa"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="objeto">Objeto</Label>
            <Textarea
              id="objeto"
              value={form.objeto}
              onChange={(e) => setForm({ ...form, objeto: e.target.value })}
              placeholder="Descrição do objeto do contrato"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fiscal">Fiscal</Label>
              <Input
                id="fiscal"
                value={form.fiscal}
                onChange={(e) => setForm({ ...form, fiscal: e.target.value })}
                placeholder="Nome do fiscal"
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Em renovação">Em renovação</SelectItem>
                  <SelectItem value="Encerrado">Encerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ultimo_atesto">Último Atesto</Label>
              <Input
                id="ultimo_atesto"
                type="date"
                value={form.ultimo_atesto}
                onChange={(e) => setForm({ ...form, ultimo_atesto: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="proximo_atesto">Próximo Atesto</Label>
              <Input
                id="proximo_atesto"
                type="date"
                value={form.proximo_atesto}
                onChange={(e) => setForm({ ...form, proximo_atesto: e.target.value })}
              />
            </div>
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
