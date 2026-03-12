import MainLayout from '@/components/layout/MainLayout';
import { ExternalLink, Globe, Lock, Shield } from 'lucide-react';

const systems = [
  {
    name: 'Sydle',
    description: 'Sistema de gestão de processos e workflows',
    url: 'https://sydle.tjce.jus.br/login/',
    domain: 'sydle.tjce.jus.br',
    gradient: 'from-blue-600 to-blue-800',
    accentBg: 'bg-blue-50 dark:bg-blue-950/30',
    accentText: 'text-blue-700 dark:text-blue-300',
    dotColor: 'bg-blue-300 dark:bg-blue-700',
    lineColor: 'bg-blue-200 dark:bg-blue-800',
    icon: Shield,
  },
  {
    name: 'SEI',
    description: 'Sistema Eletrônico de Informações',
    url: 'https://sei-adm.tjce.jus.br/sip/login.php?sigla_orgao_sistema=TJCE&sigla_sistema=SEI&infra_url=L3NlaS8=',
    domain: 'sei-adm.tjce.jus.br',
    gradient: 'from-emerald-600 to-emerald-800',
    accentBg: 'bg-emerald-50 dark:bg-emerald-950/30',
    accentText: 'text-emerald-700 dark:text-emerald-300',
    dotColor: 'bg-emerald-300 dark:bg-emerald-700',
    lineColor: 'bg-emerald-200 dark:bg-emerald-800',
    icon: Globe,
  },
];

export default function Consultoria() {
  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Sydle / SEI</h1>
        <p className="text-muted-foreground mt-1">Acesso rápido aos sistemas externos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
        {systems.map((system) => {
          const Icon = system.icon;
          return (
            <a
              key={system.name}
              href={system.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
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
                {/* Simulated form fields */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${system.dotColor}`} />
                    <div className={`h-3 rounded-full ${system.lineColor} w-20`} />
                  </div>
                  <div className={`h-9 rounded-md border border-border/50 bg-background/80`} />
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${system.dotColor}`} />
                    <div className={`h-3 rounded-full ${system.lineColor} w-14`} />
                  </div>
                  <div className={`h-9 rounded-md border border-border/50 bg-background/80`} />
                  <div className={`h-9 rounded-md bg-gradient-to-r ${system.gradient} opacity-70 mt-1`} />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                <span className={`text-sm font-medium ${system.accentText}`}>Acessar {system.name}</span>
                <ExternalLink className={`h-4 w-4 ${system.accentText} group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform`} />
              </div>
            </a>
          );
        })}
      </div>
    </MainLayout>
  );
}
