// API usada pela tela publica /publico/:token (sem login). Diferente da
// okr-public-api/previsao-public-api (totalmente publicas, sem segredo),
// esta exige um token valido - o mesmo gerado pelo admin na tela "Link
// Publico" (tabela public_share_link, linha unica), que da acesso de
// LEITURA aos dados de OKR e de Previsao de Arrecadacao - ou o token do
// "link de colaboracao" (tabela public_collab_link), que da a mesma leitura
// e, alem disso, permite REGISTRAR Notas Explicativas da Arrecadacao. Essa e
// a unica escrita possivel aqui: nao ha rota pra editar nem excluir nada.
//
// Uso: GET ?token=<token>&recurso=validar   -> { valido, pode_registrar }
//      GET ?token=<token>&recurso=notas
//      POST ?token=<token>&recurso=registrar-nota   (so link de colaboracao; corpo JSON)
//      GET ?token=<token>&recurso=okrs
//      GET ?token=<token>&recurso=previsao-lista
//      GET ?token=<token>&recurso=previsao-detalhe&execucao_id=<uuid>
//      GET ?token=<token>&recurso=serie-real

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const CATEGORIAS = ["Geral", "Judicial", "Extra Judicial", "Rendimento"];
const EFEITOS = ["aumento", "reducao", "neutro"];
const NATUREZAS = ["pontual", "recorrente"];
const COLUNAS_NOTA =
  "id, periodo_inicio, periodo_fim, categoria, efeito, natureza, impacto_estimado, titulo, descricao, autor_nome, autor_coordenadoria, origem, created_at, updated_at";

function texto(v: unknown, min: number, max: number, campo: string): string {
  const t = typeof v === "string" ? v.trim() : "";
  if (t.length < min || t.length > max) throw new ErroValidacao(`Campo '${campo}' deve ter entre ${min} e ${max} caracteres`);
  return t;
}

/** "2026-06" ou "2026-06-01" -> "2026-06-01" (sempre o 1o dia do mes). */
function mes(v: unknown, campo: string): string {
  const m = typeof v === "string" ? v.match(/^(\d{4})-(\d{2})/) : null;
  const ano = m ? Number(m[1]) : NaN;
  const mm = m ? Number(m[2]) : NaN;
  if (!m || ano < 2000 || ano > 2100 || mm < 1 || mm > 12) throw new ErroValidacao(`Campo '${campo}' deve ser um mes no formato AAAA-MM`);
  return `${m[1]}-${m[2]}-01`;
}

class ErroValidacao extends Error {}

function validarNota(corpo: Record<string, unknown>) {
  const periodo_inicio = mes(corpo.periodo_inicio, "periodo_inicio");
  const periodo_fim = corpo.periodo_fim ? mes(corpo.periodo_fim, "periodo_fim") : null;
  if (periodo_fim && periodo_fim < periodo_inicio) throw new ErroValidacao("O fim do periodo nao pode ser antes do inicio");
  const categoria = String(corpo.categoria ?? "Geral");
  if (!CATEGORIAS.includes(categoria)) throw new ErroValidacao("Categoria invalida");
  const efeito = String(corpo.efeito ?? "");
  if (!EFEITOS.includes(efeito)) throw new ErroValidacao("Efeito invalido");
  const natureza = String(corpo.natureza ?? "");
  if (!NATUREZAS.includes(natureza)) throw new ErroValidacao("Natureza invalida");
  let impacto_estimado: number | null = null;
  if (corpo.impacto_estimado !== null && corpo.impacto_estimado !== undefined && corpo.impacto_estimado !== "") {
    impacto_estimado = Number(corpo.impacto_estimado);
    if (!Number.isFinite(impacto_estimado) || Math.abs(impacto_estimado) > 1e10) throw new ErroValidacao("Impacto estimado invalido");
  }
  return {
    periodo_inicio,
    periodo_fim: periodo_fim === periodo_inicio ? null : periodo_fim,
    categoria,
    efeito,
    natureza,
    impacto_estimado,
    titulo: texto(corpo.titulo, 3, 140, "titulo"),
    descricao: texto(corpo.descricao, 3, 4000, "descricao"),
    autor_nome: texto(corpo.autor_nome, 2, 120, "autor_nome"),
    autor_coordenadoria: texto(corpo.autor_coordenadoria, 2, 160, "autor_coordenadoria"),
    origem: "link_colaboracao",
  };
}

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

    // Valida o token contra as linhas unicas de public_share_link (leitura)
    // e public_collab_link (leitura + registrar notas). Usa service role
    // aqui dentro (RLS das tabelas so permite admin autenticado) - essa
    // checagem e o unico guardiao do acesso publico.
    const { data: link, error: linkError } = await supabase
      .from("public_share_link")
      .select("token, ativo")
      .eq("id", true)
      .maybeSingle();
    if (linkError) throw linkError;

    // Tabela do link de colaboracao pode nao existir ainda (migration de
    // 18/11 nao aplicada): ai so o link de leitura vale.
    const { data: colab, error: colabError } = await supabase
      .from("public_collab_link")
      .select("token, ativo")
      .eq("id", true)
      .maybeSingle();
    if (colabError) console.warn("public_collab_link indisponivel:", colabError.message);

    const ehColaboracao = !!colab && colab.ativo && colab.token === token;
    const ehLeitura = !!link && link.ativo && link.token === token;

    if (!ehColaboracao && !ehLeitura) {
      return jsonResponse({ error: "Link invalido ou desativado" }, 403);
    }

    if (recurso === "validar") {
      return jsonResponse({ valido: true, pode_registrar: ehColaboracao });
    }

    if (recurso === "notas") {
      const { data, error } = await supabase
        .from("notas_arrecadacao")
        .select(COLUNAS_NOTA)
        .order("periodo_inicio", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) {
        // tabela ainda nao criada: responde vazio em vez de quebrar a tela
        if (/notas_arrecadacao/.test(error.message)) return jsonResponse({ notas: [], indisponivel: true });
        throw error;
      }
      return jsonResponse({ notas: data || [] });
    }

    if (recurso === "registrar-nota") {
      if (req.method !== "POST") return jsonResponse({ error: "Use POST" }, 405);
      if (!ehColaboracao) {
        return jsonResponse({ error: "Este link é só de leitura. Para registrar notas, use o link de colaboração." }, 403);
      }
      const corpo = await req.json().catch(() => null);
      if (!corpo || typeof corpo !== "object") return jsonResponse({ error: "Corpo JSON invalido" }, 400);

      let nota;
      try {
        nota = validarNota(corpo as Record<string, unknown>);
      } catch (e) {
        if (e instanceof ErroValidacao) return jsonResponse({ error: e.message }, 400);
        throw e;
      }

      // Freio simples contra abuso do link: no maximo 30 notas em 10 min.
      const desde = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count, error: errCount } = await supabase
        .from("notas_arrecadacao")
        .select("id", { count: "exact", head: true })
        .eq("origem", "link_colaboracao")
        .gte("created_at", desde);
      if (errCount) throw errCount;
      if ((count ?? 0) >= 30) {
        return jsonResponse({ error: "Muitas notas registradas em pouco tempo. Tente de novo em alguns minutos." }, 429);
      }

      const { data, error } = await supabase.from("notas_arrecadacao").insert(nota).select(COLUNAS_NOTA).single();
      if (error) throw error;
      return jsonResponse({ nota: data }, 201);
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

    // Realizado mensal por categoria (aba Consolidado importada em
    // "Importar dados"), pra aba Real x Previsto da tela publica.
    if (recurso === "serie-real") {
      const buscar = (colunas: string) =>
        supabase.from("previsao_serie_historica").select(colunas).gte("data", "2025-01-01").order("data", { ascending: true });
      let { data, error } = await buscar("data, tipo_judicial, tipo_extra_judicial, tipo_rendimento, extra_judicial_restituicao");
      // banco ainda sem a coluna da restituicao (migration de 13/11): busca sem ela
      if (error && /extra_judicial_restituicao/.test(error.message)) {
        ({ data, error } = await buscar("data, tipo_judicial, tipo_extra_judicial, tipo_rendimento"));
      }
      if (error) throw error;
      return jsonResponse({ serie: data || [] });
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

    return jsonResponse({ error: "Parametro 'recurso' invalido (use okrs, previsao-lista, previsao-detalhe, serie-real, notas ou registrar-nota)" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});
