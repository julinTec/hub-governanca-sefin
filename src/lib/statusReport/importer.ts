/**
 * STATUS REPORT — Importador.
 *
 * Fluxo: hash -> duplicidade -> parse -> validação -> comparação -> preview
 *        -> confirmação do usuário -> persistência (estado atual + snapshots + changes).
 *
 * Regras de integridade:
 * - Nada é deletado. RO ausente vira is_present_current_import = false.
 * - Snapshots anteriores nunca são sobrescritos (unique ro_id + import_id).
 * - Mesmo arquivo (hash) não pode gerar segunda carga.
 */

import { supabase } from '@/integrations/supabase/client';
import { hashFileContent, parseStatusReportHtml, ParseError, type ParsedRo, type ParsedSnapshot } from './parser';
import { getRoStatusDef } from './config';

export type ImportStage = 'upload' | 'parse' | 'validation' | 'comparison' | 'persistence' | 'snapshot' | 'completion';

export interface StatusTransition {
  from: string;
  to: string;
  count: number;
}

export interface ImportPreview {
  filename: string;
  fileSize: number;
  fileHash: string;
  parsed: ParsedSnapshot;
  previousImport: { id: string; imported_at: string; filename: string } | null;
  totals: { ros: number; oss: number; epics: number };
  diff: {
    newRos: ParsedRo[];
    changedRos: { ro: ParsedRo; changes: FieldChange[] }[];
    unchangedCount: number;
    missingRos: { id: string; external_id: string; numero: number | null; titulo: string | null }[];
    returnedRos: ParsedRo[];
    statusTransitions: StatusTransition[];
  };
  statusDistribution: { key: string; label: string; count: number }[];
  warnings: string[];
}

export interface FieldChange {
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  change_type: string;
}

export class DuplicateImportError extends Error {
  constructor(public importedAt: string) {
    super('Este arquivo já foi importado.');
  }
}

const COMPARED_FIELDS: { field: keyof ParsedRo; changeType: string }[] = [
  { field: 'status', changeType: 'status_changed' },
  { field: 'prioridade', changeType: 'priority_changed' },
  { field: 'prioridade_nota', changeType: 'priority_changed' },
  { field: 'prioritario', changeType: 'priority_changed' },
  { field: 'impacto', changeType: 'impact_changed' },
  { field: 'urgencia', changeType: 'updated' },
  { field: 'grau', changeType: 'updated' },
  { field: 'esforco', changeType: 'effort_changed' },
  { field: 'tempo_estimado_horas', changeType: 'effort_changed' },
  { field: 'previsao_atendimento', changeType: 'updated' },
  { field: 'epico_nome', changeType: 'updated' },
  { field: 'tipo_validacao', changeType: 'updated' },
];

const norm = (v: unknown): string | null => {
  if (v === null || v === undefined || v === '') return null;
  return String(v);
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/* ------------------------------------------------------------------ */
/* PREVIEW                                                            */
/* ------------------------------------------------------------------ */

export async function prepareImport(file: File): Promise<ImportPreview> {
  const text = await file.text();
  const fileHash = await hashFileContent(text);

  // duplicidade
  const { data: dup } = await supabase
    .from('status_report_imports')
    .select('id, imported_at, status')
    .eq('file_hash', fileHash)
    .neq('status', 'failed')
    .maybeSingle();
  if (dup) throw new DuplicateImportError(dup.imported_at as string);

  const parsed = parseStatusReportHtml(text);

  const { data: prev } = await supabase
    .from('status_report_imports')
    .select('id, imported_at, filename')
    .eq('status', 'completed')
    .order('imported_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: existing } = await supabase
    .from('status_report_ros')
    .select(
      'id, external_id, numero, titulo, status, prioridade, prioridade_nota, prioritario, impacto, urgencia, grau, esforco, tempo_estimado_horas, previsao_atendimento, epico_nome, tipo_validacao, is_present_current_import',
    );

  const existingMap = new Map((existing || []).map((r: any) => [r.external_id as string, r]));
  const incomingIds = new Set(parsed.ros.map((r) => r.external_id));

  const newRos: ParsedRo[] = [];
  const changedRos: { ro: ParsedRo; changes: FieldChange[] }[] = [];
  const returnedRos: ParsedRo[] = [];
  const transitions = new Map<string, number>();
  let unchangedCount = 0;

  for (const ro of parsed.ros) {
    const old = existingMap.get(ro.external_id);
    if (!old) {
      newRos.push(ro);
      continue;
    }
    if (old.is_present_current_import === false) returnedRos.push(ro);
    const changes: FieldChange[] = [];
    for (const { field, changeType } of COMPARED_FIELDS) {
      const o = norm((old as any)[field]);
      const nw = norm(ro[field] as any);
      if (o !== nw) changes.push({ field_name: String(field), old_value: o, new_value: nw, change_type: changeType });
    }
    if (changes.length) {
      changedRos.push({ ro, changes });
      const st = changes.find((c) => c.field_name === 'status');
      if (st) {
        const key = `${st.old_value ?? '—'}||${st.new_value ?? '—'}`;
        transitions.set(key, (transitions.get(key) || 0) + 1);
      }
    } else if (old.is_present_current_import !== false) {
      unchangedCount++;
    }
  }

  const missingRos = (existing || [])
    .filter((r: any) => !incomingIds.has(r.external_id) && r.is_present_current_import !== false)
    .map((r: any) => ({ id: r.id, external_id: r.external_id, numero: r.numero, titulo: r.titulo }));

  const distMap = new Map<string, number>();
  for (const ro of parsed.ros) distMap.set(ro.status_key, (distMap.get(ro.status_key) || 0) + 1);
  const statusDistribution = Array.from(distMap.entries())
    .map(([key, count]) => ({ key, label: getRoStatusDef(key).label, count }))
    .sort((a, b) => getRoStatusDef(a.key).ordem - getRoStatusDef(b.key).ordem);

  return {
    filename: file.name,
    fileSize: file.size,
    fileHash,
    parsed,
    previousImport: prev ? { id: prev.id as string, imported_at: prev.imported_at as string, filename: prev.filename as string } : null,
    totals: { ros: parsed.ros.length, oss: parsed.oss.length, epics: parsed.epics.length },
    diff: {
      newRos,
      changedRos,
      unchangedCount,
      missingRos,
      returnedRos,
      statusTransitions: Array.from(transitions.entries())
        .map(([k, count]) => ({ from: k.split('||')[0], to: k.split('||')[1], count }))
        .sort((a, b) => b.count - a.count),
    },
    statusDistribution,
    warnings: parsed.warnings,
  };
}

/* ------------------------------------------------------------------ */
/* COMMIT                                                             */
/* ------------------------------------------------------------------ */

export interface CommitResult {
  importId: string;
  totals: ImportPreview['totals'];
  durationMs: number;
}

export async function commitImport(
  preview: ImportPreview,
  onProgress?: (stage: ImportStage, message: string) => void,
): Promise<CommitResult> {
  const started = Date.now();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');

  const logs: { level: string; stage: ImportStage; message: string; details?: any }[] = [];
  const log = (level: string, stage: ImportStage, message: string, details?: any) => {
    logs.push({ level, stage, message, details });
    onProgress?.(stage, message);
  };

  const { data: imp, error: impErr } = await supabase
    .from('status_report_imports')
    .insert({
      filename: preview.filename,
      file_hash: preview.fileHash,
      file_size: preview.fileSize,
      imported_by: user.id,
      imported_by_email: user.email,
      source_generated_at: preview.parsed.generatedAt,
      project_key: preview.parsed.projectKey,
      total_ros: preview.totals.ros,
      total_oss: preview.totals.oss,
      total_epics: preview.totals.epics,
      new_ros: preview.diff.newRos.length,
      changed_ros: preview.diff.changedRos.length,
      unchanged_ros: preview.diff.unchangedCount,
      missing_ros: preview.diff.missingRos.length,
      returned_ros: preview.diff.returnedRos.length,
      status: 'processing',
      previous_import_id: preview.previousImport?.id ?? null,
      metadata: preview.parsed.meta as any,
    })
    .select('id')
    .single();

  if (impErr || !imp) {
    if (impErr?.code === '23505' || impErr?.code === '23514' || impErr?.message?.includes('duplicate')) {
      throw new DuplicateImportError(new Date().toISOString());
    }
    throw new Error(impErr?.message || 'Não foi possível registrar a importação.');
  }
  const importId = imp.id as string;

  const flushLogs = async () => {
    if (!logs.length) return;
    const rows = logs.map((l) => ({
      import_id: importId,
      level: l.level,
      stage: l.stage,
      message: l.message,
      details: l.details ?? {},
    }));
    logs.length = 0;
    await supabase.from('status_report_import_logs').insert(rows);
  };

  try {
    log('info', 'upload', `Arquivo "${preview.filename}" recebido (${preview.fileSize} bytes).`);
    log('info', 'parse', `Snapshot interpretado: ${preview.totals.ros} ROs, ${preview.totals.oss} OSs, ${preview.totals.epics} épicos.`);
    for (const w of preview.warnings.slice(0, 200)) log('warning', 'validation', w);
    log('info', 'comparison', preview.previousImport
      ? `Comparado com a importação anterior de ${new Date(preview.previousImport.imported_at).toLocaleString('pt-BR')}.`
      : 'Primeira carga — não há importação anterior para comparação.');

    const now = new Date().toISOString();

    /* ---- ÉPICOS ---- */
    log('info', 'persistence', 'Gravando épicos...');
    for (const part of chunk(preview.parsed.epics, 200)) {
      const { error } = await supabase.from('status_report_epics').upsert(
        part.map((e) => ({
          source: e.source,
          external_id: e.external_id,
          key: e.key,
          titulo: e.titulo,
          modulo: e.modulo,
          component: e.component,
          status: e.status,
          numero_os: e.numero_os,
          raw_data: e.raw_data,
          last_seen_import_id: importId,
          last_seen_at: now,
        })),
        { onConflict: 'source,external_id' },
      );
      if (error) throw error;
    }
    const { data: epicRows } = await supabase.from('status_report_epics').select('id, source, external_id');
    const epicIdByExternal = new Map<string, string>();
    for (const e of epicRows || []) epicIdByExternal.set(`${e.source}:${e.external_id}`, e.id as string);
    await supabase
      .from('status_report_epics')
      .update({ first_seen_import_id: importId })
      .is('first_seen_import_id', null);

    /* ---- OSs ---- */
    log('info', 'persistence', 'Gravando OSs...');
    for (const part of chunk(preview.parsed.oss, 200)) {
      const { error } = await supabase.from('status_report_oss').upsert(
        part.map((o) => ({
          external_id: o.external_id,
          numero: o.numero,
          titulo: o.titulo,
          tipo_os: o.tipo_os,
          subprojeto: o.subprojeto,
          solicitante: o.solicitante,
          responsavel: o.responsavel,
          status_atual: o.status_atual,
          status_canonico: o.status_canonico,
          status_id: o.status_id,
          status_ordem: o.status_ordem,
          status_contratada: o.status_contratada,
          status_desconhecido: o.status_desconhecido,
          quantidade_esforco: o.quantidade_esforco,
          quantidade_esforco_fmt: o.quantidade_esforco_fmt,
          valor_esforco_fmt: o.valor_esforco_fmt,
          quantidade_executada: o.quantidade_executada,
          quantidade_executada_fmt: o.quantidade_executada_fmt,
          valor_executado_fmt: o.valor_executado_fmt,
          data_prevista_homologacao: o.data_prevista_homologacao,
          data_homologacao: o.data_homologacao,
          sydle_url: o.sydle_url,
          raw_data: o.raw_data,
          last_seen_import_id: importId,
          last_seen_at: now,
          is_present_current_import: true,
        })),
        { onConflict: 'external_id' },
      );
      if (error) throw error;
    }
    const { data: osRows } = await supabase.from('status_report_oss').select('id, external_id');
    const osIdByExternal = new Map((osRows || []).map((o: any) => [o.external_id as string, o.id as string]));
    const incomingOsIds = preview.parsed.oss.map((o) => o.external_id);
    if (incomingOsIds.length) {
      await supabase
        .from('status_report_oss')
        .update({ is_present_current_import: false })
        .not('external_id', 'in', `(${incomingOsIds.map((x) => `"${x}"`).join(',')})`);
    }
    await supabase.from('status_report_oss').update({ first_seen_import_id: importId }).is('first_seen_import_id', null);

    /* ---- ROs ---- */
    log('info', 'persistence', 'Gravando ROs...');
    for (const part of chunk(preview.parsed.ros, 300)) {
      const { error } = await supabase.from('status_report_ros').upsert(
        part.map((r) => ({
          external_id: r.external_id,
          sydle_id: r.sydle_id,
          numero: r.numero,
          titulo: r.titulo,
          solicitante: r.solicitante,
          subprojeto: r.subprojeto,
          epic_id: r.epic_external_id ? epicIdByExternal.get(`sydle:${r.epic_external_id}`) ?? null : null,
          epic_external_id: r.epic_external_id,
          epico_nome: r.epico_nome,
          status: r.status,
          status_key: r.status_key,
          status_ordem: r.status_ordem,
          tipo: r.tipo,
          tipo_key: r.tipo_key,
          tipo_validacao: r.tipo_validacao,
          prioridade: r.prioridade,
          prioridade_nota: r.prioridade_nota,
          prioritario: r.prioritario,
          urgencia: r.urgencia,
          urgencia_nivel: r.urgencia_nivel,
          impacto: r.impacto,
          impacto_nivel: r.impacto_nivel,
          grau: r.grau,
          esforco: r.esforco,
          tempo_estimado_horas: r.tempo_estimado_horas,
          previsao_atendimento: r.previsao_atendimento,
          sydle_url: r.sydle_url,
          raw_data: r.raw_data,
          last_seen_import_id: importId,
          last_seen_at: now,
          is_present_current_import: true,
        })),
        { onConflict: 'external_id' },
      );
      if (error) throw error;
    }
    await supabase.from('status_report_ros').update({ first_seen_import_id: importId }).is('first_seen_import_id', null);

    const { data: roRows } = await supabase.from('status_report_ros').select('id, external_id');
    const roIdByExternal = new Map((roRows || []).map((r: any) => [r.external_id as string, r.id as string]));

    /* ---- AUSENTES (nunca deletar) ---- */
    if (preview.diff.missingRos.length) {
      for (const part of chunk(preview.diff.missingRos.map((m) => m.id), 200)) {
        await supabase.from('status_report_ros').update({ is_present_current_import: false }).in('id', part);
      }
      log('warning', 'persistence', `${preview.diff.missingRos.length} ROs não vieram nesta carga e foram marcadas como ausentes (nenhum registro apagado).`);
    }

    /* ---- SNAPSHOTS ---- */
    log('info', 'snapshot', 'Criando snapshots do período...');
    const snapRows = preview.parsed.ros.map((r) => ({
      ro_id: roIdByExternal.get(r.external_id)!,
      import_id: importId,
      status: r.status,
      status_key: r.status_key,
      status_ordem: r.status_ordem,
      prioridade: r.prioridade,
      prioridade_nota: r.prioridade_nota,
      prioritario: r.prioritario,
      urgencia: r.urgencia,
      impacto: r.impacto,
      grau: r.grau,
      esforco: r.esforco,
      tempo_estimado_horas: r.tempo_estimado_horas,
      previsao_atendimento: r.previsao_atendimento,
      epic_id: r.epic_external_id ? epicIdByExternal.get(`sydle:${r.epic_external_id}`) ?? null : null,
      epico_nome: r.epico_nome,
      tipo: r.tipo,
      tipo_validacao: r.tipo_validacao,
      is_present: true,
      raw_data: r.raw_data,
    })).filter((s) => s.ro_id);
    for (const part of chunk(snapRows, 300)) {
      const { error } = await supabase.from('status_report_ro_snapshots').upsert(part, { onConflict: 'ro_id,import_id' });
      if (error) throw error;
    }

    const osSnapRows = preview.parsed.oss.map((o) => ({
      os_id: osIdByExternal.get(o.external_id)!,
      import_id: importId,
      status_atual: o.status_atual,
      status_canonico: o.status_canonico,
      status_ordem: o.status_ordem,
      responsavel: o.responsavel,
      quantidade_esforco: o.quantidade_esforco,
      quantidade_executada: o.quantidade_executada,
      data_prevista_homologacao: o.data_prevista_homologacao,
      data_homologacao: o.data_homologacao,
      raw_data: o.raw_data,
    })).filter((s) => s.os_id);
    for (const part of chunk(osSnapRows, 200)) {
      const { error } = await supabase.from('status_report_os_snapshots').upsert(part, { onConflict: 'os_id,import_id' });
      if (error) throw error;
    }

    /* ---- CHANGES ---- */
    const changeRows: any[] = [];
    for (const r of preview.diff.newRos) {
      const id = roIdByExternal.get(r.external_id);
      if (id) changeRows.push({ ro_id: id, import_id: importId, previous_import_id: preview.previousImport?.id ?? null, change_type: 'created', field_name: null, old_value: null, new_value: r.status });
    }
    for (const { ro, changes } of preview.diff.changedRos) {
      const id = roIdByExternal.get(ro.external_id);
      if (!id) continue;
      for (const c of changes) {
        changeRows.push({ ro_id: id, import_id: importId, previous_import_id: preview.previousImport?.id ?? null, ...c });
      }
    }
    for (const r of preview.diff.returnedRos) {
      const id = roIdByExternal.get(r.external_id);
      if (id) changeRows.push({ ro_id: id, import_id: importId, previous_import_id: preview.previousImport?.id ?? null, change_type: 'returned', field_name: null, old_value: null, new_value: r.status });
    }
    for (const m of preview.diff.missingRos) {
      changeRows.push({ ro_id: m.id, import_id: importId, previous_import_id: preview.previousImport?.id ?? null, change_type: 'missing', field_name: null, old_value: null, new_value: null });
    }
    for (const part of chunk(changeRows, 400)) {
      const { error } = await supabase.from('status_report_ro_changes').insert(part);
      if (error) throw error;
    }

    const durationMs = Date.now() - started;
    log('info', 'completion', `Importação concluída em ${(durationMs / 1000).toFixed(1)}s.`);
    await supabase.from('status_report_imports').update({ status: 'completed', duration_ms: durationMs }).eq('id', importId);
    await flushLogs();
    return { importId, totals: preview.totals, durationMs };
  } catch (err: any) {
    log('error', 'persistence', err?.message || 'Falha na persistência da importação.', { code: err?.code });
    await supabase.from('status_report_imports').update({ status: 'failed', duration_ms: Date.now() - started }).eq('id', importId);
    await flushLogs();
    throw err;
  }
}

export { ParseError };
