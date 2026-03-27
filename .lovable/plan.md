

# Documentos — Pastas, Upload de Arquivos e Links

## O que será feito
Redesenhar completamente a página Documentos para funcionar como um gerenciador de arquivos visual com:
- **Pastas** criáveis pelo usuário
- **Itens** dentro das pastas: arquivos uploadados (Storage) ou links externos
- Visual moderno com ícones diferenciados para pastas, arquivos e links
- Navegação por pastas (clicar na pasta abre seu conteúdo)

## Banco de Dados

### Nova tabela: `documento_pastas`
| Coluna | Tipo | Obs |
|--------|------|-----|
| id | uuid | PK |
| user_id | uuid | NOT NULL |
| nome | text | NOT NULL |
| created_at | timestamptz | default now() |

RLS: authenticated pode CRUD (select/insert com user_id, update/delete com user_id).

### Alterar tabela `documentos`
- Adicionar coluna `pasta_id uuid` (nullable, FK para documento_pastas)
- Adicionar coluna `categoria text` default `'link'` — valores: `'arquivo'` ou `'link'`
- Adicionar coluna `arquivo_url text` (nullable) — URL do arquivo no Storage
- Adicionar coluna `arquivo_nome text` (nullable) — nome original do arquivo

### Storage bucket
- Criar bucket `documentos` (público) para uploads de arquivos

## Frontend — `src/pages/Documentos.tsx`

Reescrever completamente com layout visual:

1. **Barra superior**: botão "Nova Pasta" + botão "Novo Item" (arquivo ou link)
2. **Breadcrumb**: "Documentos > Nome da Pasta" para navegação
3. **Grid de cards**:
   - **Pasta**: ícone de pasta amarela, nome, contagem de itens. Clicável para navegar dentro.
   - **Arquivo**: ícone baseado na extensão (PDF=vermelho, Excel=verde, PPT=laranja, imagem=azul, genérico=cinza). Badge "Arquivo" abaixo. Clicável para abrir/download.
   - **Link**: ícone de link/globe azul. Badge "Link" abaixo. Clicável para abrir em nova aba.
4. **Dialog "Nova Pasta"**: campo nome apenas
5. **Dialog "Novo Item"**: seleção arquivo/link, seletor de pasta, campo de upload ou URL, nome, observações

## Mudanças

| Arquivo | Ação |
|---------|------|
| Migração SQL | Criar `documento_pastas`, alterar `documentos` (add pasta_id, categoria, arquivo_url, arquivo_nome), criar bucket `documentos` |
| `src/pages/Documentos.tsx` | Reescrever com sistema de pastas, upload, grid visual |

