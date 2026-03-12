import MainLayout from '@/components/layout/MainLayout';
import { ExternalLink } from 'lucide-react';

const systems = [
  {
    name: 'Sydle',
    description: 'Sistema de gestão de processos e workflows',
    url: 'https://sydle.tjce.jus.br/login/',
    color: 'from-blue-600 to-blue-800',
  },
  {
    name: 'SEI',
    description: 'Sistema Eletrônico de Informações',
    url: 'https://sei-adm.tjce.jus.br/sip/login.php?sigla_orgao_sistema=TJCE&sigla_sistema=SEI&infra_url=L3NlaS8=',
    color: 'from-emerald-600 to-emerald-800',
  },
];

export default function Consultoria() {
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Sydle / SEI</h1>
        <p className="text-muted-foreground mt-1">Acesso rápido aos sistemas externos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        {systems.map((system) => (
          <a
            key={system.name}
            href={system.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative rounded-xl border border-border bg-card p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
          >
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${system.color} flex items-center justify-center mb-4`}>
              <span className="text-white font-bold text-lg">{system.name.charAt(0)}</span>
            </div>
            <h2 className="text-xl font-semibold text-card-foreground mb-1">{system.name}</h2>
            <p className="text-sm text-muted-foreground mb-4">{system.description}</p>
            <div className="flex items-center gap-2 text-sm font-medium text-primary group-hover:underline">
              Acessar <ExternalLink className="h-4 w-4" />
            </div>
          </a>
        ))}
      </div>
    </MainLayout>
  );
}
