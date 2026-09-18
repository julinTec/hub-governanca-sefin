// Callback chamado pelo GitHub Actions (.github/workflows/previsao.yml) ao
// final do job de previsao, pra gravar o resultado (ou o erro) de volta em
// previsao_execucoes.
//
// Por que essa function existe em vez do workflow gravar direto no banco via
// REST API: no Lovable Cloud a service_role key e a URL "cruas" do Supabase
// nao ficam acessiveis pelo usuario (nao existe dashboard do Supabase pra
// esse tipo de projeto) — so o que roda DENTRO de uma Edge Function recebe
// SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY automaticamente. Entao o GitHub
// Actions chama esta function por HTTPS publico, autenticando com um
// segredo compartilhado (PREVISAO_CALLBACK_SECRET, configurado tanto aqui -
// em Lovable: More -> Cloud -> Secrets - quanto como secret do repositorio
// no GitHub), e ela e quem efetivamente grava no banco usando as
// credenciais que só existem dentro do runtime da function.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const secretEsperado = Deno.env.get("PREVISAO_CALLBACK_SECRET");
  const secretRecebido = req.headers.get("x-previsao-secret");
  if (!secretEsperado || secretRecebido !== secretEsperado) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const body = await req.json().catch(() => null);
  const execucaoId: string | undefined = body?.execucao_id;
  if (!execucaoId) {
    return jsonResponse({ error: "execucao_id e obrigatorio" }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const payload: Record<string, unknown> = {
    status: body.status ?? "concluido",
  };
  if (body.mape !== undefined) payload.mape = body.mape;
  if (body.previsao !== undefined) payload.previsao = body.previsao;
  if (body.real_periodo_teste !== undefined) payload.real_periodo_teste = body.real_periodo_teste;
  if (body.erro !== undefined) payload.erro = body.erro;
  if (body.github_run_id !== undefined) payload.github_run_id = String(body.github_run_id);
  if (payload.status === "concluido") payload.concluido_em = new Date().toISOString();

  const { error } = await admin
    .from("previsao_execucoes")
    .update(payload)
    .eq("id", execucaoId);

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ ok: true });
});
