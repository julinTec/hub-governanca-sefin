CREATE TABLE public.previsao_serie_historica (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL UNIQUE,
  tipo_judicial numeric,
  tipo_extra_judicial numeric,
  tipo_rendimento numeric,
  arrecadado numeric,
  casos_baixados integer,
  casos_novos integer,
  casos_julgados integer,
  magistrados integer,
  servidores integer,
  desembargadores integer,
  terceirizados integer,
  inpc numeric,
  ipca numeric,
  igpm numeric,
  selic numeric,
  desemprego numeric,
  ibcr_ce numeric,
  pib numeric,
  imoveis_registros numeric,
  qtde_atos numeric,
  valor_documento_atos numeric,
  valor_emolumento_atos numeric,
  valor_fermoju_atos numeric,
  valor_selo_atos numeric,
  disponibilidade_fermoju numeric,
  precatorio numeric,
  saldos numeric,
  fonte text NOT NULL DEFAULT 'manual',
  observacoes text,
  criado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.previsao_serie_historica TO authenticated;
GRANT ALL ON public.previsao_serie_historica TO service_role;

ALTER TABLE public.previsao_serie_historica ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view previsao_serie_historica"
  ON public.previsao_serie_historica FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert previsao_serie_historica"
  ON public.previsao_serie_historica FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update previsao_serie_historica"
  ON public.previsao_serie_historica FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_previsao_serie_historica_updated_at
  BEFORE UPDATE ON public.previsao_serie_historica
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.previsao_variaveis_futuras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variavel text NOT NULL,
  data date NOT NULL,
  valor numeric NOT NULL,
  origem text NOT NULL DEFAULT 'manual',
  observacoes text,
  criado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (variavel, data, origem)
);

GRANT SELECT, INSERT, UPDATE ON public.previsao_variaveis_futuras TO authenticated;
GRANT ALL ON public.previsao_variaveis_futuras TO service_role;

ALTER TABLE public.previsao_variaveis_futuras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view previsao_variaveis_futuras"
  ON public.previsao_variaveis_futuras FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert previsao_variaveis_futuras"
  ON public.previsao_variaveis_futuras FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = criado_por);

CREATE POLICY "Authenticated users can update own previsao_variaveis_futuras"
  ON public.previsao_variaveis_futuras FOR UPDATE TO authenticated
  USING (auth.uid() = criado_por);

CREATE TABLE public.previsao_execucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alvo text NOT NULL,
  variaveis_exogenas text[] NOT NULL DEFAULT '{}',
  meses_teste integer NOT NULL DEFAULT 6,
  horizonte_meses integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pendente',
  mape numeric,
  previsao jsonb,
  real_periodo_teste jsonb,
  github_run_id text,
  erro text,
  solicitado_por uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  concluido_em timestamptz
);

GRANT SELECT, INSERT ON public.previsao_execucoes TO authenticated;
GRANT ALL ON public.previsao_execucoes TO service_role;

ALTER TABLE public.previsao_execucoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view previsao_execucoes"
  ON public.previsao_execucoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert previsao_execucoes"
  ON public.previsao_execucoes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = solicitado_por);