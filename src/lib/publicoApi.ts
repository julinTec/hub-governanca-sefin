// Cliente simples pra Edge Function hub-publico-api, usada pela tela
// publica /publico/:token (sem login - ver src/pages/Publico.tsx). Chamada
// via fetch() puro (igual Endpoint.tsx faz com as outras APIs publicas),
// nao via supabase.functions.invoke, porque nao ha sessao autenticada aqui.

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hub-publico-api`;

export class PublicoApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function chamarApiPublica<T>(
  token: string,
  recurso: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(BASE_URL);
  url.searchParams.set('token', token);
  url.searchParams.set('recurso', recurso);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new PublicoApiError(body?.error || `Erro ${res.status}`, res.status);
  }
  return body as T;
}
