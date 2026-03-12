

# Plano: Dashboard + OKRs Ficha de KR

## 1. Dashboard — Corrigir card "Consultoria" para "Sydle / SEI"

Mudança simples em `src/pages/Dashboard.tsx`: renomear o módulo de "Consultoria" para "Sydle / SEI", atualizar descrição para "Acesso aos Sistemas" e trocar o ícone para algo mais adequado (ex: `ExternalLink` ou `Monitor`).

## 2. OKRs — Novo modelo de Ficha de KR + Plano de Ação

Baseado na planilha enviada, cada KR possui dois blocos:

**Ficha do KR** com campos:
- KR Código (ex: KR1.1)
- Descrição do KR
- Tipo (Entrega/Implementação ou Resultado)
- Objetivo relacionado (vínculo com okr_objetivos)
- Periodicidade de medição
- Valor atual (baseline)
- Fonte de dados
- Líder responsável
- Equipe envolvida
- Entregas finais esperadas
- Datas de revisão

**Plano de Ação** (sub-tabela por KR):
- Nº da ação
- Descrição da ação
- Responsável
- Prazo
- Status (A iniciar / Em andamento / Concluído / Atrasado)

### Mudanças no banco de dados

**Alterar tabela `okr_key_results`** — adicionar colunas novas:
- `codigo` (text) — código do KR (ex: KR1.1)
- `tipo` (text) — "Entrega/Implementação" ou "Resultado"
- `periodicidade` (text)
- `baseline` (text)
- `fonte_dados` (text)
- `lider` (text)
- `equipe` (text)
- `entregas_esperadas` (text)
- `datas_revisao` (text)

**Criar tabela `okr_acoes`** — plano de ação por KR:
- `id` (uuid, PK)
- `key_result_id` (uuid, FK → okr_key_results)
- `user_id` (uuid)
- `numero` (integer)
- `acao` (text)
- `responsavel` (text)
- `prazo` (date)
- `status` (text, default "A iniciar")
- `created_at`, `updated_at`
- RLS: autenticados podem ler/gerenciar

### Mudanças na interface (página OKRs)

Redesenhar `src/pages/OKRs.tsx` com uma estrutura hierárquica:

1. **Nível 1 — Objetivos**: Lista de objetivos como cards expansíveis (accordion)
2. **Nível 2 — KRs**: Dentro de cada objetivo, lista de Key Results como "fichas" (cards com todos os campos da planilha)
3. **Nível 3 — Plano de Ação**: Dentro de cada KR, tabela editável inline com as ações

**Fluxo do usuário:**
- Criar/editar Objetivo (já existe)
- Dentro do objetivo, criar "Ficha do KR" com formulário completo (dialog)
- Dentro do KR, adicionar ações ao plano de ação (tabela inline ou dialog simples)
- Visualizar tudo expandido/colapsado

### Arquivos impactados

| Arquivo | Ação |
|---------|------|
| `src/pages/Dashboard.tsx` | Renomear "Consultoria" → "Sydle / SEI" |
| `src/pages/OKRs.tsx` | Redesenhar com accordion Objetivo → Ficha KR → Plano de Ação |
| Migração SQL | Alterar `okr_key_results` + criar `okr_acoes` |

