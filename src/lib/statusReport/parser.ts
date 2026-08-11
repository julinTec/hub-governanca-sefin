/**
 * STATUS REPORT — Parser do HTML exportado.
 *
 * SEGURANÇA: o arquivo é tratado exclusivamente como TEXTO.
 * Nenhum script do HTML é executado (sem eval, sem new Function,
 * sem innerHTML, sem iframe). Extraímos o objeto estruturado
 * `window.__SNAPSHOT__` e usamos JSON.parse.
 */

import { extractLevel, normalizeRoStatus } from './config';

const SNAPSHOT_MARKER = 'window.__SNAPSHOT__';

export class ParseError extends Error {}

/** Localiza o fim do literal JSON a partir de um '{' inicial, respeitando strings. */
function findJsonEnd(text: string, start: number): number {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

export interface RawSnapshot {
  generatedAt?: string;
  projectKey?: string;
  frentes?: string[];
  epics?: any[];
  os?: any[];
  ros?: any[];
  subprojetos?: any[];
  reunioes?: any[];
  pendencias?: any[];
  osStatusWorkflow?: any;
  sydleLinks?: any;
  meta?: Record<string, any>;
  [k: string]: any;
}

export function extractSnapshot(html: string): RawSnapshot {
  const idx = html.indexOf(SNAPSHOT_MARKER);
  if (idx < 0) throw new ParseError('Não foi possível localizar o snapshot do Status Report neste arquivo.');
  const eq = html.indexOf('=', idx + SNAPSHOT_MARKER.length);
  if (eq < 0) throw new ParseError('Arquivo incompatível com o formato esperado.');
  const braceStart = html.indexOf('{', eq);
  if (braceStart < 0) throw new ParseError('Arquivo incompatível com o formato esperado.');
  const end = findJsonEnd(html, braceStart);
  if (end < 0) throw new ParseError('O snapshot do Status Report está truncado ou corrompido.');
  let parsed: RawSnapshot;
  try {
    parsed = JSON.parse(html.slice(braceStart, end));
  } catch {
    throw new ParseError('Não foi possível interpretar o snapshot do Status Report (JSON inválido).');
  }
  if (!parsed || typeof parsed !== 'object') throw new ParseError('Arquivo incompatível com o formato esperado.');
  if (!Array.isArray(parsed.ros) && !Array.isArray(parsed.os)) {
    throw new ParseError('O snapshot não contém ROs nem OSs — arquivo incompatível.');
  }
  return parsed;
}

/* ------------------------------------------------------------------ */
/* Normalização de valores                                             */
/* ------------------------------------------------------------------ */

function s(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t === '' || t === '—' ? null : t;
}

function n(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const num = typeof v === 'number' ? v : Number(String(v).replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(num) ? num : null;
}

function d(v: unknown): string | null {
  const raw = s(v);
  if (!raw) return null;
  // ISO já pronto
  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // dd/mm/yyyy
  m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function b(v: unknown): boolean {
  return v === true || v === 'true' || v === 1;
}

/* ------------------------------------------------------------------ */
/* Entidades parseadas                                                */
/* ------------------------------------------------------------------ */

export interface ParsedEpic {
  source: 'jira' | 'sydle';
  external_id: string;
  key: string | null;
  titulo: string | null;
  modulo: string | null;
  component: string | null;
  status: string | null;
  numero_os: number | null;
  raw_data: any;
}

export interface ParsedOs {
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
  status_contratada: string | null;
  status_desconhecido: boolean;
  quantidade_esforco: number | null;
  quantidade_esforco_fmt: string | null;
  valor_esforco_fmt: string | null;
  quantidade_executada: number | null;
  quantidade_executada_fmt: string | null;
  valor_executado_fmt: string | null;
  data_prevista_homologacao: string | null;
  data_homologacao: string | null;
  sydle_url: string | null;
  raw_data: any;
}

export interface ParsedRo {
  external_id: string;
  sydle_id: string | null;
  numero: number | null;
  titulo: string | null;
  solicitante: string | null;
  subprojeto: string | null;
  epic_external_id: string | null;
  epico_nome: string | null;
  status: string | null;
  status_key: string;
  status_ordem: number;
  tipo: string | null;
  tipo_key: string | null;
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
  raw_data: any;
}

export interface ParsedSnapshot {
  generatedAt: string | null;
  projectKey: string | null;
  epics: ParsedEpic[];
  oss: ParsedOs[];
  ros: ParsedRo[];
  warnings: string[];
  meta: Record<string, any>;
  raw: RawSnapshot;
}

export function parseStatusReportHtml(html: string): ParsedSnapshot {
  const snap = extractSnapshot(html);
  const warnings: string[] = [];

  /* --- Épicos (duas origens distintas, sem inventar vínculo) --- */
  const epics: ParsedEpic[] = [];
  const seenEpic = new Set<string>();
  for (const e of snap.epics || []) {
    const key = s(e?.key);
    if (!key) {
      warnings.push('Épico (Jira) ignorado por não possuir chave identificadora.');
      continue;
    }
    const id = `jira:${key}`;
    if (seenEpic.has(id)) continue;
    seenEpic.add(id);
    epics.push({
      source: 'jira',
      external_id: key,
      key,
      titulo: s(e?.summary),
      modulo: s(e?.modulo),
      component: s(e?.component),
      status: s(e?.status),
      numero_os: n(e?.numeroOsJira ?? e?.osVinculada?.numero),
      raw_data: e ?? {},
    });
  }
  // Épicos do Sydle referenciados pelas ROs
  const sydleEpics = new Map<string, { nome: string | null }>();
  for (const r of snap.ros || []) {
    const eid = s(r?.epicoId);
    if (eid && !sydleEpics.has(eid)) sydleEpics.set(eid, { nome: s(r?.epico) });
  }
  for (const [eid, info] of sydleEpics) {
    epics.push({
      source: 'sydle',
      external_id: eid,
      key: null,
      titulo: info.nome,
      modulo: null,
      component: null,
      status: null,
      numero_os: null,
      raw_data: { epicoId: eid, epico: info.nome },
    });
  }

  /* --- OSs --- */
  const oss: ParsedOs[] = [];
  const seenOs = new Set<string>();
  for (const o of snap.os || []) {
    const id = s(o?.sydleId) || s(o?._id) || (n(o?.numero) !== null ? `numero:${n(o?.numero)}` : null);
    if (!id) {
      warnings.push('OS ignorada por não possuir identificador estável (sydleId/numero).');
      continue;
    }
    if (seenOs.has(id)) {
      warnings.push(`OS duplicada no arquivo (${id}) — mantida apenas a primeira ocorrência.`);
      continue;
    }
    seenOs.add(id);
    if (b(o?.statusDesconhecido)) warnings.push(`OS #${o?.numero}: status "${o?.statusAtual}" não reconhecido no workflow de origem.`);
    oss.push({
      external_id: id,
      numero: n(o?.numero),
      titulo: s(o?.titulo),
      tipo_os: s(o?.tipoOs),
      subprojeto: s(o?.subprojeto),
      solicitante: s(o?.solicitante),
      responsavel: s(o?.responsavel),
      status_atual: s(o?.statusAtual),
      status_canonico: s(o?.statusCanonico),
      status_id: s(o?.statusId),
      status_ordem: n(o?.statusOrdem),
      status_contratada: s(o?.statusContratada),
      status_desconhecido: b(o?.statusDesconhecido),
      quantidade_esforco: n(o?.quantidadeEsforco),
      quantidade_esforco_fmt: s(o?.quantidadeEsforcoFmt),
      valor_esforco_fmt: s(o?.valorEsforcoFmt),
      quantidade_executada: n(o?.quantidadeExecutada),
      quantidade_executada_fmt: s(o?.quantidadeExecutadaFmt),
      valor_executado_fmt: s(o?.valorExecutadoFmt),
      data_prevista_homologacao: d(o?.dataPrevistaHomologacao),
      data_homologacao: d(o?.dataHomologacao),
      sydle_url: s(o?.sydleUrl),
      raw_data: o ?? {},
    });
  }

  /* --- ROs --- */
  const ros: ParsedRo[] = [];
  const seenRo = new Set<string>();
  for (const r of snap.ros || []) {
    const id = s(r?.sydleId) || s(r?._id) || (n(r?.numero) !== null ? `numero:${n(r?.numero)}` : null);
    if (!id) {
      warnings.push(`RO "${s(r?.titulo) ?? 'sem título'}" ignorada por não possuir identificador estável.`);
      continue;
    }
    if (seenRo.has(id)) {
      warnings.push(`RO duplicada no arquivo (${id}) — mantida apenas a primeira ocorrência.`);
      continue;
    }
    seenRo.add(id);
    const statusDef = normalizeRoStatus(s(r?.status));
    if (statusDef.key === 'outros') {
      warnings.push(`RO #${r?.numero}: status "${r?.status}" não reconhecido — classificado como "Outros".`);
    }
    ros.push({
      external_id: id,
      sydle_id: s(r?.sydleId),
      numero: n(r?.numero),
      titulo: s(r?.titulo),
      solicitante: s(r?.solicitante),
      subprojeto: s(r?.subprojeto),
      epic_external_id: s(r?.epicoId),
      epico_nome: s(r?.epico),
      status: s(r?.status),
      status_key: statusDef.key,
      status_ordem: statusDef.ordem,
      tipo: s(r?.tipo),
      tipo_key: s(r?.tipoKey),
      tipo_validacao: s(r?.tipoValidacao),
      prioridade: s(r?.prioridade),
      prioridade_nota: n(r?.prioridadeNota),
      prioritario: b(r?.prioritario),
      urgencia: s(r?.urgencia),
      urgencia_nivel: extractLevel(s(r?.urgencia)),
      impacto: s(r?.impacto),
      impacto_nivel: extractLevel(s(r?.impacto)),
      grau: n(r?.grau),
      esforco: n(r?.quantidadeEsforco),
      tempo_estimado_horas: n(r?.tempoEstimadoHoras),
      previsao_atendimento: d(r?.previsaoDeAtendimento),
      sydle_url: s(r?.sydleUrl),
      raw_data: r ?? {},
    });
  }

  return {
    generatedAt: s(snap.generatedAt),
    projectKey: s(snap.projectKey),
    epics,
    oss,
    ros,
    warnings,
    meta: {
      ...(snap.meta || {}),
      frentes: snap.frentes ?? null,
      subprojetos: snap.subprojetos ?? null,
      osStatusWorkflow: snap.osStatusWorkflow ?? null,
      sydleLinks: snap.sydleLinks ?? null,
      reunioesCount: Array.isArray(snap.reunioes) ? snap.reunioes.length : 0,
      pendenciasCount: Array.isArray(snap.pendencias) ? snap.pendencias.length : 0,
      // preservado para telas futuras (Cronograma / Síntese / Pendências)
      reunioes: snap.reunioes ?? [],
      pendencias: snap.pendencias ?? [],
    },
    raw: snap,
  };
}

/** SHA-256 do arquivo, usado para detectar importação duplicada. */
export async function hashFileContent(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}
