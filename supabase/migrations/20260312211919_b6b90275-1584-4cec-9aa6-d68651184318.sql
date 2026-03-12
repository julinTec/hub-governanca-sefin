CREATE TABLE public.okr_acoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id uuid NOT NULL REFERENCES public.okr_key_results(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  numero integer,
  acao text NOT NULL,
  responsavel text,
  prazo date,
  status text DEFAULT 'A iniciar',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.okr_acoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view okr_acoes"
  ON public.okr_acoes FOR SELECT TO public
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert okr_acoes"
  ON public.okr_acoes FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update okr_acoes"
  ON public.okr_acoes FOR UPDATE TO public
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete okr_acoes"
  ON public.okr_acoes FOR DELETE TO public
  USING (auth.uid() = user_id);

CREATE TRIGGER update_okr_acoes_updated_at
  BEFORE UPDATE ON public.okr_acoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();