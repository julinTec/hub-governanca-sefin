import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Shield, Target, Workflow, FileText, BarChart3, Calendar,
  Users, Handshake, MessageSquare, FolderOpen, Brain,
  LogOut, Menu, X, Home, ChevronRight
} from 'lucide-react';

const modules = [
  { name: 'OKRs', path: '/okrs', icon: Target, color: 'bg-module-okr' },
  { name: 'Processos', path: '/processos', icon: Workflow, color: 'bg-module-processos' },
  { name: 'Contratos', path: '/contratos', icon: FileText, color: 'bg-module-contratos' },
  { name: 'Indicadores', path: '/indicadores', icon: BarChart3, color: 'bg-module-indicadores' },
  { name: 'Agenda', path: '/agenda', icon: Calendar, color: 'bg-module-agenda' },
  { name: 'Pessoas', path: '/pessoas', icon: Users, color: 'bg-module-pessoas' },
  { name: 'Consultoria', path: '/consultoria', icon: Handshake, color: 'bg-module-consultoria' },
  { name: 'Reuniões', path: '/reunioes', icon: MessageSquare, color: 'bg-module-reunioes' },
  { name: 'Documentos', path: '/documentos', icon: FolderOpen, color: 'bg-module-documentos' },
  { name: 'Decisões', path: '/decisoes', icon: Brain, color: 'bg-module-decisoes' },
];

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, isAdmin } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const currentModule = modules.find(m => location.pathname.startsWith(m.path));
  const breadcrumbs = [
    { name: 'Home', path: '/dashboard' },
    ...(currentModule ? [{ name: currentModule.name, path: currentModule.path }] : []),
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-200 lg:translate-x-0 lg:static",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-sidebar-border">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sidebar-primary rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-sidebar-foreground">Hub SEFIN</h1>
                <p className="text-xs text-sidebar-foreground/60">Governança</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            <Link
              to="/dashboard"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                location.pathname === '/dashboard'
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Home className="h-4 w-4" />
              Dashboard
            </Link>

            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
                Módulos
              </p>
            </div>

            {modules.map((module) => (
              <Link
                key={module.path}
                to={module.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  location.pathname.startsWith(module.path)
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <module.icon className="h-4 w-4" />
                {module.name}
              </Link>
            ))}

            {isAdmin && (
              <>
                <div className="pt-4 pb-2">
                  <p className="px-3 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
                    Administração
                  </p>
                </div>
                <Link
                  to="/usuarios"
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    location.pathname.startsWith('/usuarios')
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <Shield className="h-4 w-4" />
                  Usuários
                </Link>
              </>
            )}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
                <span className="text-xs font-medium text-sidebar-foreground">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              <nav className="flex items-center text-sm">
                {breadcrumbs.map((crumb, index) => (
                  <div key={crumb.path} className="flex items-center">
                    {index > 0 && <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />}
                    <Link
                      to={crumb.path}
                      className={cn(
                        "hover:text-primary transition-colors",
                        index === breadcrumbs.length - 1
                          ? "text-foreground font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {crumb.name}
                    </Link>
                  </div>
                ))}
              </nav>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
