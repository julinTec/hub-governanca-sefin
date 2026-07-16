import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, Loader2 } from 'lucide-react';
import sefinLogo from '@/assets/sefin-logo.png.asset.json';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();

  // Preserve /?next=... same-origin redirect (used by OAuth consent).
  const rawNext = params.get('next');
  const nextPath = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard';

  useEffect(() => {
    if (!loading && user) {
      window.location.href = nextPath;
    }
  }, [user, loading, nextPath]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Erro', description: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      let description = error.message;
      if (msg === 'invalid login credentials') {
        description = 'Email ou senha incorretos';
      } else if (msg.includes('timeout')) {
        description = 'O servidor demorou para responder. Verifique sua conexão e tente novamente.';
      } else if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch')) {
        description = 'Não foi possível conectar ao servidor. Verifique sua rede ou firewall corporativo.';
      }
      toast({ title: 'Erro ao entrar', description, variant: 'destructive' });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Erro', description: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Erro', description: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const { error } = await signUp(email, password);
    setIsLoading(false);
    if (error) {
      if (error.message.includes('already registered')) {
        toast({ title: 'Erro', description: 'Este email já está cadastrado', variant: 'destructive' });
      } else {
        toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: 'Sucesso', description: 'Conta criada com sucesso! Você já pode fazer login.' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto w-24 h-24 flex items-center justify-center mb-4">
            <img src={sefinLogo.url} alt="TJCE - Secretaria de Finanças" className="max-w-full max-h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Hub de Governança</h1>
          <p className="text-muted-foreground mt-2">SEFIN - Sistema de Gestão Integrada</p>
        </div>

        <Card className="shadow-xl border-0">
          <form onSubmit={handleSignIn}>
            <CardHeader className="pb-4">
              <CardTitle className="text-center text-lg">Entrar</CardTitle>
              <CardDescription className="text-center">
                Acesse o sistema com suas credenciais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-login">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email-login"
                    type="email"
                    placeholder="seu@email.gov.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-login">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password-login"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Entrar
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Sistema de Governança Institucional da SEFIN
        </p>
      </div>
    </div>
  );
}
