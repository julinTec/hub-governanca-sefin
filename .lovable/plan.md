# Importação OKR — corrigir colunas deslocadas no Plano de Ação

## Diagnóstico (confirmado executando o parser sobre a planilha enviada)

Resultado atual para `KR1.1`:

```
{ numero: 1, acao: "1", responsavel: "Analise de dados...", prazo: null, status: "46150" }
```

Ou seja, tudo deslocado **uma coluna para a direita**: `acao` recebe o número, `responsavel` recebe o texto da ação, `prazo` recebe o nome do responsável e `status` recebe o serial da data (46150).

### Causa raiz

Em `src/lib/okrImport.ts`, função `findActionHeaderRow`:

```ts
for (let c = range.s.c; c <= range.e.c; c++) { rowVals.push(...) }
...
rowVals.forEach((v, i) => { ... cols.acao = i; ... });
```

`range.s.c` da aba é **1** (coluna B), porque `!ref` = `B2:G29`. Logo `rowVals[0]` corresponde à coluna B, `rowVals[1]` à C, etc. Mas o índice `i` salvo em `cols` (0, 1, 2, 3, 4) é usado depois em `XLSX.utils.encode_cell({ r, c: i })`, que interpreta `0=A`, `1=B`, `2=C`... → leitura uma coluna à esquerda da real. Como a coluna A está vazia, `numero` cai em `autoNum` e os demais campos pegam o valor da coluna anterior à correta.

## Correção

Em `src/lib/okrImport.ts`:

1. Em `findActionHeaderRow`, gravar em `cols.*` o **índice absoluto da coluna na planilha** (`range.s.c + i`), não o índice dentro de `rowVals`.

   ```ts
   rowVals.forEach((v, i) => {
     const absC = range.s.c + i;
     if (matchNumero(v) && cols.numero === undefined) cols.numero = absC;
     if (matchAcao(v) && cols.acao === undefined) cols.acao = absC;
     // ...idem responsavel/prazo/status
   });
   ```

2. `parseAcoes` continua usando `XLSX.utils.encode_cell({ r, c: header.cols[key] })` — agora com índice absoluto, lê as colunas certas.

3. Sem mudanças em `parseKRHeader` (já usa colunas fixas B/C/D).

## Arquivos
| Arquivo | Mudança |
|---|---|
| `src/lib/okrImport.ts` | `findActionHeaderRow`: salvar índices absolutos das colunas (somar `range.s.c`) |

Sem alterações no banco, dialog ou página de OKRs.
