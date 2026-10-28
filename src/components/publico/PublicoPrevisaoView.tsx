import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertTriangle } from 'lucide-react';
import { chamarApiPublica, PublicoApiError } from '@/lib/publicoApi';
import ModuleHeader from '@/components/shared/ModuleHeader';
import {
  ComparativoCategoriasView,
  CategoriaResultadoView,
  type ResultadoPrevisao,
} from '@/components/previsao/PrevisaoResultados';

interface ExecucaoPublica {
  id: string;
  status: string;
  meses_teste: number;
  horizonte_meses: number;
  created_at: string;
  concluido_em: string | null;
}

export default function PublicoPrevisaoView({ token }: { token: string }) {
  return (
    <>
      <ModuleHeader title="Previsão de Arrecadação" description="Previsão (Naive Sazonal, SARIMAX, Random Forest) por categoria de receita" />
      <PrevisaoConteudo token={token} />
    </>
  );
}

function PrevisaoConteudo({ token }: { token: string }) {
  const [execucoes, setExecucoes] = useState<ExecucaoPublica[]>([]);
  const [execucaoId, setExecucaoId] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoPrevisao | null>(null);
  const [loadingLista, setLoadingLista] = useState(true);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    chamarApiPublica<{ execucoes: ExecucaoPublica[] }>(token, 'previsao-lista')
      .then((data) => {
        const concluidas = (data.execucoes || []).filter((e) => e.status === 'concluido');
        setExecucoes(concluidas);
        if (concluidas.length > 0) setExecucaoId(concluidas[0].id);
      })
      .catch((err) => setErro(err instanceof PublicoApiError ? err.message : 'Falha ao carregar execuções'))
      .finally(() => setLoadingLista(false));
  }, [token]);

  useEffect(() => {
    if (!execucaoId) return;
    setLoadingDetalhe(true);
    chamarApiPublica<{ resultado: ResultadoPrevisao }>(token, 'previsao-detalhe', { execucao_id: execucaoId })
      .then((data) => setResultado(data.resultado))
      .catch((err) => setErro(err instanceof PublicoApiError ? err.message : 'Falha ao carregar resultado'))
      .finally(() => setLoadingDetalhe(false));
  }, [token, execucaoId]);

  if (loadingLista) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (erro) {
    return (
      <div className="flex items-center gap-2 justify-center py-12 text-destructive">
        <AlertTriangle className="h-5 w-5" /> {erro}
      </div>
    );
  }

  if (execucoes.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">Nenhuma execução concluída ainda.</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Execução</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={execucaoId ?? undefined} onValueChange={setExecucaoId}>
            <SelectTrigger className="w-full sm:w-96"><SelectValue /></SelectTrigger>
            <SelectContent>
              {execucoes.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {new Date(e.created_at).toLocaleString('pt-BR')} · backtest {e.meses_teste}m / horizonte {e.horizonte_meses}m
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loadingDetalhe || !resultado ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <Tabs defaultValue="comparativo">
          <TabsList>
            <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
            {Object.keys(resultado.categorias).map((cat) => (
              <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="comparativo" className="space-y-6">
            <ComparativoCategoriasView categorias={resultado.categorias} />
          </TabsContent>
          {Object.entries(resultado.categorias).map(([cat, dados]) => (
            <TabsContent key={cat} value={cat} className="space-y-6">
              <CategoriaResultadoView dados={dados} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
