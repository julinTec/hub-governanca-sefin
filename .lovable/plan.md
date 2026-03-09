

# Página de Gestão de Usuários (Admin)

## Visão Geral
Criar um sistema de roles com uma página administrativa "Usuários" onde o admin pode:
- Ver todos os usuários cadastrados na plataforma
- Ativar/desativar acesso de usuários
- Atribuir roles (admin, user)

## Mudanças no Banco de Dados

### 1. Criar tabela `user_roles`
```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
```

### 2. Função `has_role` (security definer)
Para verificar roles sem recursão RLS.

### 3. RLS Policies
- Admins podem ver todos os roles
- Admins podem inserir/atualizar/deletar roles
- Usuários podem ver seu próprio role

### 4. Inserir seu usuário como admin
Após você fazer login, inserir seu `user_id` na tabela `user_roles` com role `admin`.

### 5. Edge function para listar usuários
Como não é possível consultar `auth.users` pelo client SDK, criar uma edge function `list-users` que usa o service role key para listar todos os usuários do auth.

## Mudanças no Frontend

### 1. Atualizar `useAuth` 
- Adicionar campo `role` ao contexto de autenticação
- Consultar `user_roles` ao carregar sessão

### 2. Criar página `src/pages/Usuarios.tsx`
- Tabela com todos os usuários (email, data de criação, role)
- Botão para alterar role (admin/user)
- Protegida apenas para admins

### 3. Atualizar navegação
- Adicionar "Usuários" na sidebar (visível só para admins)
- Adicionar rota `/usuarios` no `App.tsx` com proteção de admin

### 4. Remover aba "Cadastrar" da página Auth
- O cadastro de novos usuários será feito apenas pelo admin na página Usuários
- A página de login mostrará apenas o formulário de login

## Fluxo
1. Admin acessa `/usuarios`
2. Vê lista de todos os usuários da plataforma
3. Pode cadastrar novo usuário (email + senha)
4. Pode alterar role de usuários existentes

