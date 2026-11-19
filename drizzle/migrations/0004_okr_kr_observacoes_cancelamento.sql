-- KRs: Observacoes e Cancelamento (19/11/2026)
--
-- Observacoes: texto livre dentro de cada KR.
-- Cancelamento: em vez de excluir um KR que deixou de valer, o KR fica com
-- status 'Cancelado' e guarda quando, quem e por que foi cancelado - o
-- registro continua no Hub (esmaecido) e sai dos indicadores do Dashboard.
-- status_anterior guarda o status de antes, pra "Reativar" voltar a ele.

ALTER TABLE public.okr_key_results
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS cancelado_em timestamptz,
  ADD COLUMN IF NOT EXISTS cancelado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancelado_por_nome text,
  ADD COLUMN IF NOT EXISTS motivo_cancelamento text,
  ADD COLUMN IF NOT EXISTS status_anterior text;