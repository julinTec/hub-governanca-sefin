
# Redesign do Dashboard Gerencial de OKRs

Refinar `src/components/okrs/OKRDashboardGerencial.tsx` para uma apresentação executiva: layout minimalista/moderno, filtros multi-seleção, gráficos com rótulos legíveis e paleta com mais contraste.

## 1. Header executivo
- Header mais alto (h-16), título em `text-lg` com subtítulo discreto.
- Fundo com leve gradiente sutil usando tokens (`from-background to-muted/30`) e borda inferior refinada.
- Botão de fechar em pill com hover destacado.

## 2. Filtros com multi-seleção
Substituir os `Select` simples por um novo componente `MultiSelect` (baseado em `Popover` + `Command` + `Checkbox`, tudo já disponível no shadcn) para:
- Objetivo, Líder, Equipe, Responsável pela Ação.

Comportamento:
- Estados passam de `string` para `string[]` (vazio = "todos").
- Trigger mostra: "Todos", "Nome único" ou "N selecionados" com badge de contagem.
- Busca embutida (Command Input) em cada popover.
- Botão "Limpar filtros" continua, agora como link sutil no topo direito do card.
- Card de filtros mais enxuto: 4 colunas em `lg`, sem labels grandes — placeholder + ícone dentro do trigger.

## 3. Cards de KPI redesenhados
- Novo componente interno `StatCard` com:
  - Barra lateral fina colorida (2px) no lado esquerdo indicando status.
  - Número grande (`text-3xl font-semibold tracking-tight`).
  - Label em `text-[11px] uppercase tracking-widest text-muted-foreground`.
  - Ícone dentro de um chip circular `bg-primary/10`.
  - Hover: leve elevação (`hover:shadow-md transition`).
- Agrupar as seções (KRs / Ações / KPIs) com títulos discretos e divisores finos.
- Grid: `2 / 3 / 6` colunas mantendo respiro; gap 4.

## 4. Gráficos legíveis (sem sobreposição de rótulos)
Ajustes em todos os `recharts`:
- Aumentar altura dos cards para `h-80`.
- Eixo X com nomes longos: usar `angle={-35}`, `textAnchor="end"`, `height={80}`, `interval={0}` e truncamento (`nome.length > 14 ? nome.slice(0,14)+'…' : nome`) com tooltip completo.
- Tooltip customizado com fundo `bg-popover`, borda sutil, sombra e tipografia consistente.
- Grid mais suave (`stroke="hsl(var(--border))"`, `opacity 0.4`).
- Barras com `radius={[6,6,0,0]}` e largura máxima (`maxBarSize={38}`).
- Legenda com `wrapperStyle={{ fontSize: 12, paddingTop: 8 }}`.

Gráficos específicos:
- **KRs por Equipe** e **KRs por Líder**: se houver mais de 8 categorias, virar horizontal automático para nomes não colidirem.
- **Pizza de Status**: virar Donut com `paddingAngle={2}`, label externa com linhas guias e legenda à direita em telas grandes.
- **% de Conclusão por KR (Top 15)**: barra horizontal com rótulo do valor no fim da barra (`LabelList` `position="right"`) e cor gradiente por faixa (verde ≥80, amarelo 40–79, vermelho <40).
- **Ações por Equipe/Status**: manter empilhada, mas com ordem de status fixa (Concluído → Em andamento → Atrasado → A iniciar → Cancelado) para leitura consistente.

## 5. Paleta com mais vida (sem quebrar tema)
- Novos tokens no dashboard (apenas dentro do componente, via `STATUS_COLORS`):
  - Concluído `hsl(152 76% 40%)`
  - Em andamento `hsl(38 95% 52%)`
  - Atrasado `hsl(0 78% 58%)`
  - A iniciar `hsl(217 20% 62%)`
  - Cancelado `hsl(0 0% 45%)`
- Cor primária dos gráficos passa a usar `hsl(var(--primary))` com variação `--primary / 0.85` para segundos elementos.
- Cards com `bg-card` + `border-border/60` e sombra suave (`shadow-sm`), removendo o aspecto "chapado".

## 6. Título de seções
- Em vez de `text-sm uppercase`, usar linha horizontal com rótulo à esquerda:
  ```text
  KEY RESULTS ───────────────────────────────
  ```
- Cria hierarquia visual clara sem poluir.

## 7. Ajustes de lógica para multi-seleção
- Filtros usam `array.length === 0 || array.includes(valor)`.
- `useMemo` recalcula normalmente; sem impacto de performance (mesmo dataset).

## Detalhes técnicos
- Novo arquivo `src/components/shared/MultiSelect.tsx` (Popover + Command + Checkbox), reutilizável.
- Sem novas dependências (Command, Popover, Checkbox já existem no shadcn do projeto).
- Sem alterações de schema, migrations ou lógica de dados.

## Arquivos afetados
- `src/components/okrs/OKRDashboardGerencial.tsx` (redesign completo do JSX, filtros passam a arrays)
- `src/components/shared/MultiSelect.tsx` (novo)
