import { Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import {
  Target, Workflow, FileText, BarChart3, Calendar,
  Users, Handshake, MessageSquare, FolderOpen, Brain
} from 'lucide-react';

const modules = [
  {
    name: 'OKRs',
    description: 'Objetivos e Resultados-Chave',
    path: '/okrs',
    icon: Target,
    color: 'from-blue-600 to-blue-700',
  },
  {
    name: 'Processos',
    description: 'Gestão de Processos',
    path: '/processos',
    icon: Workflow,
    color: 'from-cyan-600 to-cyan-700',
  },
  {
    name: 'Contratos',
    description: 'Contratos e Atestos',
    path: '/contratos',
    icon: FileText,
    color: 'from-purple-600 to-purple-700',
  },
  {
    name: 'Indicadores',
    description: 'Indicadores de Desempenho',
    path: '/indicadores',
    icon: BarChart3,
    color: 'from-teal-600 to-teal-700',
  },
  {
    name: 'Agenda',
    description: 'Atividades e Compromissos',
    path: '/agenda',
    icon: Calendar,
    color: 'from-amber-500 to-amber-600',
  },
  {
    name: 'Pessoas',
    description: 'Gestão de Pessoas',
    path: '/pessoas',
    icon: Users,
    color: 'from-pink-600 to-pink-700',
  },
  {
    name: 'Sydle / SEI',
    description: 'Acesso aos Sistemas',
    path: '/consultoria',
    icon: Handshake,
    color: 'from-violet-600 to-violet-700',
  },
  {
    name: 'Reuniões',
    description: 'Atas e Decisões',
    path: '/reunioes',
    icon: MessageSquare,
    color: 'from-sky-600 to-sky-700',
  },
  {
    name: 'Documentos',
    description: 'Repositório de Documentos',
    path: '/documentos',
    icon: FolderOpen,
    color: 'from-orange-500 to-orange-600',
  },
  {
    name: 'Decisões',
    description: 'Registro de Decisões',
    path: '/decisoes',
    icon: Brain,
    color: 'from-emerald-600 to-emerald-700',
  },
];

export default function Dashboard() {
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Hub de Governança SEFIN
          </h1>
          <p className="text-muted-foreground mt-1">
            Sistema Central de Governança Institucional
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
          {modules.map((module) => (
            <Link key={module.path} to={module.path}>
              <Card className="h-full hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border-0 overflow-hidden group">
                <CardContent className="p-0">
                  <div className={`bg-gradient-to-br ${module.color} p-6 flex items-center justify-center`}>
                    <module.icon className="h-10 w-10 lg:h-12 lg:w-12 text-white" />
                  </div>
                  <div className="p-4 text-center bg-card">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {module.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                      {module.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
