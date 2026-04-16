

# OKRs — Filtros + Manter Estado Aberto

## Filtros
Adicionar 3 selects no topo da página (acima da lista de objetivos):
- **Líder** — extraído de `okr_key_results.lider` (valores únicos)
- **Responsável pela ação** — extraído de `okr_acoes.responsavel` (valores únicos)
- **Equipe** — extraído de `okr_key_results.equipe` (valores únicos)

Cada select com opção "Todos". Botão "Limpar filtros" quando algum filtro estiver ativo.

**Lógica de filtragem:**
- Filtra primeiro as **ações** pelo responsável selecionado
- Filtra os **KRs** pelo líder e equipe selecionados, e mantém apenas KRs que tenham ações compatíveis (se filtro de responsável estiver ativo)
- Mantém apenas **objetivos** que tenham ao menos um KR após filtragem
- Quando há filtros ativos, todos os accordions/KRs filtrados ficam expandidos automaticamente para visualizar os resultados

## Manter Estado Aberto após Cadastro

Hoje o `Accordion` é `type="multiple"` mas sem `value` controlado, então quando `fetchAll()` recarrega os dados, o React remonta e o estado interno se perde.

**Solução:** controlar o accordion de objetivos com `value` + `onValueChange` em estado React (`openObjetivos: string[]`). Mesma coisa para a expansão do "Plano de Ação" dentro de cada KR (estado `openKrs: string[]`).

Após criar/editar um Objetivo, KR ou Ação:
- Adicionar o ID do objetivo pai a `openObjetivos` (se ainda não estiver)
- Adicionar o ID do KR pai a `openKrs` (se ainda não estiver, no caso de criar Ação)
- Não fechar nada automaticamente

Assim o usuário pode cadastrar várias ações/KRs em sequência sem precisar reabrir.

## Mudanças

| Arquivo | Ação |
|---------|------|
| `src/pages/OKRs.tsx` | Adicionar 3 selects de filtro, lógica de filtragem hierárquica, controlar accordion via state, manter aberto após CRUD |

Sem mudanças no banco de dados.

