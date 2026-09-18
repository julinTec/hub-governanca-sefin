// Dispara uma nova rodada de previsao de arrecadacao.
//
// Nao roda nenhum modelo aqui: so registra a solicitacao em
// `previsao_execucoes` (status = 'pendente') e chama a API do GitHub para
// disparar o workflow `previsao.yml` (workflow_dispatch), que roda o
// scripts/forecast.py de verdade dentro do GitHub Actions.
//
// A logica de previsao (SARIMAX) continua 100% em Python, em
// scripts/forecast.py no repositorio — essa function nunca reimplementa
// nada do modelo, so orquestra. Para mudar como a previsao e calculada,
// edite forecast.py normalmente; nao e preciso tocar aqui.
//
// Secrets necessarios (Project Settings -> Edge Functions -> Secrets):
//   GITHUB_TOKEN        - token com permissao "Actions: write" no repo
//   GITHUB_REPO         - "julinTec/hub-governanca-sefin"
//   GITHUB_WORKFLOW_FILE - "previsao.yml"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Client no contexto do usuario logado: respeita a RLS de
    // previsao_execucoes (INSERT exige auth.uid() = solicitado_por).
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const alvo: string | undefined = body.alvo;
    const variaveisExogenas: string[] = Array.isArray(body.variaveis_exogenas)
      ? body.variaveis_exogenas
      : [];
    const mesesTeste: number = Number(body.meses_teste ?? 6);
    const horizonteMeses: number = Number(body.horizonte_meses ?? 1);
    const basePath: string =
      body.base_path ?? "dados/BASE_MONTADA_LIMPA_-_atualizac_a_o.xlsx";

    if (!alvo) {
      return jsonResponse({ error: "Campo 'alvo' e obrigatorio" }, 400);
    }

    // 1) Registra a execucao como 'pendente'
    const { data: execucao, error: insertError } = await supabaseUser
      .from("previsao_execucoes")
      .insert({
        alvo,
        variaveis_exogenas: variaveisExogenas,
        meses_teste: mesesTeste,
        horizonte_meses: horizonteMeses,
        status: "pendente",
        solicitado_por: userId,
      })
      .select("id")
      .single();

    if (insertError || !execucao) {
      return jsonResponse(
        { error: `Falha ao registrar execucao: ${insertError?.message}` },
        500
      );
    }

    // 2) Dispara o workflow no GitHub Actions, passando o id da execucao
    //    para o workflow saber em qual linha gravar o resultado depois.
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    const githubRepo = Deno.env.get("GITHUB_REPO") ?? "julinTec/hub-governanca-sefin";
    const workflowFile = Deno.env.get("GITHUB_WORKFLOW_FILE") ?? "previsao.yml";

    if (!githubToken) {
      return jsonResponse({ error: "GITHUB_TOKEN nao configurado nos secrets da function" }, 500);
    }

    const dispatchResp = await fetch(
      `https://api.github.com/repos/${githubRepo}/actions/workflows/${workflowFile}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            alvo,
            variaveis: variaveisExogenas.join(","),
            meses_teste: String(mesesTeste),
            base_path: basePath,
            execucao_id: execucao.id,
          },
        }),
      }
    );

    if (!dispatchResp.ok) {
      const detalhe = await dispatchResp.text();
      // Marca a execucao como erro pra nao ficar "pendente" pra sempre
      await supabaseUser
        .from("previsao_execucoes")
        .update({ status: "erro", erro: `GitHub dispatch falhou: ${detalhe}` })
        .eq("id", execucao.id);
      return jsonResponse(
        { error: `Falha ao disparar o workflow no GitHub: ${detalhe}` },
        502
      );
    }

    return jsonResponse({ execucao_id: execucao.id, status: "pendente" });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
