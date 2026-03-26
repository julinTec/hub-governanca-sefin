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

    // Nest: acoes into key_results, key_results into objetivos
    const krWithAcoes = (keyResults || []).map((kr) => ({
      ...kr,
      acoes: (acoes || []).filter((a) => a.key_result_id === kr.id),
    }));

    const result = (objetivos || []).map((obj) => ({
      ...obj,
      key_results: krWithAcoes.filter((kr) => kr.objetivo_id === obj.id),
    }));

    return new Response(JSON.stringify({ objetivos: result }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
