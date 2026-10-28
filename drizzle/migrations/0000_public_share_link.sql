-- Link publico (somente leitura) para OKRs + Previsao de Arrecadacao, sem
-- precisar de login. Tabela singleton (so pode existir 1 linha, id sempre
-- `true`) controlada pelo admin: gera/rotaciona o token e liga/desliga sem
-- precisar gerar um novo. A validacao do token acontece dentro da Edge
-- Function `hub-publico-api` (service role, bypassa RLS) - esta tabela em si
-- so e legivel/gravavel por admins autenticados, nunca pelo anon/publico.
CREATE TABLE public.public_share_link (
  id boolean PRIMARY KEY DEFAULT true,
  token text NOT NULL,
  ativo boolean NOT NULL DEFAULT false,
  criado_por uuid REFERENCES auth.users(id),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_share_link_singleton CHECK (id)
);

GRANT SELECT, INSERT, UPDATE ON public.public_share_link TO authenticated;
GRANT ALL ON public.public_share_link TO service_role;

ALTER TABLE public.public_share_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver o link publico"
  ON public.public_share_link FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem criar o link publico"
  ON public.public_share_link FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar o link publico"
  ON public.public_share_link FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
