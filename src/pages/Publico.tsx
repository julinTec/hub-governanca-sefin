import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Loader2, Lock, Eye, Target, TrendingUp, Menu, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import sefinLogo from '@/assets/sefin-logo.png.asset.json';
import { chamarApiPublica } from '@/lib/publicoApi';
import PublicoOkrsView from '@/components/publico/PublicoOkrsView';
import PublicoPrevisaoView from '@/components/publico/PublicoPrevisaoView';

// Tela publica (sem login) - acessada via /publico/:token. So existe se um
// admin gerar e ativar o link em /link-publico. Mostra, em modo somente
// leitura, os mesmos dados de OKRs e Previsao de Arrecadacao que o Hub
// autenticado mostra, com a mesma barra lateral do Hub (so com esses dois
// modulos), sem nenhuma acao de criar/editar/excluir.

type Secao = 'okrs' | 'previsao';

const secoes: { id: Secao; nome: string; icon: typeof Target }[] = [
  { id: 'okrs', nome: 'OKRs', icon: Target },
  { id: 'previsao', nome: 'Previsão de Arrecadação', icon: TrendingUp },
];

export default function Publico() {
  const { token } = useParams<{ token: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<'verificando' | 'valido' | 'invalido'>('verificando');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // A secao fica na URL (?secao=previsao) pra recarregar/compartilhar na mesma tela.
  const secao: Secao = searchParams.get('secao') === 'previsao' ? 'previsao' : 'okrs';
  const irPara = (s: Secao) => {
    setSearchParams(s === 'okrs' ? {} : { secao: s }, { replace: true });
    setSidebarOpen(false);
  };
  const secaoAtual = secoes.find((s) => s.id === secao)!;

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
    <div className="min-h-screen bg-background flex">
      {/* Fundo escuro no celular quando a barra lateral esta aberta */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Barra lateral - mesmo visual do MainLayout */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-200 lg:translate-x-0 lg:static',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center bg-white rounded-lg p-1 shadow-sm">
                <img src={sefinLogo.url} alt="TJCE - Secretaria de Finanças" className="max-w-full max-h-full object-contain" />
              </div>
              <div>
                <h1 className="font-bold text-sidebar-foreground">Hub SEFIN</h1>
                <p className="text-xs text-sidebar-foreground/60">Governança</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            <div className="pt-1 pb-2">
              <p className="px-3 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">Módulos</p>
            </div>
            {secoes.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => irPara(s.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                  secao === s.id
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <s.icon className="h-4 w-4" />
                {s.nome}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-sidebar-border">
            <p className="text-xs text-sidebar-foreground/60 flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 shrink-0" /> Acesso público — somente leitura
            </p>
          </div>
        </div>
      </aside>

      {/* Conteudo */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center h-14 px-4 gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <nav className="flex items-center text-sm">
              <span className="text-muted-foreground">Hub SEFIN</span>
              <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
              <span className="text-foreground font-medium">{secaoAtual.nome}</span>
            </nav>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          {secao === 'okrs' ? <PublicoOkrsView token={token} /> : <PublicoPrevisaoView token={token} />}
        </main>
      </div>
    </div>
  );
}
