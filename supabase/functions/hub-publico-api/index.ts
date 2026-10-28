// API usada pela tela publica /publico/:token (sem login). Diferente da
// okr-public-api/previsao-public-api (totalmente publicas, sem segredo),
// esta exige um token valido - o mesmo gerado pelo admin na tela "Link
// Publico" (tabela public_share_link, linha unica). So da acesso de
// LEITURA aos dados de OKR e de Previsao de Arrecadacao; nenhuma rota de
// escrita existe aqui.
//
// Uso: GET ?token=<token>&recurso=validar
//      GET ?token=<token>&recurso=okrs
//      GET ?token=<token>&recurso=previsao-lista
//      GET ?token=<token>&recurso=previsao-detalhe&execucao_id=<uuid>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const recurso = url.searchParams.get("recurso");

    if (!token) {
      return jsonResponse({ error: "Parametro 'token' obrigatorio" }, 400);
    }

    // Valida o token contra a linha unica de public_share_link. Usa service
    // role aqui dentro (RLS da tabela so permite admin autenticado) - essa
    // checagem e o unico guardiao do acesso publico.
    const { data: link, error: linkError } = await supabase
      .from("public_share_link")
      .select("token, ativo")
      .eq("id", true)
      .maybeSingle();

    if (linkError) throw linkError;

    if (!link || !link.ativo || link.token !== token) {
      return jsonResponse({ error: "Link invalido ou desativado" }, 403);
    }

    if (recurso === "validar") {
      return jsonResponse({ valido: true });
    }

    if (recurso === "okrs") {
      const { data: objetivos, error: errObj } = await supabase
        .from("okr_objetivos")
        .select("*")
        .order("created_at", { ascending: true });
      if (errObj) throw errObj;

      const { data: keyResults, error: errKr } = await supabase
        .from("okr_key_results")
        .select("*")
        .order("codigo", { ascending: true });
      if (errKr) throw errKr;

      const { data: acoes, error: errAcoes } = await supabase
        .from("okr_acoes")
        .select("*")
        .order("numero", { ascending: true });
      if (errAcoes) throw errAcoes;

      const krWithAcoes = (keyResults || []).map((kr) => ({
        ...kr,
        acoes: (acoes || []).filter((a) => a.key_result_id === kr.id),
      }));

      const result = (objetivos || []).map((obj) => ({
        ...obj,
        key_results: krWithAcoes.filter((kr) => kr.objetivo_id === obj.id),
      }));

      return jsonResponse({ objetivos: result });
    }

    if (recurso === "previsao-lista") {
      const { data, error } = await supabase
        .from("previsao_execucoes")
        .select("id, status, meses_teste, horizonte_meses, created_at, concluido_em, erro")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return jsonResponse({ execucoes: data || [] });
    }

    if (recurso === "previsao-detalhe") {
      const execucaoId = url.searchParams.get("execucao_id");
      if (!execucaoId) {
        return jsonResponse({ error: "Parametro 'execucao_id' obrigatorio" }, 400);
      }
      const { data, error } = await supabase
        .from("previsao_execucoes")
        .select("resultado")
        .eq("id", execucaoId)
        .eq("status", "concluido")
        .maybeSingle();
      if (error) throw error;
      if (!data?.resultado) {
        return jsonResponse({ error: "Execucao nao encontrada ou nao concluida" }, 404);
      }
      return jsonResponse({ resultado: data.resultado });
    }

    return jsonResponse({ error: "Parametro 'recurso' invalido (use okrs, previsao-lista ou previsao-detalhe)" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});
