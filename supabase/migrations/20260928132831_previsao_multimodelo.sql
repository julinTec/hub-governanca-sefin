-- Adapta previsao_execucoes ao motor multi-modelo (Naive Sazonal, SARIMAX
-- padronizado, Random Forest) rodando as 3 categorias de receita numa unica
-- execucao. Nao existe mais "um alvo por execucao": cada execucao agora
-- sempre calcula as 3 categorias, cada uma com os 3 modelos, e o resultado
-- estruturado inteiro (metricas, coeficientes, importancia de variavel,
-- Diebold-Mariano, cenarios futuros) fica em `resultado` (jsonb).
--
-- Como o modulo ainda nao tinha ido pra producao (nenhuma execucao real
-- gravada ate aqui), e seguro remover as colunas antigas de alvo unico em
-- vez de criar uma tabela nova.

ALTER TABLE public.previsao_execucoes
  DROP COLUMN IF EXISTS alvo,
  DROP COLUMN IF EXISTS variaveis_exogenas,
  DROP COLUMN IF EXISTS mape,
  DROP COLUMN IF EXISTS previsao,
  DROP COLUMN IF EXISTS real_periodo_teste;

ALTER TABLE public.previsao_execucoes
  ADD COLUMN IF NOT EXISTS resultado jsonb,
  ALTER COLUMN meses_teste SET DEFAULT 12,
  ALTER COLUMN horizonte_meses SET DEFAULT 6;

COMMENT ON COLUMN public.previsao_execucoes.resultado IS
  'Saida completa do forecast.py: por categoria (Judicial/Extra Judicial/Rendimento), historico, os 3 modelos (naive_sazonal/sarimax/random_forest) com metricas/coeficientes/importancia, teste de Diebold-Mariano e cenarios futuros (conservador/base/otimista).';
