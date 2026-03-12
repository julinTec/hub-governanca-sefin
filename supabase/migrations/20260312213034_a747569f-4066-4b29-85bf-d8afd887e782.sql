
ALTER TABLE public.okr_key_results DROP COLUMN status;
ALTER TABLE public.okr_key_results ADD COLUMN status text DEFAULT 'Em andamento';
