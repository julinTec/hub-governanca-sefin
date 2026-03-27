import { useState, useEffect, useRef } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import ModuleHeader from '@/components/shared/ModuleHeader';
import FormDialog from '@/components/shared/FormDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Folder, FolderPlus, Plus, FileText, FileSpreadsheet, FileImage,
  Presentation, Globe, File, Link2, Trash2, ArrowLeft, Upload
} from 'lucide-react';

interface Pasta { id: string; nome: string; user_id: string; created_at: string; }
interface Documento {
  id: string; nome: string; tipo: string | null; area_relacionada: string | null;
  link: string | null; observacoes: string | null; pasta_id: string | null;
  categoria: string; arquivo_url: string | null; arquivo_nome: string | null;
}

const getFileIcon = (fileName: string | null) => {
  if (!fileName) return { icon: File, color: 'text-muted-foreground' };
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['pdf'].includes(ext)) return { icon: FileText, color: 'text-red-500' };
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { icon: FileSpreadsheet, color: 'text-green-500' };
  if (['ppt', 'pptx'].includes(ext)) return { icon: Presentation, color: 'text-orange-500' };
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return { icon: FileImage, color: 'text-blue-500' };
  if (['doc', 'docx', 'txt'].includes(ext)) return { icon: FileText, color: 'text-blue-700' };
  return { icon: File, color: 'text-muted-foreground' };
};

export default function Documentos() {
  const [pastas, setPastas] = useState<Pasta[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPasta, setCurrentPasta] = useState<Pasta | null>(null);

  const [pastaDialogOpen, setPastaDialogOpen] = useState(false);
  const [pastaForm, setPastaForm] = useState({ nome: '' });
  const [savingPasta, setSavingPasta] = useState(false);

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ nome: '', categoria: 'link' as 'link' | 'arquivo', link: '', pasta_id: '', observacoes: '' });
  const [savingItem, setSavingItem] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const { user } = useAuth();

  const fetchData = async () => {
    setLoading(true);
    const [pastasRes, docsRes] = await Promise.all([
      supabase.from('documento_pastas').select('*').order('nome'),
      supabase.from('documentos').select('*').order('nome'),
    ]);
    if (pastasRes.error) toast({ title: 'Erro', description: pastasRes.error.message, variant: 'destructive' });
    else setPastas(pastasRes.data || []);
    if (docsRes.error) toast({ title: 'Erro', description: docsRes.error.message, variant: 'destructive' });
    else setDocumentos((docsRes.data as Documento[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredDocs = documentos.filter(d => currentPasta ? d.pasta_id === currentPasta.id : !d.pasta_id);
  const itemCount = (pastaId: string) => documentos.filter(d => d.pasta_id === pastaId).length;

  // Pasta CRUD
  const handleCreatePasta = async () => {
    if (!pastaForm.nome) { toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' }); return; }
    setSavingPasta(true);
    const { error } = await supabase.from('documento_pastas').insert({ nome: pastaForm.nome, user_id: user?.id! });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Sucesso', description: 'Pasta criada' }); setPastaDialogOpen(false); setPastaForm({ nome: '' }); fetchData(); }
    setSavingPasta(false);
  };

  const handleDeletePasta = async (pasta: Pasta, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Excluir pasta "${pasta.nome}" e mover itens para raiz?`)) return;
    // Move docs to root
    await supabase.from('documentos').update({ pasta_id: null }).eq('pasta_id', pasta.id);
    const { error } = await supabase.from('documento_pastas').delete().eq('id', pasta.id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Sucesso', description: 'Pasta excluída' }); if (currentPasta?.id === pasta.id) setCurrentPasta(null); fetchData(); }
  };

  // Item CRUD
  const handleCreateItem = async () => {
    if (!itemForm.nome) { toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' }); return; }
    setSavingItem(true);

    let arquivo_url: string | null = null;
    let arquivo_nome: string | null = null;

    if (itemForm.categoria === 'arquivo' && selectedFile) {
      arquivo_nome = selectedFile.name;
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${user?.id}/${Date.now()}_${sanitizedName}`;
      const { error: upErr } = await supabase.storage.from('documentos').upload(filePath, selectedFile);
      if (upErr) { toast({ title: 'Erro no upload', description: upErr.message, variant: 'destructive' }); setSavingItem(false); return; }
      const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(filePath);
      arquivo_url = urlData.publicUrl;
    }

    const insertData: any = {
      nome: itemForm.nome,
      categoria: itemForm.categoria,
      link: itemForm.categoria === 'link' ? itemForm.link : null,
      arquivo_url,
      arquivo_nome,
      pasta_id: itemForm.pasta_id || currentPasta?.id || null,
      observacoes: itemForm.observacoes || null,
      user_id: user?.id!,
    };

    const { error } = await supabase.from('documentos').insert(insertData);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Sucesso', description: 'Item adicionado' });
      setItemDialogOpen(false);
      setItemForm({ nome: '', categoria: 'link', link: '', pasta_id: '', observacoes: '' });
      setSelectedFile(null);
      fetchData();
    }
    setSavingItem(false);
  };

  const handleDeleteItem = async (doc: Documento, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Excluir "${doc.nome}"?`)) return;
    const { error } = await supabase.from('documentos').delete().eq('id', doc.id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Sucesso', description: 'Item excluído' }); fetchData(); }
  };

  const openItem = (doc: Documento) => {
    if (doc.categoria === 'arquivo' && doc.arquivo_url) window.open(doc.arquivo_url, '_blank');
    else if (doc.link) window.open(doc.link, '_blank');
  };

  const openNewItem = () => {
    setItemForm({ nome: '', categoria: 'link', link: '', pasta_id: currentPasta?.id || '', observacoes: '' });
    setSelectedFile(null);
    setItemDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Documentos</h1>
            <p className="text-muted-foreground">Gerenciador de arquivos e links</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setPastaForm({ nome: '' }); setPastaDialogOpen(true); }}>
              <FolderPlus className="h-4 w-4 mr-2" /> Nova Pasta
            </Button>
            <Button onClick={openNewItem}>
              <Plus className="h-4 w-4 mr-2" /> Novo Item
            </Button>
          </div>
        </div>

        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              {currentPasta ? (
                <BreadcrumbLink className="cursor-pointer" onClick={() => setCurrentPasta(null)}>Documentos</BreadcrumbLink>
              ) : (
                <BreadcrumbPage>Documentos</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {currentPasta && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbPage>{currentPasta.nome}</BreadcrumbPage></BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        {currentPasta && (
          <Button variant="ghost" size="sm" onClick={() => setCurrentPasta(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {/* Pastas (only at root level) */}
            {!currentPasta && pastas.map(pasta => (
              <Card
                key={pasta.id}
                className="group cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/30"
                onClick={() => setCurrentPasta(pasta)}
              >
                <CardContent className="p-4 flex flex-col items-center text-center gap-2 relative">
                  <button
                    onClick={(e) => handleDeletePasta(pasta, e)}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                  <Folder className="h-12 w-12 text-amber-500 fill-amber-200" />
                  <span className="text-sm font-medium truncate w-full">{pasta.nome}</span>
                  <span className="text-xs text-muted-foreground">{itemCount(pasta.id)} {itemCount(pasta.id) === 1 ? 'item' : 'itens'}</span>
                </CardContent>
              </Card>
            ))}

            {/* Documentos */}
            {filteredDocs.map(doc => {
              const isFile = doc.categoria === 'arquivo';
              const { icon: IconComp, color } = isFile ? getFileIcon(doc.arquivo_nome) : { icon: Globe, color: 'text-blue-500' };
              return (
                <Card
                  key={doc.id}
                  className="group cursor-pointer hover:shadow-md transition-shadow border hover:border-primary/30"
                  onClick={() => openItem(doc)}
                >
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2 relative">
                    <button
                      onClick={(e) => handleDeleteItem(doc, e)}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                    <IconComp className={`h-10 w-10 ${color}`} />
                    <span className="text-sm font-medium truncate w-full">{doc.nome}</span>
                    <Badge variant={isFile ? 'secondary' : 'outline'} className="text-[10px]">
                      {isFile ? (
                        <><Upload className="h-3 w-3 mr-1" />Arquivo</>
                      ) : (
                        <><Link2 className="h-3 w-3 mr-1" />Link</>
                      )}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}

            {!currentPasta && pastas.length === 0 && filteredDocs.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                Nenhuma pasta ou documento. Comece criando uma pasta ou adicionando um item.
              </div>
            )}
            {currentPasta && filteredDocs.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                Pasta vazia. Adicione arquivos ou links aqui.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialog Nova Pasta */}
      <FormDialog open={pastaDialogOpen} onOpenChange={setPastaDialogOpen} title="Nova Pasta" onSubmit={handleCreatePasta} loading={savingPasta}>
        <div>
          <Label>Nome da Pasta *</Label>
          <Input value={pastaForm.nome} onChange={(e) => setPastaForm({ nome: e.target.value })} placeholder="Ex: Contratos 2026" />
        </div>
      </FormDialog>

      {/* Dialog Novo Item */}
      <FormDialog open={itemDialogOpen} onOpenChange={setItemDialogOpen} title="Novo Item" onSubmit={handleCreateItem} loading={savingItem}>
        <div className="grid gap-4">
          <div>
            <Label>Nome *</Label>
            <Input value={itemForm.nome} onChange={(e) => setItemForm({ ...itemForm, nome: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={itemForm.categoria} onValueChange={(v: 'link' | 'arquivo') => setItemForm({ ...itemForm, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">Link externo</SelectItem>
                  <SelectItem value="arquivo">Upload de arquivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pasta</Label>
              <Select value={itemForm.pasta_id || 'root'} onValueChange={(v) => setItemForm({ ...itemForm, pasta_id: v === 'root' ? '' : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Raiz (sem pasta)</SelectItem>
                  {pastas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {itemForm.categoria === 'link' ? (
            <div>
              <Label>URL</Label>
              <Input value={itemForm.link} onChange={(e) => setItemForm({ ...itemForm, link: e.target.value })} placeholder="https://..." />
            </div>
          ) : (
            <div>
              <Label>Arquivo</Label>
              <input
                ref={fileInputRef}
                type="file"
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setSelectedFile(f); if (!itemForm.nome) setItemForm(prev => ({ ...prev, nome: f.name })); }
                }}
              />
              {selectedFile && <p className="text-xs text-muted-foreground mt-1">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)</p>}
            </div>
          )}
          <div>
            <Label>Observações</Label>
            <Textarea value={itemForm.observacoes} onChange={(e) => setItemForm({ ...itemForm, observacoes: e.target.value })} />
          </div>
        </div>
      </FormDialog>
    </MainLayout>
  );
}
