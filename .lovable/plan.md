
# Documentos — Upload sem nome obrigatório + múltiplos arquivos

## O que será ajustado

Na página `Documentos`, o fluxo de criação de item por upload será melhorado para:

1. **Tornar o campo “Nome” opcional quando o tipo for arquivo**
   - Se o usuário preencher, o valor digitado será usado.
   - Se deixar em branco, o sistema usará automaticamente o nome do arquivo selecionado.

2. **Permitir envio de vários arquivos de uma vez**
   - O input de upload aceitará múltiplos arquivos.
   - Cada arquivo enviado gerará um item separado na base.
   - Todos os arquivos usarão a mesma pasta e observações escolhidas no formulário.
   - Se o nome estiver preenchido manualmente e houver apenas 1 arquivo, ele será usado normalmente.
   - Se houver vários arquivos, o nome de cada item será derivado do respectivo arquivo para evitar duplicidade/confusão.

3. **Ajustar validações do formulário**
   - Para `link`: continuar exigindo URL e nome.
   - Para `arquivo`: exigir ao menos um arquivo selecionado, mas não exigir nome manual.
   - Mensagens de erro e sucesso serão adequadas ao cenário de 1 ou vários arquivos.

## Como será implementado

### 1. Estado do upload
Em `src/pages/Documentos.tsx`:
- trocar `selectedFile: File | null` por uma estrutura para múltiplos arquivos (`File[]`)
- atualizar a limpeza do formulário ao fechar/salvar

### 2. Regra do nome automático
No envio:
- se `categoria === 'arquivo'` e o campo `nome` estiver vazio:
  - usar `file.name` como `nome`
- manter `arquivo_nome` com o nome original do arquivo
- continuar salvando o arquivo no storage com UUID, preservando a regra atual de resiliência

### 3. Upload em lote
No `handleCreateItem`:
- quando for upload de arquivos, iterar sobre todos os arquivos selecionados
- subir cada arquivo individualmente
- montar um registro por arquivo em `documentos`
- inserir todos os itens criados
- manter a pasta selecionada e observações comuns aos itens do lote

### 4. UI do formulário
No dialog “Novo Item”:
- remover o asterisco de obrigatoriedade do campo Nome
- incluir dica visual explicando:
  - “Opcional para upload; se vazio, será usado o nome do arquivo”
- alterar o input para `multiple`
- exibir lista dos arquivos selecionados em vez de apenas um

## Arquivo a alterar

| Arquivo | Ação |
|---------|------|
| `src/pages/Documentos.tsx` | Ajustar validação do nome, suportar múltiplos arquivos, gerar nome automático a partir do arquivo e atualizar a UI do dialog |

## Detalhes técnicos
- Não será necessária mudança no banco de dados.
- O bucket e a estrutura atual de armazenamento continuam os mesmos.
- O comportamento de links permanece igual.
- Os uploads continuarão usando nome físico em UUID no storage e nome original apenas para exibição/cadastro.
