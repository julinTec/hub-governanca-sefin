import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { sbForUser } from "./_supabase";

export default defineTool({
  name: "list_objetivos",
  title: "Listar Objetivos (OKR)",
  description: "Lista os objetivos OKR do usuário autenticado, opcionalmente filtrando por ciclo.",
  inputSchema: {
    ciclo: z.string().optional().describe("Ciclo/período do OKR, ex: '2026.1'"),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ ciclo, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    let q = sbForUser(ctx).from("okr_objetivos").select("*").order("created_at", { ascending: false }).limit(limit ?? 50);
    if (ciclo) q = q.eq("ciclo", ciclo);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { objetivos: data } };
  },
});
