import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Link2, Loader2, PenLine, RefreshCw, ShieldAlert } from 'lucide-react';

interface LinkRow {
  token: string;
  ativo: boolean;
  atualizado_em: string;
}

type TabelaLink = 'public_share_link' | 'public_collab_link';

export default function LinkPublico() {
  const { isAdmin, user, role, loading: authLoading } = useAuth();

  if (authLoading || (user && role === null)) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Link Público</h1>
          <p className="text-muted-foreground">
            Gere links que dão acesso a OKRs e Previsão de Arrecadação sem precisar de login. São dois links independentes: um só de leitura, para divulgar, e um de colaboração, só para os coordenadores, que também permite registrar Notas Explicativas da Arrecadação.
          </p>
        </div>

        <CartaoLink
          tabela="public_share_link"
          titulo="Link de leitura"
          icone={<Link2 className="h-5 w-5" />}
          descricao="Só leitura: ver e filtrar OKRs e previsões. Gerar um novo invalida o anterior automaticamente."
        />

        <CartaoLink
          tabela="public_collab_link"
          titulo="Link de colaboração (Notas Explicativas)"
          icone={<PenLine className="h-5 w-5" />}
          descricao="Tudo o que o link de leitura mostra, mais o botão “+ Registrar nota” na Previsão de Arrecadação. Envie só aos coordenadores. Pelo link só é possível criar notas — corrigir e excluir é feito aqui no Hub, por administradores."
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4" /> O que quem recebe cada link consegue fazer
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>✅ <strong>Os dois:</strong> ver e filtrar os OKRs (por líder, equipe, responsável, busca por KR), as previsões de arrecadação e as Notas Explicativas.</p>
            <p>✅ <strong>Só o de colaboração:</strong> registrar novas Notas Explicativas da Arrecadação (com nome e coordenadoria de quem registrou).</p>
            <p>❌ Nenhum dos dois consegue editar ou excluir nada, disparar previsões, nem ver outros módulos do Hub.</p>
            <p>❌ Não precisam de usuário/senha — qualquer pessoa com a URL acessa, então trate os links como senhas: compartilhe só com quem deve ter acesso, e gere um novo (ou desative) se algum vazar. Desativar um não afeta o outro.</p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

function CartaoLink({ tabela, titulo, descricao, icone }: { tabela: TabelaLink; titulo: string; descricao: string; icone: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [link, setLink] = useState<LinkRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [erroTabela, setErroTabela] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [alternando, setAlternando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from(tabela)
      .select('token, ativo, atualizado_em')
      .eq('id', true)
      .maybeSingle();
    if (error) {
      // tabela do link de colaboracao ainda nao criada (migration pendente)
      if (/(does not exist|schema cache|not find)/i.test(error.message)) setErroTabela(error.message);
      else toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setErroTabela(null);
      setLink(data as LinkRow | null);
    }
    setLoading(false);
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabela]);

  const gerarNovoLink = async () => {
    setGerando(true);
    const novoToken = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '');
    const { error } = await (supabase as any).from(tabela).upsert({
      id: true,
      token: novoToken,
      ativo: true,
      criado_por: user?.id,
      atualizado_em: new Date().toISOString(),
    });
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Link gerado', description: link ? 'O link anterior parou de funcionar.' : 'Link criado e ativado.' });
      carregar();
    }
    setGerando(false);
  };

  const alternarAtivo = async (ativo: boolean) => {
    if (!link) return;
    setAlternando(true);
    const { error } = await (supabase as any)
      .from(tabela)
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">{icone} {titulo}</CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : erroTabela ? (
          <p className="text-sm text-muted-foreground">
            Ainda não disponível: a tabela deste link não foi criada no banco (migration de 18/11 pendente). Aplique as migrations pendentes no Lovable e recarregue a página.
          </p>
        ) : !link ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">Nenhum link gerado ainda.</p>
            <Button onClick={gerarNovoLink} disabled={gerando}>
              {gerando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
              Gerar link
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
  );
}
