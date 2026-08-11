import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import KpiCard from './KpiCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import {
  classifyQuadrant,
  DEFAULT_IMPACT_THRESHOLD,
  medianOf,
  QUADRANTS,
  valorPorEsforco,
  VALOR_POR_ESFORCO_TOOLTIP,
  cleanScaleLabel,
  getRoStatusDef,
} from '@/lib/statusReport/config';
import type { SrRo } from '@/hooks/useStatusReport';

export default function PriorizacaoTab({ ros, onSelectRo }: { ros: SrRo[]; onSelectRo: (ro: SrRo) => void }) {
  const avaliaveis = useMemo(
    () => ros.filter((r) => r.impacto_nivel !== null && r.esforco !== null && r.esforco > 0),
    [ros],
  );
  const defaultEffortThreshold = useMemo(() => medianOf(avaliaveis.map((r) => r.esforco as number)) ?? 0, [avaliaveis]);
  const [impactThreshold, setImpactThreshold] = useState(DEFAULT_IMPACT_THRESHOLD);
  const [effortThreshold, setEffortThreshold] = useState<number | null>(null);
  const effort = effortThreshold ?? defaultEffortThreshold;

  const rows = useMemo(
    () =>
      avaliaveis
        .map((r) => {
          const q = classifyQuadrant(r.impacto_nivel, r.esforco, impactThreshold, effort);
          return { ro: r, vpe: valorPorEsforco(r.grau, r.esforco), quadrant: q };
        })
        .sort((a, b) => (b.vpe ?? -1) - (a.vpe ?? -1)),
    [avaliaveis, impactThreshold, effort],
  );

  const impactoMedio = avaliaveis.length
    ? avaliaveis.reduce((a, r) => a + (r.impacto_nivel || 0), 0) / avaliaveis.length
    : null;
  const esforcoTotal = ros.reduce((a, r) => a + (r.esforco || 0), 0);
  const esforcoPrioritarios = ros.filter((r) => r.prioritario).reduce((a, r) => a + (r.esforco || 0), 0);
  const altoImpacto = avaliaveis.filter((r) => (r.impacto_nivel || 0) >= impactThreshold).length;
  const count = (k: string) => rows.filter((x) => x.quadrant === k).length;

  if (!ros.length) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          Sem dados importados. Use “Importar Status Report”.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        <KpiCard label="ROs avaliáveis" value={avaliaveis.length} hint="Com impacto e esforço informados" tone="primary" />
        <KpiCard label="Prioritárias" value={ros.filter((r) => r.prioritario).length} tone="danger" />
        <KpiCard label="Impacto médio" value={impactoMedio !== null ? impactoMedio.toFixed(1) : '—'} />
        <KpiCard label="Esforço total" value={esforcoTotal.toLocaleString('pt-BR')} />
        <KpiCard label="Esforço dos prioritários" value={esforcoPrioritarios.toLocaleString('pt-BR')} />
        <KpiCard label="Alto impacto" value={altoImpacto} />
        <KpiCard label="Alto impacto + baixo esforço" value={count('fazer-primeiro')} tone="success" />
        <KpiCard label="Baixo impacto + alto esforço" value={count('questionar')} tone="warning" />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-3">
          <div>
            <Label className="text-xs">Limite de alto impacto (escala 1–5)</Label>
            <Input
              type="number"
              min={1}
              max={5}
              className="mt-1 w-28"
              value={impactThreshold}
              onChange={(e) => setImpactThreshold(Number(e.target.value) || DEFAULT_IMPACT_THRESHOLD)}
            />
          </div>
          <div>
            <Label className="text-xs">Limite de alto esforço</Label>
            <Input
              type="number"
              className="mt-1 w-32"
              value={effort}
              onChange={(e) => setEffortThreshold(Number(e.target.value))}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Padrão do esforço = mediana dos esforços válidos da carga ({defaultEffortThreshold}). Ambos os limites são
            parâmetros configuráveis, não vêm do arquivo.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Matriz Impacto × Esforço</h3>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {Object.entries(QUADRANTS).map(([k, q]) => (
                <Badge key={k} variant="outline" className="font-normal">
                  {q.label}: {count(k)}
                </Badge>
              ))}
            </div>
          </div>
          {avaliaveis.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Nenhum RO possui impacto e esforço suficientes para a matriz.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={420}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  dataKey="esforco"
                  name="Esforço"
                  tick={{ fill: '#000', fontSize: 11 }}
                  label={{ value: 'ESFORÇO', position: 'insideBottom', offset: -15, fill: '#000', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="impacto"
                  name="Impacto"
                  domain={[0, 5]}
                  tick={{ fill: '#000', fontSize: 11 }}
                  label={{ value: 'IMPACTO', angle: -90, position: 'insideLeft', fill: '#000', fontSize: 11 }}
                />
                <ReferenceLine x={effort} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                <ReferenceLine y={impactThreshold} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                <RTooltip
                  content={({ payload }) => {
                    const p: any = payload?.[0]?.payload;
                    if (!p) return null;
                    return (
                      <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-md">
                        <p className="font-semibold">#{p.ro.numero} {p.ro.titulo}</p>
                        <p className="text-muted-foreground">{p.ro.epico_nome ?? '—'}</p>
                        <p>Status: {getRoStatusDef(p.ro.status_key).label}</p>
                        <p>Impacto: {cleanScaleLabel(p.ro.impacto)} · Urgência: {cleanScaleLabel(p.ro.urgencia)}</p>
                        <p>Grau: {p.ro.grau ?? '—'} · Esforço: {p.ro.esforco}</p>
                        <p>Prioridade: {p.ro.prioridade ?? '—'}</p>
                      </div>
                    );
                  }}
                />
                <Scatter
                  data={rows.map((x) => ({ esforco: x.ro.esforco, impacto: x.ro.impacto_nivel, ro: x.ro }))}
                  fill="hsl(var(--primary))"
                  onClick={(p: any) => p?.ro && onSelectRo(p.ro)}
                  cursor="pointer"
                />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4 pb-2">
            <h3 className="text-sm font-semibold">Ranking de priorização</h3>
            <span className="text-[11px] text-muted-foreground">{VALOR_POR_ESFORCO_TOOLTIP}</span>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>RO</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Épico</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Impacto</TableHead>
                  <TableHead>Urgência</TableHead>
                  <TableHead className="text-right">Grau</TableHead>
                  <TableHead className="text-right">Esforço</TableHead>
                  <TableHead className="text-right">Valor/Esforço</TableHead>
                  <TableHead>Classificação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ ro, vpe, quadrant }) => (
                  <TableRow key={ro.id} className="cursor-pointer" onClick={() => onSelectRo(ro)}>
                    <TableCell className="font-medium">#{ro.numero}</TableCell>
                    <TableCell className="max-w-[280px] truncate">{ro.titulo}</TableCell>
                    <TableCell className="max-w-[160px] truncate text-muted-foreground">{ro.epico_nome ?? '—'}</TableCell>
                    <TableCell className="text-xs">{getRoStatusDef(ro.status_key).label}</TableCell>
                    <TableCell className="text-xs">{ro.prioridade ?? '—'}</TableCell>
                    <TableCell className="text-xs">{cleanScaleLabel(ro.impacto)}</TableCell>
                    <TableCell className="text-xs">{cleanScaleLabel(ro.urgencia)}</TableCell>
                    <TableCell className="text-right tabular-nums">{ro.grau ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{ro.esforco ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{vpe !== null ? vpe.toFixed(2) : '—'}</TableCell>
                    <TableCell>
                      {quadrant ? <Badge variant="outline" className="font-normal">{QUADRANTS[quadrant].label}</Badge> : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
