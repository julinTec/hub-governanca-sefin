
-- Drop the generated column and recreate as regular numeric
ALTER TABLE public.okr_key_results DROP COLUMN percentual;
ALTER TABLE public.okr_key_results ADD COLUMN percentual numeric DEFAULT 0;

-- Create function to recalculate KR percentual from actions
CREATE OR REPLACE FUNCTION public.update_kr_percentual()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_acoes integer;
  concluidas integer;
  kr_id uuid;
BEGIN
  -- Get the relevant key_result_id
  IF TG_OP = 'DELETE' THEN
    kr_id := OLD.key_result_id;
  ELSE
    kr_id := NEW.key_result_id;
  END IF;

  -- Count total and completed actions
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'Concluído')
  INTO total_acoes, concluidas
  FROM public.okr_acoes
  WHERE key_result_id = kr_id;

  -- Update percentual
  UPDATE public.okr_key_results
  SET percentual = CASE WHEN total_acoes > 0 THEN round((concluidas::numeric / total_acoes::numeric) * 100, 2) ELSE 0 END
  WHERE id = kr_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on okr_acoes
CREATE TRIGGER update_kr_percentual_on_acao_change
  AFTER INSERT OR UPDATE OR DELETE ON public.okr_acoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_kr_percentual();
