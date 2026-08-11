import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { withRetry } from '@/lib/supabaseWithRetry';

export interface SrRo {
  id: string;
  external_id: string;
  sydle_id: string | null;
  numero: number | null;
  titulo: string | null;
  solicitante: string | null;
  subprojeto: string | null;
  epic_id: string | null;
  epic_external_id: string | null;
  epico_nome: string | null;
  status: string | null;
  status_key: string;
  status_ordem: number | null;
  tipo: string | null;
  tipo_validacao: string | null;
  prioridade: string | null;
  prioridade_nota: number | null;
  prioritario: boolean;
  urgencia: string | null;
  urgencia_nivel: number | null;
  impacto: string | null;
  impacto_nivel: number | null;
  grau: number | null;
  esforco: number | null;
  tempo_estimado_horas: number | null;
  previsao_atendimento: string | null;
  sydle_url: string | null;
  is_present_current_import: boolean;
  first_seen_at: string;
  last_seen_at: string;
}

export interface SrOs {
  id: string;
  external_id: string;
  numero: number | null;
  titulo: string | null;
  tipo_os: string | null;
  subprojeto: string | null;
  solicitante: string | null;
  responsavel: string | null;
  status_atual: string | null;
  status_canonico: string | null;
  status_id: string | null;
  status_ordem: number | null;
  quantidade_esforco: number | null;
  quantidade_esforco_fmt: string | null;
  valor_esforco_fmt: string | null;
  quantidade_executada: number | null;
  valor_executado_fmt: string | null;
  data_prevista_homologacao: string | null;
  data_homologacao: string | null;
  sydle_url: string | null;
  is_present_current_import: boolean;
  raw_data: any;
}

export interface SrEpic {
  id: string;
  source: string;
  external_id: string;
  key: string | null;
  titulo: string | null;
  modulo: string | null;
  component: string | null;
  status: string | null;
  numero_os: number | null;
  raw_data: any;
}

export interface SrImport {
  id: string;
  filename: string;
  file_hash: string;
  imported_at: string;
  imported_by_email: string | null;
  source_generated_at: string | null;
  total_ros: number;
  total_oss: number;
  total_epics: number;
  new_ros: number;
  changed_ros: number;
  unchanged_ros: number;
  missing_ros: number;
  returned_ros: number;
  status: string;
  duration_ms: number | null;
  previous_import_id: string | null;
}

export function useStatusReport() {
  const [loading, setLoading] = useState(true);
  const [ros, setRos] = useState<SrRo[]>([]);
  const [oss, setOss] = useState<SrOs[]>([]);
  const [epics, setEpics] = useState<SrEpic[]>([]);
  const [imports, setImports] = useState<SrImport[]>([]);
  const [prevStatusCounts, setPrevStatusCounts] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [rosRes, ossRes, epicsRes, impRes] = await Promise.all([
        withRetry(() => Promise.resolve(supabase.from('status_report_ros').select('*').order('numero', { ascending: true }))),
        withRetry(() => Promise.resolve(supabase.from('status_report_oss').select('*').order('numero', { ascending: true }))),
        withRetry(() => Promise.resolve(supabase.from('status_report_epics').select('*'))),
        withRetry(() => Promise.resolve(
          supabase.from('status_report_imports').select('*').order('imported_at', { ascending: false }).limit(50),
        )),
      ]);
      setRos((rosRes.data as any) || []);
      setOss((ossRes.data as any) || []);
      setEpics((epicsRes.data as any) || []);
      const imps = ((impRes.data as any) || []) as SrImport[];
      setImports(imps);

      const completed = imps.filter((i) => i.status === 'completed');
      const prev = completed[1];
      if (prev) {
        const { data } = await supabase
          .from('status_report_ro_snapshots')
          .select('status_key')
          .eq('import_id', prev.id);
        const counts: Record<string, number> = {};
        for (const r of (data as any[]) || []) counts[r.status_key] = (counts[r.status_key] || 0) + 1;
        setPrevStatusCounts(counts);
      } else {
        setPrevStatusCounts(null);
      }
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar os dados do Status Report.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(true);
  }, [fetchAll]);

  const completedImports = imports.filter((i) => i.status === 'completed');

  return {
    loading,
    error,
    ros,
    oss,
    epics,
    imports,
    latestImport: completedImports[0] ?? null,
    previousImport: completedImports[1] ?? null,
    prevStatusCounts,
    refresh: fetchAll,
  };
}

export interface RoHistoryEntry {
  import_id: string;
  imported_at: string;
  source_generated_at: string | null;
  status: string | null;
  prioridade: string | null;
  impacto: string | null;
  esforco: number | null;
  grau: number | null;
}

export async function fetchRoHistory(roId: string): Promise<RoHistoryEntry[]> {
  const { data } = await supabase
    .from('status_report_ro_snapshots')
    .select('import_id, status, prioridade, impacto, esforco, grau, status_report_imports(imported_at, source_generated_at)')
    .eq('ro_id', roId)
    .order('snapshot_at', { ascending: true });
  return ((data as any[]) || []).map((r) => ({
    import_id: r.import_id,
    imported_at: r.status_report_imports?.imported_at,
    source_generated_at: r.status_report_imports?.source_generated_at ?? null,
    status: r.status,
    prioridade: r.prioridade,
    impacto: r.impacto,
    esforco: r.esforco,
    grau: r.grau,
  }));
}

export async function fetchOsHistory(osId: string) {
  const { data } = await supabase
    .from('status_report_os_snapshots')
    .select('import_id, status_atual, status_canonico, responsavel, quantidade_esforco, data_homologacao, status_report_imports(imported_at, source_generated_at)')
    .eq('os_id', osId)
    .order('snapshot_at', { ascending: true });
  return ((data as any[]) || []).map((r) => ({
    import_id: r.import_id,
    imported_at: r.status_report_imports?.imported_at,
    status_atual: r.status_atual,
    status_canonico: r.status_canonico,
    responsavel: r.responsavel,
    quantidade_esforco: r.quantidade_esforco,
    data_homologacao: r.data_homologacao,
  }));
}

export async function fetchImportDetail(importId: string) {
  const [logs, changes] = await Promise.all([
    supabase.from('status_report_import_logs').select('*').eq('import_id', importId).order('created_at', { ascending: true }),
    supabase
      .from('status_report_ro_changes')
      .select('*, status_report_ros(numero, titulo)')
      .eq('import_id', importId)
      .order('created_at', { ascending: true })
      .limit(1000),
  ]);
  return { logs: (logs.data as any[]) || [], changes: (changes.data as any[]) || [] };
}
