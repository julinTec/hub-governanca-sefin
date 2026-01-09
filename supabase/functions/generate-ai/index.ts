import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    let systemPrompt = "Você é um assistente de governança institucional da SEFIN. Responda em português brasileiro de forma profissional e objetiva.";
    let userPrompt = "";

    if (type === 'okr-summary') {
      userPrompt = `Gere um resumo executivo dos OKRs abaixo para apresentação em reunião de governança:\n\n${JSON.stringify(data, null, 2)}`;
    } else if (type === 'ata-reuniao') {
      userPrompt = `Gere uma ata formal de reunião com base nas informações abaixo:\n\nTema: ${data.tema}\nData: ${data.data}\nParticipantes: ${data.participantes}\nDecisões: ${data.decisoes}\nResponsáveis: ${data.responsaveis}\nPrazo: ${data.prazo}`;
    } else if (type === 'contrato-text') {
      userPrompt = `Gere um texto formal para envio à SEGOV/CONJUR sobre o contrato abaixo:\n\nNúmero: ${data.numero_contrato}\nObjeto: ${data.objeto}\nEmpresa: ${data.empresa}\nFiscal: ${data.fiscal}\nStatus: ${data.status}`;
    } else {
      userPrompt = `Analise e gere um relatório sobre: ${JSON.stringify(data, null, 2)}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido" }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes" }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      throw new Error("Erro no gateway de IA");
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "Conteúdo gerado com sucesso";

    return new Response(JSON.stringify({ summary: content, ata: content, text: content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
