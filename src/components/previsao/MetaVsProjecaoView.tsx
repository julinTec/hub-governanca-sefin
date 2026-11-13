import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { CategoriaResultado } from '@/components/previsao/PrevisaoResultados';

// ---------------------------------------------------------------------------
// Projecao x meta 2026 (13/11/2026)
//
// Decisao da reuniao de 13/11: as metas 2027-2032 saem da projecao de cada
// ano (nao de um % fixo composto), e cada ano e apresentado com o valor e o
// % ACUMULADO sobre a base de 2026 - a meta oficial de 2026,
// R$ 512.971.024,06 (editavel na tela; os % recalculam na hora).
// Os valores vem da execucao selecionada (soma das 3 categorias por ano
// civil, por cenario). So entram anos completos posteriores a meta.
// ---------------------------------------------------------------------------

export const META_OFICIAL_2026 = 512971024.06;
const CHAVE_STORAGE = 'hub-previsao-meta-base-2026';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl0 = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const pct = (v: number) =>
  `${v > 0 ? '+' : ''}${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

/** "512.971.024,06" / "512971024.06" / "R$ 512.971.024,06" -> numero. */
function lerValorBR(txt: string): number | null {
  const limpo = txt.replace(/[R$\s]/g, '');
  if (!limpo) return null;
  const normal = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
  const n = Number(normal);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function lerMetaSalva(): number {
  try {
    const v = Number(localStorage.getItem(CHAVE_STORAGE));
    return Number.isFinite(v) && v > 0 ? v : META_OFICIAL_2026;
  } catch {
    return META_OFICIAL_2026;
  }
}

type Cenario = 'conservador' | 'base' | 'otimista';
const CENARIOS: Cenario[] = ['conservador', 'base', 'otimista'];

export default function MetaVsProjecaoView({ categorias }: { categorias: Record<string, CategoriaResultado> }) {
  const [meta, setMeta] = useState<number>(lerMetaSalva);
  const [texto, setTexto] = useState<string>(() => brl(lerMetaSalva()).replace('R$', '').trim());
  const anoBase = '2026';

  const linhas = useMemo(() => {
    // soma das categorias por ano civil e cenario
    const soma: Record<string, Record<Cenario, number>> = {};
    const mesesPorAno: Record<string, Set<string>> = {};
    Object.values(categorias).forEach((dados) => {
      CENARIOS.forEach((c) => {
        Object.entries(dados.cenarios_futuros[c]?.previsao ?? {}).forEach(([mes, v]) => {
          const ano = mes.slice(0, 4);
          if (ano <= anoBase) return;
          soma[ano] ??= { conservador: 0, base: 0, otimista: 0 };
          soma[ano][c] += v ?? 0;
          if (c === 'base') (mesesPorAno[ano] ??= new Set()).add(mes);
        });
      });
    });
    return Object.keys(soma)
      .sort()
      .filter((ano) => (mesesPorAno[ano]?.size ?? 0) === 12) // so anos completos
      .map((ano, i, anos) => ({
        ano,
        valores: soma[ano],
        anterior: i > 0 ? soma[anos[i - 1]].base : null,
      }));
  }, [categorias]);

  const aplicar = (v: string) => {
    setTexto(v);
    const n = lerValorBR(v);
    if (n !== null) {
      setMeta(n);
      try { localStorage.setItem(CHAVE_STORAGE, String(n)); } catch { /* sem storage: so na sessao */ }
    }
  };
  const restaurar = () => aplicar(brl(META_OFICIAL_2026).replace('R$', '').trim());
  const metaValida = lerValorBR(texto) !== null;
  const ehOficial = Math.abs(meta - META_OFICIAL_2026) < 0.005;

  if (linhas.length === 0) return null;
  const ultimo = linhas[linhas.length - 1];
  const nAnos = Number(ultimo.ano) - Number(anoBase);
  const taxaEquivalente = Math.pow(ultimo.valores.base / meta, 1 / nAnos) - 1;

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-end sm:justify-between sm:space-y-0">
        <div>
          <CardTitle className="text-base">Projeção × meta de {anoBase}</CardTitle>
          <CardDescription>
            Valores previstos de cada ano (soma das 3 categorias) e o % acumulado sobre a meta de {anoBase}. Altere a meta para recalcular os percentuais.
          </CardDescription>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="meta-base" className="text-xs">Meta {anoBase} (R$)</Label>
            <Input
              id="meta-base"
              inputMode="decimal"
              className={cn('w-48 text-right tabular-nums', !metaValida && 'border-destructive')}
              value={texto}
              onChange={(e) => aplicar(e.target.value)}
            />
          </div>
          {!ehOficial && (
            <Button size="sm" variant="ghost" onClick={restaurar} title="Voltar para R$ 512.971.024,06">
              Meta oficial
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ano</TableHead>
              <TableHead className="text-right">Previsto (base)</TableHead>
              <TableHead className="text-right">% sobre a meta {anoBase}</TableHead>
              <TableHead className="text-right">vs. ano anterior</TableHead>
              <TableHead className="text-right">Conservador</TableHead>
              <TableHead className="text-right">Otimista</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="text-muted-foreground hover:bg-transparent">
              <TableCell>{anoBase} (meta{ehOficial ? ' oficial' : ''})</TableCell>
              <TableCell className="text-right tabular-nums">{brl(meta)}</TableCell>
              <TableCell className="text-right">—</TableCell>
              <TableCell className="text-right">—</TableCell>
              <TableCell className="text-right">—</TableCell>
              <TableCell className="text-right">—</TableCell>
            </TableRow>
            {linhas.map(({ ano, valores, anterior }) => (
              <TableRow key={ano}>
                <TableCell className="font-medium">{ano}</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{brl0(valores.base)}</TableCell>
                <TableCell className="text-right tabular-nums font-semibold text-primary">{pct(valores.base / meta - 1)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{anterior ? pct(valores.base / anterior - 1) : pct(valores.base / meta - 1)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {brl0(valores.conservador)} <span className="text-xs">({pct(valores.conservador / meta - 1)})</span>
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {brl0(valores.otimista)} <span className="text-xs">({pct(valores.otimista / meta - 1)})</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="mt-3 text-xs text-muted-foreground">
          Equivale a um crescimento médio de {pct(taxaEquivalente)} ao ano de {anoBase} a {ultimo.ano} sobre a meta (só como referência — as metas são os valores de
          cada ano, não um % fixo). &quot;vs. ano anterior&quot; em {linhas[0].ano} compara com a meta de {anoBase}.
        </p>
      </CardContent>
    </Card>
  );
}
