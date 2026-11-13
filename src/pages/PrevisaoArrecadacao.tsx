import { useState } from 'react';
import * as XLSX from 'xlsx';
import MainLayout from '@/components/layout/MainLayout';
import ModuleHeader from '@/components/shared/ModuleHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, FileSpreadsheet, Info, Loader2, TrendingUp, Upload } from 'lucide-react';
import PrevisaoResultados from '@/components/previsao/PrevisaoResultados';

// ---------------------------------------------------------------------------
// Importação da arrecadação mensal (fluxo "meio-termo" descrito na discussão
// sobre a defasagem entre BASE_MONTADA_LIMPA e ARRECADAÇÃO):
//
// A aba "Consolidado" do arquivo ARRECADAÇÃO tem um detalhamento por
// fundo/tipo/receita (linhas) x mês (colunas) que está sempre mais atual do
// que os totais por tipo usados no modelo de previsão. Em vez de depender de
// alguém copiar esses totais manualmente (o que já gerou pelo menos um erro
// de digitação em fev/2026), esta tela recalcula os totais por tipo direto
// do detalhamento e mostra lado a lado com o que já está gravado, para
// revisão antes de confirmar.
//
// Formato esperado: aba "Consolidado", linhas 2..32 (1-indexed) com
// colunas A=Fundo, B=Tipo, C=Receita, D..O = valores de Jan a Dez do ano
// vigente (a data real de cada coluna é lida da linha de cabeçalho, coluna
// Q em diante, quando presente; senão assume D..O = Jan..Dez do ano mais
// recente encontrado nas datas da própria aba).
// ---------------------------------------------------------------------------

interface LinhaComparacao {
  dataISO: string;
  mesLabel: string;
  judicial: number;
  extraJudicial: number;
  /** Parte do Extra Judicial que e Restituicao (63320) - ja incluida em extraJudicial. */
  restituicao: number;
  rendimento: number;
  arrecadado: number;
  atualJudicial: number | null;
  atualExtraJudicial: number | null;
  atualRestituicao: number | null;
  atualRendimento: number | null;
  existiaAntes: boolean;
  diferente: boolean;
  /** Mes ainda em andamento (alguma categoria zerada ou total muito abaixo dos meses anteriores). */
  parcial: boolean;
  motivoParcial: string | null;
}

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatBRL(v: number | null) {
  if (v === null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Diferença > R$0,01 conta como "diferente" (evita ruído de arredondamento)
function diff(a: number | null, b: number) {
  if (a === null) return true;
  return Math.abs(a - b) > 0.01;
}

export default function PrevisaoArrecadacao() {
  const [linhas, setLinhas] = useState<LinhaComparacao[]>([]);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [processando, setProcessando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [erroParse, setErroParse] = useState<string | null>(null);
  // Linhas com Tipo preenchido fora do bloco padrao (linhas 2-32) - nao somadas.
  const [linhasIgnoradas, setLinhasIgnoradas] = useState<string[]>([]);
  // Banco ainda sem a coluna extra_judicial_restituicao (migration pendente).
  const [colunaRestituicaoAusente, setColunaRestituicaoAusente] = useState(false);
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNomeArquivo(file.name);
    setErroParse(null);
    setProcessando(true);
    setLinhas([]);
    setSelecionadas(new Set());
    setLinhasIgnoradas([]);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

      const sheetName = workbook.SheetNames.find((n) => n.toLowerCase().includes('consolidado'));
      if (!sheetName) {
        throw new Error(
          `Não achei uma aba "Consolidado" nesse arquivo. Abas encontradas: ${workbook.SheetNames.join(', ')}`
        );
      }
      const sheet = workbook.Sheets[sheetName];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

      // Linha de cabeçalho (índice 0): colunas 3..14 costumam trazer a data
      // real de cada mês (dd/mm/aaaa). Usamos isso pra rotular as colunas
      // em vez de assumir Jan..Dez de um ano fixo.
      const headerRow = rows[0] || [];
      const colunasData: (Date | null)[] = [];
      for (let c = 3; c <= 14; c++) {
        const v = headerRow[c];
        colunasData.push(v instanceof Date ? v : null);
      }

      // Bloco de detalhamento: colunas 0=Fundo (com merge vertical -> precisa
      // ffill nas linhas 2-32), 1=Tipo, 2=Receita, 3..14 = valores mensais.
      // Desde 13/11/2026 as linhas abaixo do bloco padrao tambem entram
      // (ex. linha 33 "63320 - Restituicao de excedentes ao teto", Fermoju /
      // Extra Judicial), desde que tenham o Fundo preenchido na propria linha
      // (evita somar linhas-resumo soltas no fim da aba).
      const CATEGORIAS = ['Judicial', 'Extra Judicial', 'Rendimento'];
      const ehRestituicao = (receita: string) => /63320|RESTITUI/i.test(receita);
      let fundoAtual = '';
      const detalhe: { fundo: string; tipo: string; receita: string; valores: number[] }[] = [];
      const ignoradas: string[] = [];
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r] || [];
        const fundoCel = typeof row[0] === 'string' ? row[0].trim() : '';
        const tipoCel = typeof row[1] === 'string' ? row[1].trim() : '';
        const receita = String(row[2] ?? '').trim();
        const valores: number[] = [];
        for (let c = 3; c <= 14; c++) {
          const v = row[c];
          valores.push(typeof v === 'number' ? v : 0);
        }
        const temValor = valores.some((v) => v !== 0);
        if (r <= 31) {
          if (fundoCel) fundoAtual = fundoCel;
          if (!tipoCel) continue;
          detalhe.push({ fundo: fundoAtual, tipo: tipoCel, receita, valores });
        } else if (tipoCel && temValor) {
          if (fundoCel && CATEGORIAS.includes(tipoCel)) {
            detalhe.push({ fundo: fundoCel, tipo: tipoCel, receita, valores });
          } else {
            ignoradas.push(`Linha ${r + 1}: ${receita || '(sem receita)'} (${[fundoCel, tipoCel].filter(Boolean).join(' · ')})`);
          }
        }
      }
      setLinhasIgnoradas(ignoradas);

      if (detalhe.length === 0) {
        throw new Error('Não encontrei linhas de detalhamento (Fundo/Tipo/Receita) no formato esperado.');
      }

      // Soma por tipo, mês a mês
      const totalPorTipoMes: Record<string, number[]> = {};
      for (const linha of detalhe) {
        if (!totalPorTipoMes[linha.tipo]) totalPorTipoMes[linha.tipo] = new Array(12).fill(0);
        linha.valores.forEach((v, i) => (totalPorTipoMes[linha.tipo][i] += v));
      }

      const judicialMes = totalPorTipoMes['Judicial'] || new Array(12).fill(0);
      const extraMes = totalPorTipoMes['Extra Judicial'] || new Array(12).fill(0);
      const rendimentoMes = totalPorTipoMes['Rendimento'] || new Array(12).fill(0);
      const restituicaoMes = new Array(12).fill(0);
      detalhe
        .filter((l) => l.tipo === 'Extra Judicial' && ehRestituicao(l.receita))
        .forEach((l) => l.valores.forEach((v, i) => (restituicaoMes[i] += v)));

      // Só considera meses com dado real (soma > 0 em algum tipo)
      const anoFallback = colunasData.find((d) => d)?.getFullYear() ?? new Date().getFullYear();
      const mesesComDado: { idx: number; data: Date }[] = [];
      for (let i = 0; i < 12; i++) {
        const total = judicialMes[i] + extraMes[i] + rendimentoMes[i];
        if (total > 0) {
          const data = colunasData[i] ?? new Date(anoFallback, i, 1);
          mesesComDado.push({ idx: i, data });
        }
      }

      if (mesesComDado.length === 0) {
        throw new Error('Nenhum mês com valores maiores que zero foi encontrado no detalhamento.');
      }

      // Busca o que já está gravado em previsao_serie_historica pra esses meses
      const datasISO = mesesComDado.map((m) => m.data.toISOString().slice(0, 10));
      // Com fallback: se o banco ainda nao tiver a coluna da restituicao
      // (migration de 13/11), busca sem ela.
      type Existente = { data: string; tipo_judicial: number | null; tipo_extra_judicial: number | null; tipo_rendimento: number | null; extra_judicial_restituicao?: number | null };
      const buscarExistentes = (colunas: string) => supabase.from('previsao_serie_historica').select(colunas).in('data', datasISO);
      let { data: existentesRaw, error: fetchError } = await buscarExistentes('data, tipo_judicial, tipo_extra_judicial, tipo_rendimento, extra_judicial_restituicao');
      if (fetchError && /extra_judicial_restituicao/.test(fetchError.message)) {
        setColunaRestituicaoAusente(true);
        ({ data: existentesRaw, error: fetchError } = await buscarExistentes('data, tipo_judicial, tipo_extra_judicial, tipo_rendimento'));
      }
      if (fetchError) throw fetchError;
      const existentes = (existentesRaw || []) as unknown as Existente[];

      const existentesPorData = new Map(
        (existentes || []).map((row) => [row.data, row])
      );

      // Mes parcial (ainda em andamento): alguma categoria zerada que vinha
      // tendo valor nos meses anteriores, ou total abaixo de 60% da mediana
      // dos meses anteriores. Nao entra pre-selecionado.
      const totalMes = (i: number) => judicialMes[i] + extraMes[i] + rendimentoMes[i];
      const motivoParcialDe = (idx: number): string | null => {
        const anteriores = mesesComDado.filter((m) => m.idx < idx).map((m) => m.idx);
        if (anteriores.length === 0) return null;
        const zeradas = ([['Judicial', judicialMes], ['Extra Judicial', extraMes], ['Rendimento', rendimentoMes]] as const)
          .filter(([, serie]) => serie[idx] <= 0 && anteriores.some((i) => serie[i] > 0))
          .map(([nome]) => nome);
        if (zeradas.length) return `${zeradas.join(', ')} ainda sem valor`;
        const totais = anteriores.map(totalMes).sort((a, b) => a - b);
        const mediana = totais[Math.floor(totais.length / 2)];
        if (totalMes(idx) < 0.6 * mediana) return `total ${Math.round((totalMes(idx) / mediana) * 100)}% da mediana dos meses anteriores`;
        return null;
      };

      const novasLinhas: LinhaComparacao[] = mesesComDado.map(({ idx, data }) => {
        const dataISO = data.toISOString().slice(0, 10);
        const judicial = Math.round(judicialMes[idx] * 100) / 100;
        const extraJudicial = Math.round(extraMes[idx] * 100) / 100;
        const rendimento = Math.round(rendimentoMes[idx] * 100) / 100;
        const restituicao = Math.round(restituicaoMes[idx] * 100) / 100;
        const existente = existentesPorData.get(dataISO);
        const atualJudicial = existente?.tipo_judicial ?? null;
        const atualExtraJudicial = existente?.tipo_extra_judicial ?? null;
        const atualRendimento = existente?.tipo_rendimento ?? null;
        const atualRestituicao = existente?.extra_judicial_restituicao ?? null;
        const diferente =
          diff(atualJudicial, judicial) || diff(atualExtraJudicial, extraJudicial) || diff(atualRendimento, rendimento) ||
          (restituicao !== 0 && diff(atualRestituicao, restituicao));

        return {
          dataISO,
          mesLabel: `${MESES_PT[data.getMonth()]}/${data.getFullYear()}`,
          judicial,
          extraJudicial,
          restituicao,
          rendimento,
          arrecadado: Math.round((judicial + extraJudicial + rendimento) * 100) / 100,
          atualJudicial,
          atualExtraJudicial,
          atualRestituicao,
          atualRendimento,
          existiaAntes: !!existente,
          diferente,
          parcial: motivoParcialDe(idx) !== null,
          motivoParcial: motivoParcialDe(idx),
        };
      });

      novasLinhas.sort((a, b) => a.dataISO.localeCompare(b.dataISO));
      setLinhas(novasLinhas);
      // Pré-seleciona só o que é novo ou diferente do que já está gravado
      // (mes parcial nunca entra pre-selecionado)
      setSelecionadas(new Set(novasLinhas.filter((l) => l.diferente && !l.parcial).map((l) => l.dataISO)));
    } catch (err) {
      setErroParse(err instanceof Error ? err.message : String(err));
    } finally {
      setProcessando(false);
    }
  };

  const toggleSelecionada = (dataISO: string) => {
    setSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(dataISO)) next.delete(dataISO);
      else next.add(dataISO);
      return next;
    });
  };

  const handleSalvar = async () => {
    if (!isAdmin) {
      toast({ title: 'Sem permissão', description: 'Só administradores podem gravar na série histórica.', variant: 'destructive' });
      return;
    }
    const paraSalvar = linhas.filter((l) => selecionadas.has(l.dataISO));
    if (paraSalvar.length === 0) return;

    setSalvando(true);
    const payload = paraSalvar.map((l) => ({
      data: l.dataISO,
      tipo_judicial: l.judicial,
      tipo_extra_judicial: l.extraJudicial,
      extra_judicial_restituicao: l.restituicao,
      tipo_rendimento: l.rendimento,
      arrecadado: l.arrecadado,
      fonte: 'arrecadacao_detalhada',
      criado_por: user?.id,
    }));

    let { error } = await supabase
      .from('previsao_serie_historica')
      .upsert(payload, { onConflict: 'data' });
    // Banco sem a coluna da restituicao ainda: grava o resto (o Extra
    // Judicial ja inclui a restituicao) e avisa.
    if (error && /extra_judicial_restituicao/.test(error.message)) {
      setColunaRestituicaoAusente(true);
      ({ error } = await supabase
        .from('previsao_serie_historica')
        .upsert(payload.map(({ extra_judicial_restituicao: _r, ...resto }) => resto), { onConflict: 'data' }));
    }

    setSalvando(false);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Salvo', description: `${paraSalvar.length} mês(es) atualizado(s) em previsao_serie_historica.` });
      setLinhas((prev) =>
        prev.map((l) =>
          selecionadas.has(l.dataISO)
            ? { ...l, atualJudicial: l.judicial, atualExtraJudicial: l.extraJudicial, atualRestituicao: l.restituicao, atualRendimento: l.rendimento, existiaAntes: true, diferente: false }
            : l
        )
      );
    }
  };

  return (
    <MainLayout>
      <ModuleHeader
        title="Previsão de Arrecadação"
        description="Importação de dados e previsão (Naive Sazonal, SARIMAX, Random Forest) por categoria de receita"
      />

      <Tabs defaultValue="previsao" className="mb-6">
        <TabsList>
          <TabsTrigger value="previsao"><TrendingUp className="h-4 w-4 mr-2" />Previsão</TabsTrigger>
          <TabsTrigger value="importar"><FileSpreadsheet className="h-4 w-4 mr-2" />Importar dados</TabsTrigger>
        </TabsList>

        <TabsContent value="previsao" className="mt-6">
          <PrevisaoResultados />
        </TabsContent>

        <TabsContent value="importar" className="mt-6 space-y-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-4 w-4" />
            Importar arquivo ARRECADAÇÃO
          </CardTitle>
          <CardDescription>
            Suba o arquivo mensal (aba "Consolidado"). Os totais por tipo (Judicial, Extra Judicial,
            Rendimento) são recalculados direto do detalhamento por fundo/receita — não dependem do
            bloco auxiliar que costuma ficar defasado. Campos que essa planilha não tem (casos
            processuais, pessoal, indicadores macro) não são alterados por aqui.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <label htmlFor="arquivo-arrecadacao">
              <input
                id="arquivo-arrecadacao"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFile}
              />
              <Button asChild variant="outline">
                <span className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Escolher arquivo
                </span>
              </Button>
            </label>
            {nomeArquivo && <span className="text-sm text-muted-foreground">{nomeArquivo}</span>}
            {processando && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>

          {erroParse && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Não consegui processar esse arquivo</AlertTitle>
              <AlertDescription>{erroParse}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {linhas.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Revisão antes de salvar</CardTitle>
              <CardDescription>
                Marcados em laranja: meses novos ou com valor diferente do que já está gravado.
                Desmarque o que não quiser atualizar.
              </CardDescription>
            </div>
            <Button onClick={handleSalvar} disabled={salvando || selecionadas.size === 0 || !isAdmin}>
              {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar {selecionadas.size > 0 ? `(${selecionadas.size})` : ''}
            </Button>
          </CardHeader>
          <CardContent>
            {linhas.some((l) => l.parcial) && (
              <Alert className="mb-4 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Mês parcial não marcado</AlertTitle>
                <AlertDescription>
                  {linhas.filter((l) => l.parcial).map((l) => `${l.mesLabel} (${l.motivoParcial})`).join('; ')}. Parece um mês ainda em
                  andamento: gravá-lo como realizado distorce a comparação com a previsão. Só marque se o mês já estiver fechado.
                </AlertDescription>
              </Alert>
            )}
            {linhasIgnoradas.length > 0 && (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Linhas não reconhecidas não foram somadas</AlertTitle>
                <AlertDescription>
                  <p>Abaixo do bloco padrão, só entram linhas com Fundo e Tipo (Judicial, Extra Judicial ou Rendimento) preenchidos. Ficaram de fora:</p>
                  <ul className="list-disc pl-5 mt-1">
                    {linhasIgnoradas.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            {colunaRestituicaoAusente && (
              <Alert className="mb-4 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Migration da restituição ainda não aplicada</AlertTitle>
                <AlertDescription>
                  O banco ainda não tem a coluna <code>extra_judicial_restituicao</code>. Dá para salvar normalmente (o Extra Judicial já inclui a
                  restituição); só a parte separada da restituição não fica gravada. Peça ao Lovable para aplicar a migration
                  <code> 20261113130000_serie_historica_restituicao.sql</code> e depois importe de novo.
                </AlertDescription>
              </Alert>
            )}
            {linhas.some((l) => l.restituicao !== 0) && (
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Restituição (63320) incluída no Extra Judicial</AlertTitle>
                <AlertDescription>
                  O Extra Judicial abaixo já inclui a receita 63320 (Restituição de excedentes ao teto + outras restituições), que também fica
                  registrada à parte. Os meses já gravados sem ela aparecem como &quot;Diferente do gravado&quot;. A previsão foi treinada sem essa
                  receita; na aba Real × Previsto dá para comparar com ou sem ela.
                </AlertDescription>
              </Alert>
            )}
            {!isAdmin && (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Você pode revisar os valores, mas só administradores podem confirmar e gravar na série histórica.
                </AlertDescription>
              </Alert>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Mês</TableHead>
                  <TableHead>Judicial</TableHead>
                  <TableHead>Extra Judicial</TableHead>
                  <TableHead>Rendimento</TableHead>
                  <TableHead>Arrecadado</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => (
                  <TableRow key={l.dataISO} className={l.diferente ? 'bg-amber-50 dark:bg-amber-950/20' : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selecionadas.has(l.dataISO)}
                        onCheckedChange={() => toggleSelecionada(l.dataISO)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{l.mesLabel}</TableCell>
                    <TableCell>
                      {formatBRL(l.judicial)}
                      {diff(l.atualJudicial, l.judicial) && l.existiaAntes && (
                        <div className="text-xs text-muted-foreground line-through">{formatBRL(l.atualJudicial)}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatBRL(l.extraJudicial)}
                      {l.restituicao !== 0 && (
                        <div className="text-xs text-muted-foreground">inclui restituição {formatBRL(l.restituicao)}</div>
                      )}
                      {diff(l.atualExtraJudicial, l.extraJudicial) && l.existiaAntes && (
                        <div className="text-xs text-muted-foreground line-through">{formatBRL(l.atualExtraJudicial)}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatBRL(l.rendimento)}
                      {diff(l.atualRendimento, l.rendimento) && l.existiaAntes && (
                        <div className="text-xs text-muted-foreground line-through">{formatBRL(l.atualRendimento)}</div>
                      )}
                    </TableCell>
                    <TableCell>{formatBRL(l.arrecadado)}</TableCell>
                    <TableCell className="space-x-1">
                      {l.parcial && <Badge className="bg-amber-500 hover:bg-amber-500">Parcial</Badge>}
                      {!l.existiaAntes ? (
                        <Badge variant="secondary">Novo</Badge>
                      ) : l.diferente ? (
                        <Badge variant="destructive">Diferente do gravado</Badge>
                      ) : (
                        <Badge variant="outline">Igual ao gravado</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
