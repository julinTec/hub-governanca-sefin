-- Restituicao de excedentes ao teto + outras restituicoes (receita 63320,
-- Fermoju / Extra Judicial). A partir de 13/11/2026 ela passa a entrar no
-- realizado: tipo_extra_judicial (e arrecadado) INCLUEM a restituicao, e esta
-- coluna guarda so a parte da restituicao, pra tela Real x Previsto poder
-- comparar sem ela (o motor de previsao foi treinado sem a restituicao).
ALTER TABLE public.previsao_serie_historica
  ADD COLUMN IF NOT EXISTS extra_judicial_restituicao numeric;
