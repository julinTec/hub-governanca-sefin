// API publica (sem autenticacao, mesmo padrao da okr-public-api) que expoe
// o "resumo_estudo" da ultima execucao concluida do motor de previsao de
// arrecadacao - pensada pra consumo direto no Power BI ou outra ferramenta
// de BI, sem precisar entender o JSON tecnico completo (series dia a dia,
// coeficientes do SARIMAX, ACF/PACF etc.), que fica disponivel em
// `detalhe_categorias` pra quem quiser o nivel de detalhe.
//
// resumo_estudo e calculado dentro do proprio scripts/forecast.py
// (funcao montar_resumo_estudo) e gravado junto do resto do resultado em
// previsao_execucoes.resultado - esta function so busca a ultima execucao
// concluida e devolve o resumo (+ opcionalmente o detalhe, via ?detalhe=1).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: execucao, error } = await supabase
      .from("previsao_execucoes")
      .select("id, created_at, concluido_em, meses_teste, horizonte_meses, resultado")
      .eq("status", "concluido")
      .order("concluido_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!execucao || !execucao.resultado) {
      return new Response(
        JSON.stringify({ error: "Nenhuma execucao concluida encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resultado = execucao.resultado as Record<string, unknown>;
    const url = new URL(req.url);
    const incluirDetalhe = url.searchParams.get("detalhe") === "1";

    const payload: Record<string, unknown> = {
      execucao_id: execucao.id,
      disparada_em: execucao.created_at,
      concluida_em: execucao.concluido_em,
      meses_teste: execucao.meses_teste,
      horizonte_meses: execucao.horizonte_meses,
      resumo: resultado.resumo_estudo ?? null,
    };

    if (incluirDetalhe) {
      payload.detalhe_categorias = resultado.categorias ?? null;
    }

    return new Response(JSON.stringify(payload, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
