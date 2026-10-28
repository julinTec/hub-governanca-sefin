import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Lock, Eye } from 'lucide-react';
import sefinLogo from '@/assets/sefin-logo.png.asset.json';
import { chamarApiPublica } from '@/lib/publicoApi';
import PublicoOkrsView from '@/components/publico/PublicoOkrsView';
import PublicoPrevisaoView from '@/components/publico/PublicoPrevisaoView';

// Tela publica (sem login) - acessada via /publico/:token. So existe se um
// admin gerar e ativar o link em /link-publico. Mostra, em modo somente
// leitura, os mesmos dados de OKRs e Previsao de Arrecadacao que o Hub
// autenticado mostra, filtravel igual, mas sem nenhuma acao de
// criar/editar/excluir e sem acesso aos outros modulos do Hub.
export default function Publico() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'verificando' | 'valido' | 'invalido'>('verificando');

  useEffect(() => {
    if (!token) {
      setStatus('invalido');
      return;
    }
    chamarApiPublica(token, 'validar')
      .then(() => setStatus('valido'))
      .catch(() => setStatus('invalido'));
  }, [token]);

  if (status === 'verificando') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'invalido' || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-3 max-w-sm">
          <Lock className="h-10 w-10 text-muted-foreground mx-auto" />
          <h1 className="text-lg font-semibold text-foreground">Link inválido ou desativado</h1>
          <p className="text-sm text-muted-foreground">
            Este link de acesso público não existe mais ou foi desativado pelo administrador. Peça um novo link a quem compartilhou este com você.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-sidebar">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center bg-white rounded-lg p-1 shadow-sm shrink-0">
            <img src={sefinLogo.url} alt="TJCE - Secretaria de Finanças" className="max-w-full max-h-full object-contain" />
          </div>
          <div>
            <h1 className="font-bold text-sidebar-foreground">Hub SEFIN</h1>
            <p className="text-xs text-sidebar-foreground/60 flex items-center gap-1">
              <Eye className="h-3 w-3" /> Acesso público — somente leitura
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue="okrs">
          <TabsList>
            <TabsTrigger value="okrs">OKRs</TabsTrigger>
            <TabsTrigger value="previsao">Previsão de Arrecadação</TabsTrigger>
          </TabsList>
          <TabsContent value="okrs" className="mt-4">
            <PublicoOkrsView token={token} />
          </TabsContent>
          <TabsContent value="previsao" className="mt-4">
            <PublicoPrevisaoView token={token} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
