/**
 * STATUS REPORT — Configuração central de regras gerenciais.
 *
 * Toda regra de normalização, ordenação de workflow, classificação de
 * quadrantes e cálculo de indicadores gerenciais vive AQUI.
 * Não espalhar essas regras pelos componentes.
 *
 * Importante: o status ORIGINAL do HTML nunca é substituído. O status
 * normalizado (statusKey) é apenas um agrupamento gerencial adicional.
 */

export interface RoStatusDef {
  key: string;
  label: string;
  ordem: number;
  /** Número do prefixo usado no HTML de origem ("6 - Em desenvolvimento (ELO)") */
  prefix?: number;
  aliases?: RegExp[];
  /** Considerado esforço comprometido (trabalho em curso) */
  committed?: boolean;
  /** Considerado concluído/entregue */
  done?: boolean;
  /** Encerrado sem entrega */
  closed?: boolean;
}

export const RO_STATUS_WORKFLOW: RoStatusDef[] = [
  { key: 'backlog', label: 'Backlog', ordem: 0, prefix: 0, aliases: [/backlog/i] },
  { key: 'analise-elo', label: 'Análise (ELO)', ordem: 1, prefix: 1, aliases: [/an[áa]lise\s*\(elo\)/i], committed: true },
  { key: 'analise-cliente', label: 'Análise (Cliente)', ordem: 2, prefix: 2, aliases: [/an[áa]lise\s*\(cliente\)/i], committed: true },
  { key: 'a-fazer-elo', label: 'A Fazer (ELO)', ordem: 3, prefix: 3, aliases: [/a\s*fazer/i], committed: true },
  { key: 'especificacao-elo', label: 'Especificação (ELO)', ordem: 4, prefix: 4, aliases: [/especifica[çc][ãa]o\s*\(elo\)/i], committed: true },
  { key: 'validacao-especificacao', label: 'Validação da Especificação (Cliente)', ordem: 5, prefix: 5, aliases: [/valida[çc][ãa]o\s*da\s*especifica/i], committed: true },
  { key: 'desenvolvimento-elo', label: 'Desenvolvimento (ELO)', ordem: 6, prefix: 6, aliases: [/desenvolvimento/i], committed: true },
  { key: 'homologacao-validacao', label: 'Homologação / Validação (Cliente)', ordem: 7, prefix: 7, aliases: [/homologa[çc][ãa]o\s*\/\s*valida/i], committed: true },
  { key: 'homologado-resolvido', label: 'Homologado / Resolvido (ELO)', ordem: 8, prefix: 8, aliases: [/homologado|resolvido/i], committed: true },
  { key: 'producao-concluido', label: 'Produção / Concluído (ELO)', ordem: 9, prefix: 9, aliases: [/produ[çc][ãa]o|conclu[íi]do/i], done: true },
  { key: 'pausado', label: 'Pausado (ELO)', ordem: 10, prefix: 10, aliases: [/pausad/i] },
  { key: 'cancelado', label: 'Cancelado (ELO)', ordem: 11, prefix: 11, aliases: [/cancelad/i], closed: true },
  { key: 'outros', label: 'Outros', ordem: 99 },
];

export const RO_STATUS_OUTROS = 'outros';

export function normalizeRoStatus(status?: string | null): RoStatusDef {
  const fallback = RO_STATUS_WORKFLOW[RO_STATUS_WORKFLOW.length - 1];
  if (!status) return fallback;
  const raw = String(status).trim();
  const m = raw.match(/^(\d{1,2})\s*-/);
  if (m) {
    const found = RO_STATUS_WORKFLOW.find((s) => s.prefix === Number(m[1]));
    if (found) return found;
  }
  for (const s of RO_STATUS_WORKFLOW) {
    if (s.aliases?.some((rx) => rx.test(raw))) return s;
  }
  return fallback;
}

export function getRoStatusDef(key?: string | null): RoStatusDef {
  return RO_STATUS_WORKFLOW.find((s) => s.key === key) || RO_STATUS_WORKFLOW[RO_STATUS_WORKFLOW.length - 1];
}

/** Status cujo esforço é considerado COMPROMETIDO (regra única e central) */
export const COMMITTED_STATUS_KEYS = RO_STATUS_WORKFLOW.filter((s) => s.committed).map((s) => s.key);
export const DONE_STATUS_KEYS = RO_STATUS_WORKFLOW.filter((s) => s.done).map((s) => s.key);
export const CLOSED_STATUS_KEYS = RO_STATUS_WORKFLOW.filter((s) => s.closed).map((s) => s.key);

/** Extrai o nível numérico de escalas do tipo "4 - Alta 🟠" */
export function extractLevel(value?: string | null): number | null {
  if (value === null || value === undefined) return null;
  const m = String(value).match(/^\s*(\d{1,2})/);
  return m ? Number(m[1]) : null;
}

/** Remove prefixo numérico e emojis para exibição limpa */
export function cleanScaleLabel(value?: string | null): string {
  if (!value) return '—';
  return String(value)
    .replace(/^\s*\d{1,2}\s*-\s*/, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .trim() || '—';
}

/**
 * MATRIZ IMPACTO × ESFORÇO
 * - Impacto usa a escala real do HTML (1 a 5). Limite padrão: >= 4 é "alto".
 * - Esforço não possui escala fixa no HTML; o limite padrão é a MEDIANA
 *   dos esforços válidos da carga atual (calculado, não arbitrário) e é
 *   configurável na própria tela.
 */
export const IMPACT_SCALE_MAX = 5;
export const DEFAULT_IMPACT_THRESHOLD = 4;

export function medianOf(values: number[]): number | null {
  const v = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

export type QuadrantKey = 'fazer-primeiro' | 'investimento' | 'oportunidade' | 'questionar';

export const QUADRANTS: Record<QuadrantKey, { label: string; description: string; tone: string }> = {
  'fazer-primeiro': { label: 'Fazer primeiro', description: 'Alto impacto + baixo esforço', tone: 'success' },
  investimento: { label: 'Investimento estratégico', description: 'Alto impacto + alto esforço', tone: 'primary' },
  oportunidade: { label: 'Oportunidade', description: 'Baixo impacto + baixo esforço', tone: 'muted' },
  questionar: { label: 'Questionar', description: 'Baixo impacto + alto esforço', tone: 'warning' },
};

export function classifyQuadrant(
  impactoNivel: number | null,
  esforco: number | null,
  impactThreshold: number,
  effortThreshold: number,
): QuadrantKey | null {
  if (impactoNivel === null || esforco === null || !Number.isFinite(esforco)) return null;
  const highImpact = impactoNivel >= impactThreshold;
  const highEffort = esforco > effortThreshold;
  if (highImpact && !highEffort) return 'fazer-primeiro';
  if (highImpact && highEffort) return 'investimento';
  if (!highImpact && !highEffort) return 'oportunidade';
  return 'questionar';
}

/**
 * VALOR POR ESFORÇO — indicador gerencial complementar.
 * Regra oficial adotada: grau / esforço, quando ambos válidos e esforço > 0.
 * Não substitui a regra oficial de priorização do Status Report.
 */
export const VALOR_POR_ESFORCO_TOOLTIP =
  'Indicador gerencial complementar (grau ÷ esforço). Não substitui a regra oficial de priorização.';

export function valorPorEsforco(grau: number | null, esforco: number | null): number | null {
  if (grau === null || esforco === null) return null;
  if (!Number.isFinite(grau) || !Number.isFinite(esforco) || esforco <= 0) return null;
  return grau / esforco;
}
