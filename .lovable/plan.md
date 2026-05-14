# Importação de OKRs via Planilha .xlsx

## Objetivo
Permitir que o usuário envie a planilha "Ficha KRs 2026.1-SEFIN" e o sistema crie automaticamente Objetivos, KRs e Ações faltantes, com pré-visualização e edição rápida antes da gravação.

## UX / Fluxo

1. Botão **"Importar Planilha"** (ícone Upload) no topo da página `/okrs`, ao lado de "Novo Objetivo".
2. Modal com **drag-and-drop** + seletor de arquivo (`.xlsx`).
3. Estado de loading: *"Lendo planilha e identificando OKRs..."*.
4. Tela de **pré-visualização** (dentro do mesmo modal, em etapa 2) mostrando:
   - Totais: objetivos novos, KRs novos, ações encontradas.
   - Tabela de KRs com checkbox (marcar/desmarcar), código, descrição (editável), objetivo, líder, equipe, periodicidade, status, nº ações.
   - Badges de alerta para campos vazios (equipe, entregas, datas revisão, ações sem descrição/responsável).
   - Para cada KR já existente (mesmo `codigo`): seletor *Ignorar / Atualizar / Criar cópia*.
5. Botão **"Confirmar importação"** → grava no banco, fecha modal, recarrega listas, toast de sucesso.
6. Erros de parsing por aba/campo: mensagem clara apontando a aba problemática.

## Regras de Parsing

- Bibliotecas: `xlsx` (SheetJS) — adicionar como dependência.
- Considerar somente abas cujo nome casa com `/^KR\s*\d+\.\d+$/i`.
- Ignorar `Calendário`, `Ficha do KR` e qualquer outra fora do padrão.
- Para cada aba KR, ler células fixas:
  - C3=código, C4=descrição, C5=tipo, C6=objetivo, C7=periodicidade, C8=baseline/valor atual, C9=fonte_dados, C10=lider, C11=equipe, C12=entregas_esperadas, C13=datas_revisao.
- **Plano de ação**: varrer linhas procurando cabeçalho contendo "Nº", "Ação", "Responsável", "Prazo", "Status" (case/acentos-insensitivo). A partir da linha seguinte, importar enquanto houver `Nº` ou texto em `Ação`.
- Datas: serial Excel → `Date` ISO (`YYYY-MM-DD`); vazio → `null`.
- Status normalizado para um de: `A iniciar`, `Em andamento`, `Concluído`, `Atrasado`. Vazio → `A iniciar`.
- Campos vazios não bloqueiam — são marcados como alerta na pré-visualização.

## Agrupamento e Deduplicação

- Agrupar KRs pelo texto de `Objetivo relacionado` (normalizado: trim + lowercase + remoção de acentos/espaços extras).
- Para cada grupo:
  - Procurar objetivo existente em `okr_objetivos` por texto normalizado.
  - Se não existir, criar novo: `objetivo`=texto original, `ciclo`='2026.1', `status`='Em andamento', `responsavel`='Envolvidos no processo'.
- Para cada KR:
  - Verificar duplicidade por `codigo` dentro do objetivo.
  - Aplicar decisão do usuário: **Ignorar** (skip), **Atualizar** (update no registro existente, mantém ações atuais e faz upsert das novas por `numero`), **Criar cópia** (insere novo com sufixo no código, ex.: `KR2.1-cópia`).
- Ações são inseridas em `okr_acoes` vinculadas ao `key_result_id` final, com `numero` sequencial.

## Mapeamento para o Banco

| Campo planilha | Tabela.coluna |
|---|---|
| C3 código | `okr_key_results.codigo` |
| C4 descrição | `okr_key_results.kr` |
| C5 tipo | `okr_key_results.tipo` |
| C7 periodicidade | `okr_key_results.periodicidade` |
| C8 baseline | `okr_key_results.baseline` |
| C9 fonte_dados | `okr_key_results.fonte_dados` |
| C10 líder | `okr_key_results.lider` + `responsavel` |
| C11 equipe | `okr_key_results.equipe` |
| C12 entregas | `okr_key_results.entregas_esperadas` |
| C13 datas revisão | `okr_key_results.datas_revisao` |
| Ações Nº | `okr_acoes.numero` |
| Ações Ação | `okr_acoes.acao` |
| Ações Responsável | `okr_acoes.responsavel` |
| Ações Prazo | `okr_acoes.prazo` |
| Ações Status | `okr_acoes.status` |

`percentual` do KR continuará sendo recalculado pelo trigger existente conforme ações concluídas.

## Arquivos

| Arquivo | Ação |
|---|---|
| `package.json` | adicionar dependência `xlsx` |
| `src/lib/okrImport.ts` | **novo** — parser da planilha (sheets → estrutura tipada com objetivos/KRs/ações + alertas) |
| `src/components/okrs/ImportarPlanilhaDialog.tsx` | **novo** — modal com drag-and-drop, etapas (upload → loading → preview → confirmação), controles de edição rápida e decisão de duplicidade |
| `src/pages/OKRs.tsx` | botão "Importar Planilha" no header, integração com o dialog, recarregar dados após importação |

Sem alterações no banco de dados (estrutura atual cobre todos os campos).
