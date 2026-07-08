# Dashboard Gerencial de OKRs

Adicionar, dentro da página `/okrs`, dois botões no cabeçalho — **"Dashboard Gerencial"** e **"Painel BI"** — que abrem overlays internos (sem sair da página) com botão de fechar (X) no canto superior.

## 1. Botões no cabeçalho de OKRs
Em `src/pages/OKRs.tsx`, ao lado dos botões já existentes (Importar/Adicionar), incluir:
- `Dashboard Gerencial` (ícone `LayoutDashboard`) → abre overlay do dashboard.
- `Painel BI` (ícone `BarChart3`) → abre overlay com iframe do Power BI.

Os overlays serão renderizados como `Dialog` fullscreen (ou div fixed inset-0 com fundo do app), mantendo o contexto de OKRs. Cada um com botão X no topo direito.

## 2. Componente `OKRDashboardGerencial`
Novo arquivo: `src/components/okrs/OKRDashboardGerencial.tsx`.

Busca em paralelo `okr_objetivos`, `okr_key_results`, `okr_acoes` (mesmas queries do módulo).

### Filtros (barra superior, minimalista)
Selects com opção "Todos":
- **Objetivo**
- **Líder** (do KR)
- **Equipe** (do KR)
- **Responsável pela Ação**

Os filtros afetam todos os cards e gráficos abaixo. Botão "Limpar filtros".

### Cards de indicadores (grid responsivo)

**Linha 1 — Key Results por status:**
- Total de KRs
- KRs Concluídos / Em andamento / Atrasados / A iniciar (um card por status, cor do `StatusBadge`)

**Linha 2 — Ações por status:**
- Total de Ações
- Ações Concluídas / Em andamento / Atrasadas / A iniciar

**Linha 3 — KPIs:**
- % médio de conclusão das ações por KR (média de `percentual`)
- % de KRs concluídos
- Nº de Objetivos ativos

### Gráficos (recharts, já disponível no shadcn)

1. **Barras — KRs por Equipe**, com filtro embutido de status (Select minimalista dentro do card) que refiltra apenas esse gráfico.
2. **Barras empilhadas — Ações por Equipe/Status**.
3. **Pizza/Donut — Distribuição de status dos KRs**.
4. **Barras horizontais — % de conclusão por KR** (top N, ordenado desc), usando `okr_key_results.percentual`.
5. **Barras — KRs por Líder**.

Cada gráfico dentro de um `Card` com título e (quando fizer sentido) mini-select de status.

### Comportamento
- Loading com spinner enquanto carrega.
- Tudo client-side sobre os dados carregados uma vez (recomputa via `useMemo` ao mudar filtros).
- Layout adequado para apresentação (paddings generosos, títulos claros).

## 3. Componente `OKRPainelBI`
Novo arquivo: `src/components/okrs/OKRPainelBI.tsx`.

Overlay fullscreen com iframe:
```
https://app.powerbi.com/view?r=eyJrIjoiYTBjOGJjZWQtMjkzNi00OTQxLTkwMDUtMjBlODQzYTMyZjg0IiwidCI6IjA4ZmIyNmFjLWJkMWQtNGQyMC1iMzIwLWE4NmEwYTM1Y2UzMCJ9
```
- `iframe` ocupando 100% da área, `allowFullScreen`, `frameBorder=0`.
- Botão X para fechar, título "Painel BI".

## Detalhes técnicos
- Sem novas tabelas/migrations; usa dados existentes.
- Recharts: usar `BarChart`, `PieChart`, `ResponsiveContainer`.
- Cores dos status reutilizadas via classes/variáveis já existentes (`status-verde`, `status-amarelo`, `status-vermelho`) — mapear para hex do tailwind config para os gráficos.
- Overlays gerenciados por dois `useState` booleanos em `OKRs.tsx`.

## Arquivos afetados
- `src/pages/OKRs.tsx` (2 botões + estados + render de overlays)
- `src/components/okrs/OKRDashboardGerencial.tsx` (novo)
- `src/components/okrs/OKRPainelBI.tsx` (novo)
