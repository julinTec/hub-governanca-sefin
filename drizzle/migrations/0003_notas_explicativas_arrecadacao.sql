-- Notas Explicativas da Arrecadacao (18/11/2026)
--
-- Coordenadores registram, por periodo, os fatos que explicam a arrecadacao
-- de um mes (ex.: "alta da Selic elevou os rendimentos", "concurso de jun/26
-- aumentou o Extra Judicial"). As notas aparecem nos graficos e na tabela da
-- Previsao de Arrecadacao (Hub e link publico) e numa aba propria.
--
-- Quem grava:
--   - no Hub: qualquer usuario autenticado cria; so admin edita/exclui;
--   - fora do Hub: pelo "link de colaboracao" (tabela public_collab_link),
--     validado na Edge Function hub-publico-api (service role). Pelo link so
--     e possivel CRIAR nota - corrigir/excluir fica com o admin no Hub.

CREATE TABLE public.notas_arrecadacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_inicio date NOT NULL,
  periodo_fim date,
  categoria text NOT NULL DEFAULT 'Geral',
  efeito text NOT NULL,
  natureza text NOT NULL,
  impacto_estimado numeric,
  titulo text NOT NULL,
  descricao text NOT NULL,
  autor_nome text NOT NULL,
  autor_coordenadoria text NOT NULL,
  origem text NOT NULL DEFAULT 'hub',
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notas_arrecadacao_categoria CHECK (categoria IN ('Geral', 'Judicial', 'Extra Judicial', 'Rendimento')),
  CONSTRAINT notas_arrecadacao_efeito CHECK (efeito IN ('aumento', 'reducao', 'neutro')),
  CONSTRAINT notas_arrecadacao_natureza CHECK (natureza IN ('pontual', 'recorrente')),
  CONSTRAINT notas_arrecadacao_origem CHECK (origem IN ('hub', 'link_colaboracao')),
  CONSTRAINT notas_arrecadacao_periodo CHECK (periodo_fim IS NULL OR periodo_fim >= periodo_inicio),
  CONSTRAINT notas_arrecadacao_mes_inicio CHECK (extract(day FROM periodo_inicio) = 1),
  CONSTRAINT notas_arrecadacao_tamanhos CHECK (
    char_length(titulo) BETWEEN 3 AND 140
    AND char_length(descricao) BETWEEN 3 AND 4000
    AND char_length(autor_nome) BETWEEN 2 AND 120
    AND char_length(autor_coordenadoria) BETWEEN 2 AND 160
  )
);

CREATE INDEX notas_arrecadacao_periodo_idx ON public.notas_arrecadacao (periodo_inicio);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas_arrecadacao TO authenticated;
GRANT ALL ON public.notas_arrecadacao TO service_role;

ALTER TABLE public.notas_arrecadacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem as notas explicativas"
  ON public.notas_arrecadacao FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Autenticados registram notas explicativas"
  ON public.notas_arrecadacao FOR INSERT TO authenticated
  WITH CHECK (origem = 'hub' AND criado_por = auth.uid());

CREATE POLICY "Admins editam notas explicativas"
  ON public.notas_arrecadacao FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins excluem notas explicativas"
  ON public.notas_arrecadacao FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Link de colaboracao: mesmo formato do public_share_link (linha unica,
-- controlada pelo admin), mas separado - da leitura + registro de notas.
-- Desativar/rotacionar um nao afeta o outro.
CREATE TABLE public.public_collab_link (
  id boolean PRIMARY KEY DEFAULT true,
  token text NOT NULL,
  ativo boolean NOT NULL DEFAULT false,
  criado_por uuid REFERENCES auth.users(id),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_collab_link_singleton CHECK (id)
);

GRANT SELECT, INSERT, UPDATE ON public.public_collab_link TO authenticated;
GRANT ALL ON public.public_collab_link TO service_role;

ALTER TABLE public.public_collab_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver o link de colaboracao"
  ON public.public_collab_link FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem criar o link de colaboracao"
  ON public.public_collab_link FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar o link de colaboracao"
  ON public.public_collab_link FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));