# Ajustes nos OKRs: datas e nova lista de ações por data

## 1. Corrigir datas invertidas

**O que foi visto:** as datas das ações no sistema aparecem com dia e mês trocados (ex.: 04/11/2026 salvo como 11 de abril). No banco há datas suspeitas como 11/04, 11/06, 11/09, 11/10, 10/02, 10/05, todas com dia menor ou igual a 12, que é o padrão desse tipo de troca. A causa provável é a leitura da planilha: o Excel entrega algumas datas como texto no formato americano (mês/dia) e o importador lê como dia/mês. Isso será confirmado com a planilha antes da correção.

**Correção:**
- Importador: ler a data real da célula (não o texto formatado), para nunca mais inverter.
- Exibição: mostrar todas as datas no formato brasileiro **dd/mm/aaaa** (hoje aparece aaaa-mm-dd).
- Dados atuais: as ações com data trocada serão corrigidas. Opção mais segura: reimportar a planilha com a opção "Atualizar" depois da correção (os status alterados manualmente seriam sobrescritos). Outra opção: trocar dia e mês nas datas ambíguas direto no banco, depois de conferir por amostragem com a planilha.

## 2. Nova aba "Ações por Data"

Uma lista/tabela dentro da página de OKRs com **todas as ações**, da data mais antiga para a mais futura.

Colunas:
- **KR** (código, ex.: KR 1.1)
- **Ação**
- **Responsável**
- **Data** (dd/mm/aaaa, com destaque em vermelho se já venceu e não foi concluída)
- **Status**: pode ser alterado direto na tabela (A iniciar / Em andamento / Concluído / Atrasado)

Comportamento:
- A mudança de status é salva na hora nos mesmos OKRs de hoje: a ação muda no KR, e o % do KR e o Dashboard Gerencial se atualizam sozinhos.
- Ações sem data aparecem no fim da lista.
- Filtros simples: busca por KR ou ação, responsável e status.
- A página não volta para o topo ao salvar.

## Detalhes técnicos
- `okrImport.ts`: ler com `cellDates`/valor bruto (`raw: true`) e tratar strings `m/d/yy` gerados pelo SheetJS; manter o suporte a dd/mm digitado.
- Helper `fmtDateBr` usado em `OKRs.tsx` (tabela de ações) e na nova visão; `okrExport.ts` já exporta dd/mm/aaaa.
- Nova visão `OKRAcoesPorData.tsx`, aberta por uma aba/botão em `OKRs.tsx`, usando os mesmos dados já carregados (`acoes` + `keyResults`), ordenados por `prazo` asc, com nulos no fim.
- Update de status: `supabase.from('okr_acoes').update({ status }).eq('id', ...)`, atualização otimista na tela; o trigger `update_kr_percentual` já recalcula o % do KR.
- Correção dos dados via `run_sql` somente depois de confirmar o padrão da inversão.
