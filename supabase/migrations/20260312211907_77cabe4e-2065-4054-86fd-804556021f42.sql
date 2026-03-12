ALTER TABLE public.okr_key_results
  ADD COLUMN IF NOT EXISTS codigo text,
  ADD COLUMN IF NOT EXISTS tipo text,
  ADD COLUMN IF NOT EXISTS periodicidade text,
  ADD COLUMN IF NOT EXISTS baseline text,
  ADD COLUMN IF NOT EXISTS fonte_dados text,
  ADD COLUMN IF NOT EXISTS lider text,
  ADD COLUMN IF NOT EXISTS equipe text,
  ADD COLUMN IF NOT EXISTS entregas_esperadas text,
  ADD COLUMN IF NOT EXISTS datas_revisao text;