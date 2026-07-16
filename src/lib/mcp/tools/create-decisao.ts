import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "create_decisao",
  title: "Registrar Decisão",
  description: "Cria uma nova decisão no Hub de Governança em nome do usuário autenticado.",
  inputSchema: {
    tema: z.string().min(1),
    decisao: z.string().optional(),
    justificativa: z.string().optional(),
    impacto: z.string().optional(),
    responsavel: z.string().optional(),
    data: z.string().optional().describe("Data no formato ISO (YYYY-MM-DD)"),
    status: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    const { data, error } = await sb(ctx)
      .from("decisoes")
      .insert({ ...input, user_id: ctx.getUserId() })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Decisão criada: ${data.id}` }], structuredContent: { decisao: data } };
  },
});
