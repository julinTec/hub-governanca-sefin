import { useCallback, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, History, UploadCloud, LayoutList, Columns3, Crosshair, CalendarDays, Clock } from 'lucide-react';
import { useStatusReport, type SrRo } from '@/hooks/useStatusReport';
import ImportStatusReportDialog from '@/components/statusreport/ImportStatusReportDialog';
import ImportHistoryDialog from '@/components/statusreport/ImportHistoryDialog';
import OsControlTab, { OS_TAB_INITIAL, type OsTabState } from '@/components/statusreport/OsControlTab';
import RoControlTab, { RO_TAB_INITIAL, type RoTabState } from '@/components/statusreport/RoControlTab';
import PriorizacaoTab, { PRIO_TAB_INITIAL, type PrioTabState } from '@/components/statusreport/PriorizacaoTab';
import RoDetailDrawer from '@/components/statusreport/RoDetailDrawer';

export default function StatusReport() {
  const { loading, ros, oss, epics, imports, latestImport, prevStatusCounts, refresh } = useStatusReport();
  const [importOpen, setImportOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedRo, setSelectedRo] = useState<SrRo | null>(null);

  // estado de filtros preservado por aba durante a sessão na tela
  const [osState, setOsState] = useState<OsTabState>(OS_TAB_INITIAL);
  const [roState, setRoState] = useState<RoTabState>(RO_TAB_INITIAL);
  const [prioState, setPrioState] = useState<PrioTabState>(PRIO_TAB_INITIAL);

  const patchOs = useCallback((p: Partial<OsTabState>) => setOsState((s) => ({ ...s, ...p })), []);
  const patchRo = useCallback((p: Partial<RoTabState>) => setRoState((s) => ({ ...s, ...p })), []);
  const patchPrio = useCallback((p: Partial<PrioTabState>) => setPrioState((s) => ({ ...s, ...p })), []);

  const dataRelatorio = latestImport?.source_generated_at
    ? new Date(latestImport.source_generated_at).toLocaleDateString('pt-BR')
    : null;
  const dataImport = latestImport ? new Date(latestImport.imported_at).toLocaleString('pt-BR') : null;

  return (
    <MainLayout>
      <div className="mx-auto max-w-[1800px] space-y-4">
        <Card className="border-border/70 bg-gradient-to-r from-primary/[0.06] to-transparent">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Status Report</h1>
              <p className="text-sm text-muted-foreground">Governança de OSs e ROs</p>
              {latestImport && (
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-help items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5 font-medium">
                        <CalendarDays className="h-3.5 w-3.5 text-primary" />
                        Última atualização dos dados: {dataRelatorio ?? '—'}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      Data de geração do Status Report na origem (não é a data da importação).
                    </TooltipContent>
                  </Tooltip>
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> Importado em {dataImport}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setHistoryOpen(true)}>
                <History className="mr-2 h-4 w-4" /> Histórico de Importações
              </Button>
              <Button onClick={() => setImportOpen(true)}>
                <UploadCloud className="mr-2 h-4 w-4" /> Importar Status Report
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="os">
            <TabsList className="h-auto flex-wrap gap-1 bg-muted/60 p-1">
              <TabsTrigger value="os" className="gap-2 data-[state=active]:shadow-sm">
                <LayoutList className="h-4 w-4" /> 01 Controle de OSs
                <span className="rounded bg-background/70 px-1.5 text-[10px] tabular-nums">{oss.length}</span>
              </TabsTrigger>
              <TabsTrigger value="ro" className="gap-2 data-[state=active]:shadow-sm">
                <Columns3 className="h-4 w-4" /> 02 Controle de ROs
                <span className="rounded bg-background/70 px-1.5 text-[10px] tabular-nums">{ros.length}</span>
              </TabsTrigger>
              <TabsTrigger value="prio" className="gap-2 data-[state=active]:shadow-sm">
                <Crosshair className="h-4 w-4" /> 03 Priorização
              </TabsTrigger>
            </TabsList>

            <TabsContent value="os" className="mt-4">
              <OsControlTab
                oss={oss}
                ros={ros}
                epics={epics}
                state={osState}
                setState={patchOs}
                onSelectRo={setSelectedRo}
              />
            </TabsContent>
            <TabsContent value="ro" className="mt-4">
              <RoControlTab
                ros={ros}
                prevStatusCounts={prevStatusCounts}
                state={roState}
                setState={patchRo}
                onSelectRo={setSelectedRo}
              />
            </TabsContent>
            <TabsContent value="prio" className="mt-4">
              <PriorizacaoTab ros={ros} state={prioState} setState={patchPrio} onSelectRo={setSelectedRo} />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <ImportStatusReportDialog open={importOpen} onOpenChange={setImportOpen} onImported={() => refresh(false)} />
      <ImportHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} imports={imports} />
      <RoDetailDrawer ro={selectedRo} oss={oss} epics={epics} onClose={() => setSelectedRo(null)} />
    </MainLayout>
  );
}
