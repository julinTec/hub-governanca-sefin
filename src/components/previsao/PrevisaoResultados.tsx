import { useCallback, useEffect, useState } from 'react';
import {
  Line,
  LineChart,
  Area,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Loader2, Play, TrendingUp } from 'lucide-react';

// ---------------------------------------------------------------------------
// Tela de resultado do motor de previsao multi-modelo (Naive Sazonal,
// SARIMAX padronizado, Random Forest), rodando as 3 categorias fixas
// (Judicial, Extra Judicial, Rendimento). Dispara uma execucao via
// previsao-disparar -> GitHub Actions roda scripts/forecast.py -> o
// resultado inteiro volta em previsao_execucoes.resultado (jsonb), gravado
// pela previsao-callback. Aqui so lemos/exibimos; nenhuma logica de
// modelagem existe neste arquivo.
// ---------------------------------------------------------------------------

// Paleta categorica validada (dataviz skill) - ordem fixa, nunca ciclada.
const COR_REAL = '#0b0b0b';
const COR_NAIVE = '#eda100'; // slot 4 amarelo
const COR_SARIMAX = '#2a78d6'; // slot 1 azul
const COR_RF = '#eb6834'; // slot 2 laranja
const COR_CONSERVADOR = '#eda100'; // slot 4 amarelo
const COR_BASE = '#2a78d6'; // slot 1 azul
const COR_OTIMISTA = '#1baf7a'; // slot 3 agua

interface Metricas {
  mae: number;
  mape: number;
  rmse: number;
  r2: number | null;
}

interface Coeficiente {
  termo: string;
  e_exogena: boolean;
  coeficiente: number;
  erro_padrao: number;
  estatistica_z: number;
  p_valor: number;
  significante_5pct: boolean;
}

interface Importancia {
  variavel: string;
  importancia_pct_inc_mse: number;
}

interface ModeloResultado {
  nome: string;
  descricao: string;
  previsao_teste: Record<string, number | null>;
  metricas: Metricas;
  ranking_mape: number;
  coeficientes?: Coeficiente[];
  importancia_variaveis?: Importancia[];
  ordem?: [number, number, number, number, number, number, number] | null;
}

interface DieboldMariano {
  estatistica: number | null;
  p_valor: number | null;
  conclusao: string;
}

interface Cenario {
  taxa_crescimento_anual: number;
  previsao: Record<string, number>;
  intervalo_confianca_95: Record<string, [number, number]>;
}

interface CategoriaResultado {
  categoria: string;
  alvo: string;
  variaveis_exogenas: string[];
  historico: Record<string, number | null>;
  modelos: {
    naive_sazonal: ModeloResultado;
    sarimax: ModeloResultado;
    random_forest?: ModeloResultado;
  };
  diebold_mariano_sarimax_vs_rf: DieboldMariano | null;
  modelo_vencedor_mape: string;
  cenarios_futuros: Record<string, Cenario>;
}

interface ResultadoPrevisao {
  meses_teste: number;
  horizonte_meses: number;
  categorias: Record<string, CategoriaResultado>;
}

interface Execucao {
  id: string;
  status: string;
  meses_teste: number;
  horizonte_meses: number;
  created_at: string;
  concluido_em: string | null;
  erro: string | null;
}

const NOME_MODELO_COR: Record<string, string> = {
  naive_sazonal: COR_NAIVE,
  sarimax: COR_SARIMAX,
  random_forest: COR_RF,
};

function formatBRL(v: number | null | undefined) {
  if (v === null || v === undefined) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function formatPct(v: number | null | undefined) {
  if (v === null || v === undefined) return '—';
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;
}

function formatOrdem(ordem: ModeloResultado['ordem']) {
  if (!ordem || ordem.length !== 7) return null;
  const [p, d, q, P, D, Q, m] = ordem;
  return `(${p},${d},${q})(${P},${D},${Q})${m}`;
}

function formatMes(chaveISO: string) {
  const [ano, mes] = chaveISO.split('-');
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${nomes[parseInt(mes, 10) - 1]}/${ano.slice(2)}`;
}

function statusBadge(status: string) {
  switch (status) {
    case 'concluido':
      return <Badge className="bg-green-600 hover:bg-green-600">Concluído</Badge>;
    case 'erro':
      return <Badge variant="destructive">Erro</Badge>;
    case 'executando':
      return <Badge variant="secondary"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Executando</Badge>;
    default:
      return <Badge variant="outline">Pendente</Badge>;
  }
}

export default function PrevisaoResultados() {
  const { toast } = useToast();
  const [execucoes, setExecucoes] = useState<Execucao[]>([]);
  const [execucaoSelecionadaId, setExecucaoSelecionadaId] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoPrevisao | null>(null);
  const [carregandoResultado, setCarregandoResultado] = useState(false);
  const [disparando, setDisparando] = useState(false);
  const [mesesTeste, setMesesTeste] = useState(12);
  const [horizonteMeses, setHorizonteMeses] = useState(6);

  const carregarExecucoes = useCallback(async () => {
    const { data, error } = await supabase
      .from('previsao_execucoes')
      .select('id, status, meses_teste, horizonte_meses, created_at, concluido_em, erro')
      .order('created_at', { ascending: false })
      .limit(10);
    if (!error && data) {
      setExecucoes(data as Execucao[]);
      if (!execucaoSelecionadaId && data.length > 0) {
        setExecucaoSelecionadaId(data[0].id);
      }
    }
  }, [execucaoSelecionadaId]);

  useEffect(() => {
    carregarExecucoes();
  }, [carregarExecucoes]);

  // Enquanto houver execucao pendente/executando, faz polling a cada 8s
  useEffect(() => {
    const temPendente = execucoes.some((e) => e.status === 'pendente' || e.status === 'executando');
    if (!temPendente) return;
    const intervalo = setInterval(carregarExecucoes, 8000);
    return () => clearInterval(intervalo);
  }, [execucoes, carregarExecucoes]);

  useEffect(() => {
    if (!execucaoSelecionadaId) {
      setResultado(null);
      return;
    }
    const execucao = execucoes.find((e) => e.id === execucaoSelecionadaId);
    if (!execucao || execucao.status !== 'concluido') {
      setResultado(null);
      return;
    }
    setCarregandoResultado(true);
    supabase
      .from('previsao_execucoes')
      .select('resultado')
      .eq('id', execucaoSelecionadaId)
      .single()
      .then(({ data, error }) => {
        setCarregandoResultado(false);
        const row = data as { resultado?: unknown } | null;
        if (!error && row?.resultado) {
          setResultado(row.resultado as ResultadoPrevisao);
        }
      });
  }, [execucaoSelecionadaId, execucoes]);

  const handleDisparar = async () => {
    setDisparando(true);
    try {
      const { data, error } = await supabase.functions.invoke('previsao-disparar', {
        body: { meses_teste: mesesTeste, horizonte_meses: horizonteMeses },
      });
      if (error) throw error;
      toast({ title: 'Previsão disparada', description: 'Rodando as 3 categorias com os 3 modelos no GitHub Actions (1-3 min).' });
      setExecucaoSelecionadaId(data?.execucao_id ?? null);
      await carregarExecucoes();
    } catch (err) {
      toast({ title: 'Falha ao disparar', description: String(err), variant: 'destructive' });
    } finally {
      setDisparando(false);
    }
  };

  const execucaoEmAndamento = execucoes.some((e) => e.status === 'pendente' || e.status === 'executando');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Nova previsão</CardTitle>
          <CardDescription>
            Roda as 3 categorias (Judicial, Extra Judicial, Rendimento) com os 3 modelos (Naive Sazonal, SARIMAX, Random Forest) de uma vez, via GitHub Actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="meses-teste">Meses de backtest</Label>
            <Input id="meses-teste" type="number" min={6} max={24} className="w-32" value={mesesTeste} onChange={(e) => setMesesTeste(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="horizonte">Meses futuros a projetar</Label>
            <Input id="horizonte" type="number" min={1} max={18} className="w-32" value={horizonteMeses} onChange={(e) => setHorizonteMeses(Number(e.target.value))} />
          </div>
          <Button onClick={handleDisparar} disabled={disparando || execucaoEmAndamento}>
            {disparando || execucaoEmAndamento ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {execucaoEmAndamento ? 'Rodando...' : 'Gerar previsão'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Execuções recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Disparada em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Backtest / Horizonte</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {execucoes.map((e) => (
                <TableRow key={e.id} className={e.id === execucaoSelecionadaId ? 'bg-muted/50' : ''}>
                  <TableCell>{new Date(e.created_at).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>{statusBadge(e.status)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{e.meses_teste}m / {e.horizonte_meses}m</TableCell>
                  <TableCell>
                    {e.status === 'concluido' && (
                      <Button size="sm" variant={e.id === execucaoSelecionadaId ? 'default' : 'outline'} onClick={() => setExecucaoSelecionadaId(e.id)}>
                        Ver resultado
                      </Button>
                    )}
                    {e.status === 'erro' && e.erro && (
                      <span className="text-xs text-destructive">{e.erro}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {execucoes.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhuma execução ainda.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {carregandoResultado && (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      )}

      {resultado && (
        <Tabs defaultValue={Object.keys(resultado.categorias)[0]}>
          <TabsList>
            {Object.keys(resultado.categorias).map((cat) => (
              <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
            ))}
          </TabsList>
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

function CategoriaResultadoView({ dados }: { dados: CategoriaResultado }) {
  const meses = Object.keys(dados.historico).sort();
  const mesesTeste = Object.keys(dados.modelos.sarimax.previsao_teste).length;
  const contextoBacktest = meses.slice(-(mesesTeste + 12));

  const dadosBacktest = contextoBacktest.map((m) => ({
    mes: formatMes(m),
    real: dados.historico[m],
    naive: dados.modelos.naive_sazonal.previsao_teste[m] ?? undefined,
    sarimax: dados.modelos.sarimax.previsao_teste[m] ?? undefined,
    random_forest: dados.modelos.random_forest?.previsao_teste[m] ?? undefined,
  }));

  const configBacktest: ChartConfig = {
    real: { label: 'Real', color: COR_REAL },
    naive: { label: 'Naive Sazonal', color: COR_NAIVE },
    sarimax: { label: 'SARIMAX', color: COR_SARIMAX },
    ...(dados.modelos.random_forest ? { random_forest: { label: 'Random Forest', color: COR_RF } } : {}),
  };

  const mesesHistRecentes = meses.slice(-12);
  const mesesFuturos = Object.keys(dados.cenarios_futuros.base?.previsao ?? {}).sort();
  const dadosCenario = [
    ...mesesHistRecentes.map((m) => ({ mes: formatMes(m), real: dados.historico[m] })),
    ...mesesFuturos.map((m) => ({
      mes: formatMes(m),
      conservador: dados.cenarios_futuros.conservador?.previsao[m],
      base: dados.cenarios_futuros.base?.previsao[m],
      otimista: dados.cenarios_futuros.otimista?.previsao[m],
      banda_base: dados.cenarios_futuros.base?.intervalo_confianca_95[m],
    })),
  ];

  const configCenario: ChartConfig = {
    real: { label: 'Real', color: COR_REAL },
    conservador: { label: `Conservador (${formatPct(dados.cenarios_futuros.conservador?.taxa_crescimento_anual)})`, color: COR_CONSERVADOR },
    base: { label: `Base (${formatPct(dados.cenarios_futuros.base?.taxa_crescimento_anual)})`, color: COR_BASE },
    otimista: { label: `Otimista (${formatPct(dados.cenarios_futuros.otimista?.taxa_crescimento_anual)})`, color: COR_OTIMISTA },
  };

  const modelosOrdenados = Object.entries(dados.modelos).sort((a, b) => a[1].ranking_mape - b[1].ranking_mape);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Alvo: <strong>{dados.alvo}</strong></span>
        {dados.variaveis_exogenas.length > 0 && (
          <span className="text-sm text-muted-foreground">· Exógenas: {dados.variaveis_exogenas.join(', ')}</span>
        )}
        <Badge variant="secondary">Vencedor (menor MAPE): {dados.modelos[dados.modelo_vencedor_mape as keyof typeof dados.modelos]?.nome}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Backtest: real vs. cada modelo</CardTitle>
          <CardDescription>Últimos {mesesTeste} meses fechados, com 12 meses de contexto antes.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={configBacktest} className="aspect-auto h-[320px] w-full">
            <LineChart data={dadosBacktest} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatBRL(value as number)} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line dataKey="real" stroke={COR_REAL} strokeWidth={2} dot={false} />
              <Line dataKey="naive" stroke={COR_NAIVE} strokeWidth={2} strokeDasharray="4 3" dot={false} />
              <Line dataKey="sarimax" stroke={COR_SARIMAX} strokeWidth={2} strokeDasharray="4 3" dot={false} />
              {dados.modelos.random_forest && <Line dataKey="random_forest" stroke={COR_RF} strokeWidth={2} strokeDasharray="4 3" dot={false} />}
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Métricas do backtest (menor = melhor, exceto R²)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modelo</TableHead>
                <TableHead>MAPE</TableHead>
                <TableHead>MAE</TableHead>
                <TableHead>RMSE</TableHead>
                <TableHead>R²</TableHead>
                <TableHead>Ranking</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modelosOrdenados.map(([chave, m]) => (
                <TableRow key={chave}>
                  <TableCell className="font-medium"><span className="inline-block h-2.5 w-2.5 rounded-full mr-2" style={{ background: NOME_MODELO_COR[chave] }} />{m.nome}</TableCell>
                  <TableCell>{m.metricas.mape.toFixed(2)}%</TableCell>
                  <TableCell>{formatBRL(m.metricas.mae)}</TableCell>
                  <TableCell>{formatBRL(m.metricas.rmse)}</TableCell>
                  <TableCell>{m.metricas.r2 !== null ? m.metricas.r2.toFixed(3) : '—'}</TableCell>
                  <TableCell>{m.ranking_mape}º</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {dados.diebold_mariano_sarimax_vs_rf && (
            <Alert className="mt-4">
              <AlertTitle>Teste de Diebold-Mariano (SARIMAX vs. Random Forest)</AlertTitle>
              <AlertDescription>
                Estatística {dados.diebold_mariano_sarimax_vs_rf.estatistica ?? '—'}, p-valor {dados.diebold_mariano_sarimax_vs_rf.p_valor ?? '—'} — {dados.diebold_mariano_sarimax_vs_rf.conclusao}.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projeção de cenários</CardTitle>
          <CardDescription>Padrão sazonal dos últimos 12 meses aplicado sobre a taxa de crescimento histórica desta categoria (±5 p.p. entre conservador e otimista). Faixa sombreada = intervalo de confiança de 95% do cenário base.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={configCenario} className="aspect-auto h-[320px] w-full">
            <ComposedChart data={dadosCenario} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => (Array.isArray(value) ? `${formatBRL(Number(value[0]))} – ${formatBRL(Number(value[1]))}` : formatBRL(Number(value)))} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area dataKey="banda_base" fill={COR_BASE} fillOpacity={0.12} stroke="none" />
              <Line dataKey="real" stroke={COR_REAL} strokeWidth={2} dot={false} />
              <Line dataKey="conservador" stroke={COR_CONSERVADOR} strokeWidth={2} strokeDasharray="4 3" dot={false} />
              <Line dataKey="base" stroke={COR_BASE} strokeWidth={2} dot={false} />
              <Line dataKey="otimista" stroke={COR_OTIMISTA} strokeWidth={2} strokeDasharray="4 3" dot={false} />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {dados.modelos.sarimax.coeficientes && dados.modelos.sarimax.coeficientes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              Coeficientes do SARIMAX
              {formatOrdem(dados.modelos.sarimax.ordem) && (
                <Badge variant="outline" className="font-mono text-xs font-normal">
                  ordem {formatOrdem(dados.modelos.sarimax.ordem)}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Termos com p-valor &lt; 0,05 são estatisticamente significantes a 5%. Ordem = (p,d,q)(P,D,Q)m escolhida pelo auto_arima via teste KPSS/OCSB — não é mais fixada em d=1 D=1.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Termo</TableHead>
                  <TableHead>Coeficiente</TableHead>
                  <TableHead>Erro padrão</TableHead>
                  <TableHead>z</TableHead>
                  <TableHead>p-valor</TableHead>
                  <TableHead>Significante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.modelos.sarimax.coeficientes.map((c) => (
                  <TableRow key={c.termo}>
                    <TableCell>{c.termo}{c.e_exogena && <Badge variant="outline" className="ml-2 text-xs">exógena</Badge>}</TableCell>
                    <TableCell>{c.coeficiente}</TableCell>
                    <TableCell>{c.erro_padrao}</TableCell>
                    <TableCell>{c.estatistica_z}</TableCell>
                    <TableCell>{c.p_valor}</TableCell>
                    <TableCell>{c.significante_5pct ? <Badge className="bg-green-600 hover:bg-green-600">Sim</Badge> : <Badge variant="outline">Não</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {dados.modelos.random_forest?.importancia_variaveis && dados.modelos.random_forest.importancia_variaveis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Importância de variáveis (Random Forest)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(() => {
              const imps = dados.modelos.random_forest.importancia_variaveis;
              const max = Math.max(...imps.map((i) => Math.abs(i.importancia_pct_inc_mse)), 1);
              return imps.map((i) => (
                <div key={i.variavel} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-sm text-muted-foreground truncate">{i.variavel}</span>
                  <div className="h-2.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(4, (Math.abs(i.importancia_pct_inc_mse) / max) * 100)}%`, background: COR_RF }} />
                  </div>
                </div>
              ));
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
