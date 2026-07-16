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
  name: "list_key_results",
  title: "Listar Key Results",
  description: "Lista Key Results, opcionalmente filtrando por objetivo, líder ou equipe.",
  inputSchema: {
    objetivo_id: z.string().uuid().optional(),
    lider: z.string().optional(),
    equipe: z.string().optional(),
    limit: z.number().int().min(1).max(500).optional(),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ objetivo_id, lider, equipe, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    let q = sb(ctx).from("okr_key_results").select("*").limit(limit ?? 100);
    if (objetivo_id) q = q.eq("objetivo_id", objetivo_id);
    if (lider) q = q.ilike("lider", `%${lider}%`);
    if (equipe) q = q.ilike("equipe", `%${equipe}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { key_results: data } };
  },
});
