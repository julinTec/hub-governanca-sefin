import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { BarChart3, AppWindow, FileSpreadsheet, ExternalLink, Lock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const systems = [
  {
    name: 'Painel Arquitetura de Processos',
    description: 'Dashboard Power BI com visão geral dos processos',
    url: 'https://app.powerbi.com/view?r=eyJrIjoiODg5NTJiNGUtNTRhOC00NWIwLWI3MDctMmIyODQ4OWU0NTY1IiwidCI6IjA4ZmIyNmFjLWJkMWQtNGQyMC1iMzIwLWE4NmEwYTM1Y2UzMCJ9',
    domain: 'app.powerbi.com',
    gradient: 'from-yellow-500 to-indigo-600',
    accentBg: 'bg-yellow-50 dark:bg-yellow-950/30',
    accentText: 'text-yellow-700 dark:text-yellow-300',
    dotColor: 'bg-yellow-300 dark:bg-yellow-700',
    lineColor: 'bg-yellow-200 dark:bg-yellow-800',
    icon: BarChart3,
    internal: true,
  },
  {
    name: 'Gestão de Processos',
    description: 'Aplicação PowerApps para gestão operacional',
    url: 'https://apps.powerapps.com/play/e/default-08fb26ac-bd1d-4d20-b320-a86a0a35ce30/a/aeffbf9c-9bfa-4c6b-81a2-d2582328dfb6?tenantId=08fb26ac-bd1d-4d20-b320-a86a0a35ce30&hint=87cd046f-c2dd-4022-84c3-8e9e1db875a7&sourcetime=1773345212238&skipMobileRedirect=1#',
    domain: 'apps.powerapps.com',
    gradient: 'from-emerald-500 to-teal-700',
    accentBg: 'bg-emerald-50 dark:bg-emerald-950/30',
    accentText: 'text-emerald-700 dark:text-emerald-300',
    dotColor: 'bg-emerald-300 dark:bg-emerald-700',
    lineColor: 'bg-emerald-200 dark:bg-emerald-800',
    icon: AppWindow,
    internal: false,
  },
  {
    name: 'Arquitetura de Processos v 5.0',
    description: 'Planilha SharePoint com mapeamento completo',
    url: 'https://tjce365.sharepoint.com/:x:/s/NcleodeGovernanaeControleInternodaSEFIN/IQBZ4cvNpyGMQJyD0upAsmzKAerPylB56-IhyblJSL7lTUY?e=dBs0uA',
    domain: 'tjce365.sharepoint.com',
    gradient: 'from-amber-500 to-orange-700',
    accentBg: 'bg-amber-50 dark:bg-amber-950/30',
    accentText: 'text-amber-700 dark:text-amber-300',
    dotColor: 'bg-amber-300 dark:bg-amber-700',
    lineColor: 'bg-amber-200 dark:bg-amber-800',
    icon: FileSpreadsheet,
    internal: false,
  },
];

export default function Processos() {
  const [iframeOpen, setIframeOpen] = useState(false);

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Processos</h1>
        <p className="text-muted-foreground mt-1">Gestão e Arquitetura de Processos Organizacionais</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
        {systems.map((system) => {
          const Icon = system.icon;
          const isInternal = system.internal;

          const handleClick = () => {
            if (isInternal) {
              setIframeOpen((prev) => !prev);
            }
          };

          const Wrapper = isInternal ? 'button' : 'a';
          const wrapperProps = isInternal
            ? { onClick: handleClick, type: 'button' as const }
            : { href: system.url, target: '_blank', rel: 'noopener noreferrer' };

          return (
            <Wrapper
              key={system.name}
              {...(wrapperProps as any)}
              className="group block rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left w-full"
            >
              {/* Browser chrome bar */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/60 border-b border-border">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="w-3 h-3 rounded-full bg-yellow-400" />
                  <span className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 flex items-center gap-1.5 ml-2 px-3 py-1 rounded-md bg-background text-xs text-muted-foreground font-mono truncate">
                  <Lock className="h-3 w-3 shrink-0 text-green-600" />
                  {system.domain}
                </div>
              </div>

              {/* Header gradient */}
              <div className={`bg-gradient-to-r ${system.gradient} px-6 py-5`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{system.name}</h2>
                    <p className="text-xs text-white/70">{system.description}</p>
                  </div>
                </div>
              </div>

              {/* Fake UI preview */}
              <div className={`px-6 py-6 ${system.accentBg}`}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${system.dotColor}`} />
                    <div className={`h-3 rounded-full ${system.lineColor} w-20`} />
                  </div>
                  <div className="h-9 rounded-md border border-border/50 bg-background/80" />
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${system.dotColor}`} />
                    <div className={`h-3 rounded-full ${system.lineColor} w-14`} />
                  </div>
                  <div className="h-9 rounded-md border border-border/50 bg-background/80" />
                  <div className={`h-9 rounded-md bg-gradient-to-r ${system.gradient} opacity-70 mt-1`} />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                <span className={`text-sm font-medium ${system.accentText}`}>
                  {isInternal ? (iframeOpen ? 'Fechar Painel' : 'Abrir Painel') : `Acessar`}
                </span>
                <ExternalLink className={`h-4 w-4 ${system.accentText} group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform`} />
              </div>
            </Wrapper>
          );
        })}
      </div>

      {/* Iframe Power BI */}
      {iframeOpen && (
        <div className="mt-8 rounded-xl border border-border bg-card overflow-hidden shadow-lg">
          <div className="flex items-center justify-between px-4 py-3 bg-muted/60 border-b border-border">
            <span className="text-sm font-medium text-foreground">Painel Arquitetura de Processos</span>
            <Button variant="ghost" size="icon" onClick={() => setIframeOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <iframe
            src={systems[0].url}
            className="w-full border-0"
            style={{ height: '80vh' }}
            allowFullScreen
            title="Painel Arquitetura de Processos"
          />
        </div>
      )}
    </MainLayout>
  );
}
