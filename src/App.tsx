import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
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
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />} />
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/okrs" element={<ProtectedRoute><OKRs /></ProtectedRoute>} />
      <Route path="/processos" element={<ProtectedRoute><Processos /></ProtectedRoute>} />
      <Route path="/contratos" element={<ProtectedRoute><Contratos /></ProtectedRoute>} />
      <Route path="/indicadores" element={<ProtectedRoute><Indicadores /></ProtectedRoute>} />
      <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
      <Route path="/pessoas" element={<ProtectedRoute><Pessoas /></ProtectedRoute>} />
      <Route path="/consultoria" element={<ProtectedRoute><Consultoria /></ProtectedRoute>} />
      <Route path="/reunioes" element={<ProtectedRoute><Reunioes /></ProtectedRoute>} />
      <Route path="/documentos" element={<ProtectedRoute><Documentos /></ProtectedRoute>} />
      <Route path="/decisoes" element={<ProtectedRoute><Decisoes /></ProtectedRoute>} />
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
