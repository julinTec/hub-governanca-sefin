import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { sbForUser } from "./_supabase";

export default defineTool({
  name: "list_reunioes",
  title: "Listar Reuniões",
  description: "Lista reuniões do usuário autenticado, opcionalmente filtrando por status.",
  inputSchema: {
    status: z.string().optional(),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    let q = sbForUser(ctx).from("reunioes").select("*").order("data", { ascending: false }).limit(limit ?? 50);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { reunioes: data } };
  },
});
