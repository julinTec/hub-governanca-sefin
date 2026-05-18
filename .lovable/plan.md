# Importação de OKRs — Corrigir mapeamento dos campos (duas tabelas)

## Problema
Cada aba `KR x.y` tem **duas tabelas independentes**:

1. **Tabela de cabeçalho do KR** (linhas ~2–13): coluna B = rótulo do campo, coluna C = valor.
2. **Tabela do plano de ação** (linhas ~16 em diante): cabeçalho com `Nº | Ação | Responsável | Prazo | Status` e linhas de ações abaixo.

O parser atual lê a tabela 1 em endereços fixos (`C3` a `C13`). Quando alguma aba tem linhas a mais/a menos, células mescladas ou ordem ligeiramente diferente, os valores caem em campos errados (ex.: "Equipe envolvida" vira "Líder", "Datas de revisão" vira "Entregas"). A tabela 2 já é encontrada dinamicamente e está correta — só ajustes finos.

## Solução

Em `src/lib/okrImport.ts`, separar claramente o parsing das duas tabelas e mapear a primeira **por rótulo** em vez de por endereço fixo.

### Tabela 1 — Cabeçalho do KR (lookup por rótulo na coluna B)

Percorrer as linhas 1–30 da aba. Para cada linha `r`:
- Ler o rótulo em `B{r}`, normalizar (sem acento, lower, espaços condensados).
- Casar contra a lista de aliases abaixo (match exato; fallback `startsWith`).
- Quando casar, pegar o valor em `C{r}`. Se `C{r}` estiver vazio, tentar `D{r}` (segurança contra mescla deslocada).

| Campo destino | Aliases (normalizados) |
|---|---|
| `codigo` | `kr codigo`, `codigo`, `codigo do kr` |
| `kr` | `descricao do kr`, `descricao`, `kr` |
| `tipo` | `tipo` |
| `objetivoTexto` | `objetivo relacionado`, `objetivo` |
| `periodicidade` | `periodicidade de medicao`, `periodicidade` |
| `baseline` | `valor atual (baseline) (para kr resultado)`, `valor atual`, `baseline` |
| `fonte_dados` | `fonte de dados`, `fonte dos dados` |
| `lider` | `lider responsavel pelo kr`, `lider`, `responsavel pelo kr` |
| `equipe` | `equipe envolvida`, `equipe` |
| `entregas_esperadas` | `entregas finais esperadas`, `entregas esperadas`, `entregas` |
| `datas_revisao` | `datas de revisao`, `data de revisao`, `datas` |

- Fallback do `codigo`: se não achar o rótulo, usar o nome da aba (`KR 3.2` → `KR3.2`).
- Logs `console.warn` quando rótulos esperados não forem encontrados, para diagnóstico.

### Tabela 2 — Plano de ação (já dinâmica, com pequenos ajustes)

- Continuar localizando a linha de cabeçalho pela presença de `Ação` + `Responsável` + `Prazo` + `Status`.
- **Garantir que a varredura comece sempre abaixo da tabela 1** (a partir da última linha de cabeçalho mapeada), evitando confundir colunas iguais que possam aparecer antes.
- Manter mapeamento de colunas por índice detectado (`Nº` em B, `Ação` em C, `Responsável` em D, `Prazo` em E, `Status` em F na planilha real, mas resolvido dinamicamente).
- Parar a leitura ao encontrar duas linhas seguidas totalmente vazias (já implementado) ou ao encontrar a linha que começa com `*STATUS:` (legenda).

## Arquivos
| Arquivo | Mudança |
|---|---|
| `src/lib/okrImport.ts` | Substituir leitura de `C3`–`C13` por lookup baseado nos rótulos da coluna B; garantir que `parseAcoes` busque o cabeçalho da tabela de ações abaixo da última linha de rótulo encontrada; parar na legenda `*STATUS:` |

Sem mudanças no banco, no dialog de importação ou na página de OKRs.
