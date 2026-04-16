

## Plano: Toggle de Expansão para Plano de Ação dos KRs

### Contexto
Hoje, o "Plano de Ação" dentro de cada KR sempre exibe a tabela de ações quando há ações cadastradas. O usuário quer poder **reduzir/expandir** essa tabela de ações por KR, igual ao chevron que existe nos Objetivos, mantendo o estado após CRUD (já temos `openKrs` controlado).

### O que será feito

Em `src/pages/OKRs.tsx`:

1. **Adicionar chevron clicável no cabeçalho "Plano de Ação (N)"** de cada KR.
   - Ícone `ChevronDown` rotaciona quando aberto (mesma animação dos objetivos).
   - Clicar alterna o ID do KR no estado já existente `openKrs`.

2. **Renderizar a tabela de ações condicionalmente** com base em `openKrs.includes(kr.id)`.
   - Se fechado: mostra apenas o cabeçalho "Plano de Ação (N)" + botão "+ Ação".
   - Se aberto: mostra cabeçalho + tabela completa de ações.

3. **Manter estado após CRUD** (já implementado):
   - Ao criar/editar uma Ação, o KR pai já é adicionado a `openKrs` — então a tabela permanece aberta.
   - Ao criar um KR novo, ele inicia fechado (consistente com objetivos).

4. **Compatibilidade com filtros**: quando filtros estiverem ativos, os KRs filtrados continuam sendo auto-expandidos (lógica atual preservada).

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/pages/OKRs.tsx` | Tornar header "Plano de Ação" clicável com chevron, renderizar tabela condicionalmente baseado em `openKrs` |

Sem mudanças no banco de dados.

