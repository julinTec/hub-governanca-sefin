-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  cargo TEXT,
  area TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- OKRs Module
CREATE TABLE public.okr_objetivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  objetivo TEXT NOT NULL,
  ciclo TEXT NOT NULL,
  responsavel TEXT,
  status TEXT DEFAULT 'Em andamento',
  observacoes TEXT,
  observacao_reuniao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.okr_key_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  objetivo_id UUID NOT NULL REFERENCES public.okr_objetivos(id) ON DELETE CASCADE,
  kr TEXT NOT NULL,
  meta NUMERIC,
  valor_atual NUMERIC DEFAULT 0,
  percentual NUMERIC GENERATED ALWAYS AS (CASE WHEN meta > 0 THEN ROUND((valor_atual / meta) * 100, 2) ELSE 0 END) STORED,
  responsavel TEXT,
  status TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN meta > 0 AND (valor_atual / meta) >= 0.7 THEN 'verde'
      WHEN meta > 0 AND (valor_atual / meta) >= 0.4 THEN 'amarelo'
      ELSE 'vermelho'
    END
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.okr_objetivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_key_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view okr_objetivos" ON public.okr_objetivos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert okr_objetivos" ON public.okr_objetivos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can update okr_objetivos" ON public.okr_objetivos FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete okr_objetivos" ON public.okr_objetivos FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can manage key_results" ON public.okr_key_results FOR ALL USING (auth.uid() IS NOT NULL);

-- Processos Module
CREATE TABLE public.processos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  area TEXT,
  dono_processo TEXT,
  status TEXT DEFAULT 'Ativo',
  ultima_revisao DATE,
  proxima_revisao DATE,
  link_fluxograma TEXT,
  impactado_consultoria BOOLEAN DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view processos" ON public.processos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert processos" ON public.processos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can update processos" ON public.processos FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete processos" ON public.processos FOR DELETE USING (auth.uid() = user_id);

-- Contratos Module
CREATE TABLE public.contratos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  numero_contrato TEXT NOT NULL,
  objeto TEXT,
  empresa TEXT,
  fiscal TEXT,
  status TEXT DEFAULT 'Ativo',
  ultimo_atesto DATE,
  proximo_atesto DATE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contratos" ON public.contratos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert contratos" ON public.contratos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can update contratos" ON public.contratos FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete contratos" ON public.contratos FOR DELETE USING (auth.uid() = user_id);

-- Indicadores Module
CREATE TABLE public.indicadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT DEFAULT 'operacional',
  fonte TEXT,
  responsavel TEXT,
  ultima_atualizacao DATE,
  status TEXT DEFAULT 'Ativo',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.indicadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view indicadores" ON public.indicadores FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert indicadores" ON public.indicadores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can update indicadores" ON public.indicadores FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete indicadores" ON public.indicadores FOR DELETE USING (auth.uid() = user_id);

-- Agenda Module
CREATE TABLE public.agenda (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT DEFAULT 'semanal',
  atividade TEXT NOT NULL,
  data DATE,
  responsavel TEXT,
  status TEXT DEFAULT 'Pendente',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agenda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view agenda" ON public.agenda FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert agenda" ON public.agenda FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can update agenda" ON public.agenda FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete agenda" ON public.agenda FOR DELETE USING (auth.uid() = user_id);

-- Pessoas Module
CREATE TABLE public.pessoas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cargo TEXT,
  area TEXT,
  ultima_validacao_ponto DATE,
  status_plano_trabalho TEXT DEFAULT 'Pendente',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view pessoas" ON public.pessoas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert pessoas" ON public.pessoas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can update pessoas" ON public.pessoas FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete pessoas" ON public.pessoas FOR DELETE USING (auth.uid() = user_id);

-- Consultoria Module
CREATE TABLE public.consultoria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fluxo_analise TEXT NOT NULL,
  documentos_enviados TEXT,
  pendencias TEXT,
  proxima_reuniao DATE,
  observacoes_estrategicas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.consultoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view consultoria" ON public.consultoria FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert consultoria" ON public.consultoria FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can update consultoria" ON public.consultoria FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete consultoria" ON public.consultoria FOR DELETE USING (auth.uid() = user_id);

-- Reuniões Module
CREATE TABLE public.reunioes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE,
  tema TEXT NOT NULL,
  participantes TEXT,
  decisoes TEXT,
  responsaveis TEXT,
  prazo DATE,
  status TEXT DEFAULT 'Pendente',
  ata_gerada TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reunioes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reunioes" ON public.reunioes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert reunioes" ON public.reunioes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can update reunioes" ON public.reunioes FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete reunioes" ON public.reunioes FOR DELETE USING (auth.uid() = user_id);

-- Documentos Module
CREATE TABLE public.documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT,
  area_relacionada TEXT,
  link TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view documentos" ON public.documentos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert documentos" ON public.documentos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can update documentos" ON public.documentos FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete documentos" ON public.documentos FOR DELETE USING (auth.uid() = user_id);

-- Decisões Module
CREATE TABLE public.decisoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE,
  tema TEXT NOT NULL,
  decisao TEXT,
  justificativa TEXT,
  responsavel TEXT,
  impacto TEXT,
  status TEXT DEFAULT 'Implementada',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.decisoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view decisoes" ON public.decisoes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert decisoes" ON public.decisoes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can update decisoes" ON public.decisoes FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete decisoes" ON public.decisoes FOR DELETE USING (auth.uid() = user_id);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_okr_objetivos_updated_at BEFORE UPDATE ON public.okr_objetivos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_processos_updated_at BEFORE UPDATE ON public.processos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contratos_updated_at BEFORE UPDATE ON public.contratos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_indicadores_updated_at BEFORE UPDATE ON public.indicadores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agenda_updated_at BEFORE UPDATE ON public.agenda FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pessoas_updated_at BEFORE UPDATE ON public.pessoas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_consultoria_updated_at BEFORE UPDATE ON public.consultoria FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reunioes_updated_at BEFORE UPDATE ON public.reunioes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documentos_updated_at BEFORE UPDATE ON public.documentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_decisoes_updated_at BEFORE UPDATE ON public.decisoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();