import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, History, UploadCloud } from 'lucide-react';
import { useStatusReport, type SrRo } from '@/hooks/useStatusReport';
import ImportStatusReportDialog from '@/components/statusreport/ImportStatusReportDialog';
import ImportHistoryDialog from '@/components/statusreport/ImportHistoryDialog';
import OsControlTab from '@/components/statusreport/OsControlTab';
import RoControlTab from '@/components/statusreport/RoControlTab';
import PriorizacaoTab from '@/components/statusreport/PriorizacaoTab';
import RoDetailDrawer from '@/components/statusreport/RoDetailDrawer';

export default function StatusReport() {
  const { loading, ros, oss, epics, imports, latestImport, prevStatusCounts, refresh } = useStatusReport();
  const [importOpen, setImportOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedRo, setSelectedRo] = useState<SrRo | null>(null);

  return (
    <MainLayout>
      <div className="mx-auto max-w-[1600px] space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Status Report</h1>
            <p className="text-muted-foreground">
              Governança de OSs e ROs
              {latestImport && (
                <span className="ml-1 text-sm">
                  · última carga: {new Date(latestImport.imported_at).toLocaleString('pt-BR')}
                  {latestImport.source_generated_at &&
                    ` (relatório de ${new Date(latestImport.source_generated_at).toLocaleDateString('pt-BR')})`}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setHistoryOpen(true)}>
              <History className="mr-2 h-4 w-4" /> Histórico de Importações
            </Button>
            <Button onClick={() => setImportOpen(true)}>
              <UploadCloud className="mr-2 h-4 w-4" /> Importar Status Report
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="os">
            <TabsList className="flex-wrap">
              <TabsTrigger value="os">01 Controle de OSs</TabsTrigger>
              <TabsTrigger value="ro">02 Controle de ROs</TabsTrigger>
              <TabsTrigger value="prio">03 Priorização</TabsTrigger>
            </TabsList>

            <TabsContent value="os" className="mt-4">
              <OsControlTab oss={oss} ros={ros} epics={epics} onSelectRo={setSelectedRo} />
            </TabsContent>
            <TabsContent value="ro" className="mt-4">
              <RoControlTab ros={ros} prevStatusCounts={prevStatusCounts} onSelectRo={setSelectedRo} />
            </TabsContent>
            <TabsContent value="prio" className="mt-4">
              <PriorizacaoTab ros={ros} onSelectRo={setSelectedRo} />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <ImportStatusReportDialog open={importOpen} onOpenChange={setImportOpen} onImported={() => refresh(false)} />
      <ImportHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} imports={imports} />
      <RoDetailDrawer ro={selectedRo} onClose={() => setSelectedRo(null)} />
    </MainLayout>
  );
}
