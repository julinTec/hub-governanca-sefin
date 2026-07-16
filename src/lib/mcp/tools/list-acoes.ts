import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { sbForUser } from "./_supabase";

export default defineTool({
  name: "list_acoes",
  title: "Listar Ações de KR",
  description: "Lista ações do plano de KR, filtráveis por key_result_id, responsável ou status.",
  inputSchema: {
    key_result_id: z.string().uuid().optional(),
    responsavel: z.string().optional(),
    status: z.string().optional().describe("Ex: 'A iniciar', 'Em andamento', 'Concluído', 'Atrasado'"),
    limit: z.number().int().min(1).max(500).optional(),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ key_result_id, responsavel, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    let q = sbForUser(ctx).from("okr_acoes").select("*").order("numero", { ascending: true }).limit(limit ?? 200);
    if (key_result_id) q = q.eq("key_result_id", key_result_id);
    if (responsavel) q = q.ilike("responsavel", `%${responsavel}%`);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { acoes: data } };
  },
});
