

# Página Endpoint — API Pública de OKRs

## O que será feito

1. **Edge Function `okr-public-api`** — endpoint público (sem autenticação) que retorna todos os dados de OKRs estruturados (Objetivos → Key Results → Ações) em JSON. Usa `SUPABASE_SERVICE_ROLE_KEY` para bypassar RLS.

2. **Página `/endpoint`** no frontend — visível apenas para admins, exibindo:
   - URL da API pública para copiar
   - Exemplo do JSON retornado
   - Botão para testar/visualizar a resposta ao vivo

## Estrutura do JSON retornado

```text
{
  "objetivos": [
    {
      "id", "objetivo", "ciclo", "responsavel", "status", ...
      "key_results": [
        {
          "id", "kr", "codigo", "tipo", "meta", "percentual", ...
          "acoes": [
            { "id", "acao", "responsavel", "prazo", "status" }
          ]
        }
      ]
    }
  ]
}
```

## Mudanças

| Arquivo | Ação |
|---------|------|
| `supabase/functions/okr-public-api/index.ts` | Criar edge function pública que consulta okr_objetivos, okr_key_results e okr_acoes usando service role |
| `src/pages/Endpoint.tsx` | Nova página admin com URL da API, botão de teste e preview do JSON |
| `src/App.tsx` | Adicionar rota `/endpoint` protegida |
| `src/components/layout/MainLayout.tsx` | Adicionar link "Endpoint" na seção Administração do sidebar (apenas admin) |

Sem mudanças no banco de dados.

