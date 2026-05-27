import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useModuleVisibility } from "@/hooks/useModuleVisibility";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import OKRs from "./pages/OKRs";
import Processos from "./pages/Processos";
import Contratos from "./pages/Contratos";
import Indicadores from "./pages/Indicadores";
import Agenda from "./pages/Agenda";
import Pessoas from "./pages/Pessoas";
import Consultoria from "./pages/Consultoria";
import Reunioes from "./pages/Reunioes";
import Documentos from "./pages/Documentos";
import Decisoes from "./pages/Decisoes";
import Usuarios from "./pages/Usuarios";
import Endpoint from "./pages/Endpoint";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function ModuleRoute({ path, children }: { path: string; children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  const { isVisible, loading } = useModuleVisibility();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isAdmin && !isVisible(path)) return <Navigate to="/dashboard" replace />;
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />} />
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/okrs" element={<ModuleRoute path="/okrs"><OKRs /></ModuleRoute>} />
      <Route path="/processos" element={<ModuleRoute path="/processos"><Processos /></ModuleRoute>} />
      <Route path="/contratos" element={<ModuleRoute path="/contratos"><Contratos /></ModuleRoute>} />
      <Route path="/indicadores" element={<ModuleRoute path="/indicadores"><Indicadores /></ModuleRoute>} />
      <Route path="/agenda" element={<ModuleRoute path="/agenda"><Agenda /></ModuleRoute>} />
      <Route path="/pessoas" element={<ModuleRoute path="/pessoas"><Pessoas /></ModuleRoute>} />
      <Route path="/consultoria" element={<ModuleRoute path="/consultoria"><Consultoria /></ModuleRoute>} />
      <Route path="/reunioes" element={<ModuleRoute path="/reunioes"><Reunioes /></ModuleRoute>} />
      <Route path="/documentos" element={<ModuleRoute path="/documentos"><Documentos /></ModuleRoute>} />
      <Route path="/decisoes" element={<ModuleRoute path="/decisoes"><Decisoes /></ModuleRoute>} />
      <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
      <Route path="/endpoint" element={<ProtectedRoute><Endpoint /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
