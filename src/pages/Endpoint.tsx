import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Check, Play, ExternalLink, Code2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EndpointDef {
  chave: string;
  titulo: string;
  descricao: string;
  url: string;
  exemploJson: string;
}

const ENDPOINTS: EndpointDef[] = [
  {
    chave: 'okr',
    titulo: 'API Pública — OKRs',
    descricao: 'Objetivos, Key Results e Ações, aninhados. Não requer autenticação.',
    url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/okr-public-api`,
    exemploJson: `{
  "objetivos": [
    {
      "id": "uuid",
      "objetivo": "Melhorar governança...",
      "ciclo": "2026.1",
      "responsavel": "João",
      "status": "Em andamento",
      "key_results": [
        {
          "id": "uuid",
          "kr": "Reduzir tempo de resposta...",
          "codigo": "KR-01",
          "tipo": "Quantitativo",
          "meta": 100,
          "percentual": 45,
          "acoes": [
            {
              "id": "uuid",
              "acao": "Mapear processos...",
              "responsavel": "Maria",
              "prazo": "2026-06-30",
              "status": "Em andamento"
            }
          ]
        }
      ]
    }
  ]
}`,
  },
  {
    chave: 'previsao',
    titulo: 'API Pública — Previsão de Arrecadação',
    descricao:
      'Resumo geral (uma linha por categoria: modelo vencedor, MAPE, taxa de crescimento, total previsto por cenário) da última execução concluída. Não requer autenticação. Adicione ?detalhe=1 na URL pra incluir o JSON técnico completo por categoria (séries, coeficientes, ACF/PACF).',
    url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/previsao-public-api`,
    exemploJson: `{
  "execucao_id": "uuid",
  "disparada_em": "2026-10-02T09:31:09Z",
  "concluida_em": "2026-10-02T09:33:40Z",
  "meses_teste": 12,
  "horizonte_meses": 6,
  "resumo": {
    "gerado_em": "2026-10-02T09:33:40Z",
    "meses_teste": 12,
    "horizonte_meses": 6,
    "total_previsto_geral_cenario_base": 376356384.89,
    "categorias": [
      {
        "categoria": "Judicial",
        "alvo": "Tipo Judiciais",
        "modelo_vencedor": "SARIMAX Padronizado",
        "mape_vencedor_pct": 9.07,
        "r2_vencedor": 0.4681,
        "diebold_mariano_significante": true,
        "vencedor_estavel_entre_janelas": false,
        "ultimo_mes_historico": "2026-06-01",
        "valor_ultimo_mes_historico": 20597140.41,
        "taxa_crescimento_cenario_base_pct": 6.79,
        "total_previsto_cenario_conservador": 115407687.35,
        "total_previsto_cenario_base": 117131545.36,
        "total_previsto_cenario_otimista": 118885754.14,
        "projecao_usa_modelo_vencedor": true
      }
    ]
  }
}`,
  },
];

function EndpointCard({ endpoint }: { endpoint: EndpointDef }) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(endpoint.url);
    setCopied(true);
    toast({ title: 'URL copiada!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTest = async () => {
    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch(endpoint.url);
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setResponse(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ExternalLink className="h-5 w-5" />
            {endpoint.titulo}
          </CardTitle>
          <CardDescription>{endpoint.descricao}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted px-4 py-3 rounded-lg text-sm font-mono break-all">
              {endpoint.url}
            </code>
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="mt-4">
            <Button onClick={handleTest} disabled={loading}>
              <Play className="h-4 w-4 mr-2" />
              {loading ? 'Consultando...' : 'Testar Endpoint'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {response && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resposta ao Vivo</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-auto max-h-[500px]">
              {response}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Code2 className="h-5 w-5" />
            Estrutura do JSON
          </CardTitle>
          <CardDescription>Exemplo da estrutura retornada pelo endpoint</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-auto max-h-[400px]">
            {endpoint.exemploJson}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Endpoint() {
  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">APIs Públicas</h1>
          <p className="text-muted-foreground mt-1">
            Endpoints públicos (sem autenticação) para integração com Power BI ou outra ferramenta de BI.
          </p>
        </div>

        {ENDPOINTS.map((endpoint) => (
          <EndpointCard key={endpoint.chave} endpoint={endpoint} />
        ))}
      </div>
    </MainLayout>
  );
}
