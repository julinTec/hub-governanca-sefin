
# Plano: Ajustes robustos de estabilidade e desempenho

## Diagnóstico

O erro na imagem (`ERR_TIMED_OUT` em `hub-governanca-sefin.lovable.app/auth`) **não é um erro do código do app** — é o navegador falhando em alcançar o servidor. As causas mais comuns são:

1. **Rede/firewall corporativo bloqueando `*.lovable.app`** (muito comum em redes governamentais).
2. **Instância Lovable Cloud subdimensionada** — respostas lentas do backend fazem chamadas estourarem timeout no cliente (o "AbortError: signal is aborted without reason" nos logs confirma que há requisições sendo abortadas).
3. **Ausência de tratamento de erro/retry** nas chamadas ao Supabase — quando uma request trava, a UI fica presa sem feedback.

Vou atacar os 3 pontos: o que dá pra corrigir no código + orientação clara pra rede/infra.

## O que será implementado no código

### 1. Camada de resiliência nas chamadas ao backend
- Criar `src/lib/supabaseWithRetry.ts`: wrapper com **timeout configurável (15s)** e **retry automático (3x com backoff)** para chamadas Supabase.
- Aplicar nas telas mais pesadas (OKRs, Dashboard, Usuários, Documentos) sem alterar a lógica de negócio.

### 2. Tratamento global de erros
- `src/components/ErrorBoundary.tsx`: captura crashes de React e mostra tela amigável com botão "Recarregar" em vez de tela branca.
- Handler global para `unhandledrejection` (AbortError, network fail) que exibe toast informativo em vez de silenciar.
- Envolver `<App />` no ErrorBoundary em `src/main.tsx`.

### 3. Detecção de conectividade
- `src/hooks/useOnlineStatus.tsx`: monitora `navigator.onLine` + ping periódico ao Supabase.
- Banner discreto no topo quando offline/backend inacessível: *"Sem conexão com o servidor. Verifique sua rede ou firewall."*

### 4. Melhorias na tela de login (Auth.tsx)
- Timeout explícito de 15s na chamada `signInWithPassword` com mensagem clara em caso de falha.
- Botão "Tentar novamente" quando ocorrer erro de rede.
- Mensagens distinguindo: credenciais inválidas × servidor inacessível × timeout.

### 5. Loading states mais robustos
- Nas páginas que fazem múltiplas queries em paralelo (OKRs, Dashboard), garantir que uma query falha **não trava a página inteira** — mostrar dados parciais + aviso do que falhou.

## O que **não** é resolvível via código (orientação ao usuário)

Vou deixar documentado no final do chat:

1. **Se o erro é ERR_TIMED_OUT** em redes específicas (SEFIN/TJCE/governo):
   - Solicitar à TI a **liberação do domínio `*.lovable.app`** no firewall/proxy.
   - Alternativa recomendada: conectar um **domínio próprio institucional** (ex: `hub.sefin.ce.gov.br`) via Project Settings → Domains. Domínios próprios costumam já estar liberados.

2. **Se o backend está lento** (queries demorando):
   - Posso rodar `slow_queries` e `db_health` para verificar se a instância Lovable Cloud precisa ser redimensionada (upgrade de compute).

## Diagrama do fluxo de resiliência

```text
[Usuário] → [Componente] → [supabaseWithRetry]
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
              [Timeout 15s] [Retry x3] [ErrorBoundary]
                    │           │           │
                    └───────────┼───────────┘
                                ▼
                    [Toast/Banner amigável]
                    [Estado parcial preservado]
```

## Arquivos que serão alterados/criados

**Novos:**
- `src/lib/supabaseWithRetry.ts`
- `src/components/ErrorBoundary.tsx`
- `src/components/ConnectionBanner.tsx`
- `src/hooks/useOnlineStatus.tsx`

**Editados:**
- `src/main.tsx` (ErrorBoundary + handler global)
- `src/App.tsx` (ConnectionBanner)
- `src/pages/Auth.tsx` (timeout + mensagens)
- `src/hooks/useAuth.tsx` (timeout no signIn/getSession)
- `src/pages/OKRs.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Usuarios.tsx` (loading resiliente)

## Fora de escopo

- Não vou mexer na lógica de OKRs, importação de planilha, dashboard gerencial ou visibilidade de módulos.
- Não vou alterar edge functions (já estão OK).
- Redimensionamento da instância Lovable Cloud: só executo se você confirmar após a auditoria.
