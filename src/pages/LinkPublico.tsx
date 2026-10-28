import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Link2, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';

interface LinkRow {
  token: string;
  ativo: boolean;
  atualizado_em: string;
}

export default function LinkPublico() {
  const { isAdmin, user, role, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [link, setLink] = useState<LinkRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [alternando, setAlternando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('public_share_link')
      .select('token, ativo, atualizado_em')
      .eq('id', true)
      .maybeSingle();
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else setLink(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) carregar();
  }, [isAdmin]);

  const gerarNovoLink = async () => {
    setGerando(true);
    const novoToken = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '');
    const { error } = await supabase.from('public_share_link').upsert({
      id: true,
      token: novoToken,
      ativo: true,
      criado_por: user?.id,
      atualizado_em: new Date().toISOString(),
    });
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Link gerado', description: link ? 'O link anterior parou de funcionar.' : 'Link público criado e ativado.' });
      carregar();
    }
    setGerando(false);
  };

  const alternarAtivo = async (ativo: boolean) => {
    if (!link) return;
    setAlternando(true);
    const { error } = await supabase
      .from('public_share_link')
      .update({ ativo, atualizado_em: new Date().toISOString() })
      .eq('id', true);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else {
      setLink({ ...link, ativo });
      toast({ title: ativo ? 'Link reativado' : 'Link desativado' });
    }
    setAlternando(false);
  };

  const url = link ? `${window.location.origin}/publico/${link.token}` : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    toast({ title: 'URL copiada!' });
    setTimeout(() => setCopiado(false), 2000);
  };

  if (authLoading || (user && role === null)) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Link Público</h1>
          <p className="text-muted-foreground">
            Gere um link que dá acesso somente leitura a OKRs e Previsão de Arrecadação, sem precisar de login. Quem tiver o link consegue ver e filtrar, mas não criar, editar ou excluir nada — e não enxerga os outros módulos do Hub.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Link2 className="h-5 w-5" /> Link de compartilhamento
            </CardTitle>
            <CardDescription>
              Só existe um link por vez. Gerar um novo invalida o anterior automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : !link ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-muted-foreground">Nenhum link público foi gerado ainda.</p>
                <Button onClick={gerarNovoLink} disabled={gerando}>
                  {gerando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                  Gerar link público
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant={link.ativo ? 'default' : 'secondary'}>
                    {link.ativo ? 'Ativo' : 'Desativado'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Atualizado em {new Date(link.atualizado_em).toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-4 py-3 rounded-lg text-sm font-mono break-all">{url}</code>
                  <Button variant="outline" size="icon" onClick={handleCopy}>
                    {copiado ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="font-medium text-foreground text-sm">Link ativo</p>
                    <p className="text-xs text-muted-foreground">Desative pra suspender o acesso sem perder a URL (reative depois pra voltar a valer o mesmo link).</p>
                  </div>
                  <Switch checked={link.ativo} disabled={alternando} onCheckedChange={alternarAtivo} />
                </div>

                <Button variant="outline" onClick={gerarNovoLink} disabled={gerando}>
                  {gerando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Gerar novo link (invalida o atual)
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4" /> O que quem recebe o link consegue fazer
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>✅ Ver e filtrar os OKRs (por líder, equipe, responsável, busca por KR) e as previsões de arrecadação (comparativo entre categorias e detalhe por categoria).</p>
            <p>❌ Não consegue criar, editar ou excluir nada, disparar novas previsões, nem ver qualquer outro módulo do Hub.</p>
            <p>❌ Não precisa de usuário/senha — qualquer pessoa com a URL acessa, então trate o link como uma senha: só compartilhe com quem deve ter acesso, e gere um novo (ou desative) se ele vazar.</p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
