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

interface OKRObjetivo {
  id: string;
  objetivo: string;
  ciclo: string;
  responsavel: string | null;
  status: string | null;
  observacoes: string | null;
  observacao_reuniao: string | null;
  created_at: string;
}

const defaultForm = {
  objetivo: '',
  ciclo: '2026.1',
  responsavel: '',
  status: 'Em andamento',
  observacoes: '',
  observacao_reuniao: '',
};

export default function OKRs() {
  const [data, setData] = useState<OKRObjetivo[]>([]);
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
      .from('okr_objetivos')
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

  const handleEdit = (item: OKRObjetivo) => {
    setForm({
      objetivo: item.objetivo,
      ciclo: item.ciclo,
      responsavel: item.responsavel || '',
      status: item.status || 'Em andamento',
      observacoes: item.observacoes || '',
      observacao_reuniao: item.observacao_reuniao || '',
    });
    setEditingId(item.id);
    setDialogOpen(true);
  };

  const handleDelete = async (item: OKRObjetivo) => {
    const { error } = await supabase.from('okr_objetivos').delete().eq('id', item.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Objetivo excluído' });
      fetchData();
    }
  };

  const handleSubmit = async () => {
    if (!form.objetivo || !form.ciclo) {
      toast({ title: 'Erro', description: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }
    setSaving(true);

    if (editingId) {
      const { error } = await supabase
        .from('okr_objetivos')
        .update(form)
        .eq('id', editingId);
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso', description: 'Objetivo atualizado' });
        setDialogOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('okr_objetivos')
        .insert({ ...form, user_id: user?.id });
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso', description: 'Objetivo criado' });
        setDialogOpen(false);
        fetchData();
      }
    }
    setSaving(false);
  };

  const handleAI = async () => {
    if (data.length === 0) {
      toast({ title: 'Aviso', description: 'Adicione objetivos primeiro', variant: 'destructive' });
      return;
    }
    setAiLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-ai', {
        body: { 
          type: 'okr-summary',
          data: data.map(d => ({ objetivo: d.objetivo, ciclo: d.ciclo, status: d.status, responsavel: d.responsavel }))
        },
      });
      if (error) throw error;
      toast({ title: 'Resumo Gerado', description: result.summary || 'Resumo gerado com sucesso!' });
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao gerar resumo com IA', variant: 'destructive' });
    }
    setAiLoading(false);
  };

  const columns: Column<OKRObjetivo>[] = [
    { key: 'objetivo', label: 'Objetivo' },
    { key: 'ciclo', label: 'Ciclo' },
    { key: 'responsavel', label: 'Responsável' },
    { key: 'status', label: 'Status', render: (item) => <StatusBadge status={item.status || ''} /> },
  ];

  return (
    <MainLayout>
      <ModuleHeader
        title="OKRs"
        description="Objetivos e Resultados-Chave"
        onAdd={handleAdd}
        addLabel="Novo Objetivo"
        onAI={handleAI}
        aiLabel="Resumir com IA"
        aiLoading={aiLoading}
      />

      <DataTable
        data={data}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
        emptyMessage="Nenhum objetivo cadastrado"
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingId ? 'Editar Objetivo' : 'Novo Objetivo'}
        onSubmit={handleSubmit}
        loading={saving}
      >
        <div className="grid gap-4">
          <div>
            <Label htmlFor="objetivo">Objetivo *</Label>
            <Input
              id="objetivo"
              value={form.objetivo}
              onChange={(e) => setForm({ ...form, objetivo: e.target.value })}
              placeholder="Descreva o objetivo"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ciclo">Ciclo *</Label>
              <Select value={form.ciclo} onValueChange={(v) => setForm({ ...form, ciclo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025.1">2025.1</SelectItem>
                  <SelectItem value="2025.2">2025.2</SelectItem>
                  <SelectItem value="2026.1">2026.1</SelectItem>
                  <SelectItem value="2026.2">2026.2</SelectItem>
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
                  <SelectItem value="Em andamento">Em andamento</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                  <SelectItem value="Atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Observações gerais"
            />
          </div>
          <div>
            <Label htmlFor="observacao_reuniao">Observação da Reunião</Label>
            <Textarea
              id="observacao_reuniao"
              value={form.observacao_reuniao}
              onChange={(e) => setForm({ ...form, observacao_reuniao: e.target.value })}
              placeholder="Anotações da última reunião"
            />
          </div>
        </div>
      </FormDialog>
    </MainLayout>
  );
}
