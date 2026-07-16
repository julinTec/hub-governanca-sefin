import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listObjetivos from "./tools/list-objetivos";
import listKeyResults from "./tools/list-key-results";
import listAcoes from "./tools/list-acoes";
import listReunioes from "./tools/list-reunioes";
import listDecisoes from "./tools/list-decisoes";
import createDecisao from "./tools/create-decisao";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "hub-governanca-sefin-mcp",
  title: "Hub de Governança SEFIN",
  version: "0.1.0",
  instructions:
    "Ferramentas para consultar OKRs (objetivos, key results, ações), reuniões e decisões do Hub de Governança da SEFIN, e registrar novas decisões. Cada chamada age em nome do usuário autenticado e respeita as políticas de acesso (RLS) do sistema.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listObjetivos, listKeyResults, listAcoes, listReunioes, listDecisoes, createDecisao],
});
