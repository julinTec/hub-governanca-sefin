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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, FileSpreadsheet, Loader2, Upload } from 'lucide-react';

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
  rendimento: number;
  arrecadado: number;
  atualJudicial: number | null;
  atualExtraJudicial: number | null;
  atualRendimento: number | null;
  existiaAntes: boolean;
  diferente: boolean;
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

      // Bloco de detalhamento: linhas 1..31 (0-indexed), colunas
      // 0=Fundo (com merge vertical -> precisa ffill), 1=Tipo, 2=Receita,
      // 3..14 = valores mensais.
      let fundoAtual = '';
      const detalhe: { fundo: string; tipo: string; valores: number[] }[] = [];
      for (let r = 1; r <= 31 && r < rows.length; r++) {
        const row = rows[r] || [];
        const fundoCel = row[0];
        if (typeof fundoCel === 'string' && fundoCel.trim()) fundoAtual = fundoCel.trim();
        const tipoCel = row[1];
        if (typeof tipoCel !== 'string' || !tipoCel.trim()) continue;
        const valores: number[] = [];
        for (let c = 3; c <= 14; c++) {
          const v = row[c];
          valores.push(typeof v === 'number' ? v : 0);
        }
        detalhe.push({ fundo: fundoAtual, tipo: tipoCel.trim(), valores });
      }

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
      const { data: existentes, error: fetchError } = await supabase
        .from('previsao_serie_historica')
        .select('data, tipo_judicial, tipo_extra_judicial, tipo_rendimento')
        .in('data', datasISO);

      if (fetchError) throw fetchError;

      const existentesPorData = new Map(
        (existentes || []).map((row) => [row.data, row])
      );

      const novasLinhas: LinhaComparacao[] = mesesComDado.map(({ idx, data }) => {
        const dataISO = data.toISOString().slice(0, 10);
        const judicial = Math.round(judicialMes[idx] * 100) / 100;
        const extraJudicial = Math.round(extraMes[idx] * 100) / 100;
        const rendimento = Math.round(rendimentoMes[idx] * 100) / 100;
        const existente = existentesPorData.get(dataISO);
        const atualJudicial = existente?.tipo_judicial ?? null;
        const atualExtraJudicial = existente?.tipo_extra_judicial ?? null;
        const atualRendimento = existente?.tipo_rendimento ?? null;
        const diferente =
          diff(atualJudicial, judicial) || diff(atualExtraJudicial, extraJudicial) || diff(atualRendimento, rendimento);

        return {
          dataISO,
          mesLabel: `${MESES_PT[data.getMonth()]}/${data.getFullYear()}`,
          judicial,
          extraJudicial,
          rendimento,
          arrecadado: Math.round((judicial + extraJudicial + rendimento) * 100) / 100,
          atualJudicial,
          atualExtraJudicial,
          atualRendimento,
          existiaAntes: !!existente,
          diferente,
        };
      });

      novasLinhas.sort((a, b) => a.dataISO.localeCompare(b.dataISO));
      setLinhas(novasLinhas);
      // Pré-seleciona só o que é novo ou diferente do que já está gravado
      setSelecionadas(new Set(novasLinhas.filter((l) => l.diferente).map((l) => l.dataISO)));
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
      tipo_rendimento: l.rendimento,
      arrecadado: l.arrecadado,
      fonte: 'arrecadacao_detalhada',
      criado_por: user?.id,
    }));

    const { error } = await supabase
      .from('previsao_serie_historica')
      .upsert(payload, { onConflict: 'data' });

    setSalvando(false);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Salvo', description: `${paraSalvar.length} mês(es) atualizado(s) em previsao_serie_historica.` });
      setLinhas((prev) =>
        prev.map((l) =>
          selecionadas.has(l.dataISO)
            ? { ...l, atualJudicial: l.judicial, atualExtraJudicial: l.extraJudicial, atualRendimento: l.rendimento, existiaAntes: true, diferente: false }
            : l
        )
      );
    }
  };

  return (
    <MainLayout>
      <ModuleHeader
        title="Previsão de Arrecadação"
        description="Importação e conciliação da arrecadação mensal, a partir do arquivo ARRECADAÇÃO"
      />

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
                    <TableCell>
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
    </MainLayout>
  );
}
