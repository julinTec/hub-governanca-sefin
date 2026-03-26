import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Check, Play, ExternalLink, Code2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/okr-public-api`;

export default function Endpoint() {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(API_URL);
    setCopied(true);
    toast({ title: 'URL copiada!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTest = async () => {
    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setResponse(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const exampleJson = `{
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
}`;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">API Pública — OKRs</h1>
          <p className="text-muted-foreground mt-1">
            Endpoint público para integração com ferramentas de BI
          </p>
        </div>

        {/* URL Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ExternalLink className="h-5 w-5" />
              URL do Endpoint
            </CardTitle>
            <CardDescription>
              Use esta URL no Power BI ou outra ferramenta de BI para consumir os dados de OKRs. Não requer autenticação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted px-4 py-3 rounded-lg text-sm font-mono break-all">
                {API_URL}
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

        {/* Live Response */}
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

        {/* Example Structure */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Code2 className="h-5 w-5" />
              Estrutura do JSON
            </CardTitle>
            <CardDescription>
              Exemplo da estrutura retornada pelo endpoint
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-auto max-h-[400px]">
              {exampleJson}
            </pre>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
