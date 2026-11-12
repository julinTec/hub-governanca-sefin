-- Permite que admins excluam execucoes de previsao (botao "Excluir" na lista
-- "Execucoes recentes" da tela Previsao de Arrecadacao). Antes so havia
-- SELECT/INSERT para authenticated e UPDATE via service_role.
GRANT DELETE ON public.previsao_execucoes TO authenticated;

CREATE POLICY "Admins podem excluir previsao_execucoes"
  ON public.previsao_execucoes FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));