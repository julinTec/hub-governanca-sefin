import * as XLSX from 'xlsx';

export type ParsedAcao = {
  numero: number | null;
  acao: string;
  responsavel: string | null;
  prazo: string | null;
  status: string;
};

export type ParsedKR = {
  sheetName: string;
  codigo: string;
  kr: string;
  tipo: string | null;
  objetivoTexto: string;
  periodicidade: string | null;
  baseline: string | null;
  fonte_dados: string | null;
  lider: string | null;
  equipe: string | null;
  entregas_esperadas: string | null;
  datas_revisao: string | null;
  status: string;
  acoes: ParsedAcao[];
  alerts: string[];
};

export type ParsedSheet = {
  objetivos: { textoOriginal: string; textoNormalizado: string }[];
  krs: ParsedKR[];
  totalAcoes: number;
};

const SHEET_PATTERN = /^KR\s*\d+\.\d+$/i;

export const normalizeText = (s: string | null | undefined): string =>
  (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const STATUS_MAP: Record<string, string> = {
  'a iniciar': 'A iniciar',
  'nao iniciado': 'A iniciar',
  'nao iniciada': 'A iniciar',
  'pendente': 'A iniciar',
  'em andamento': 'Em andamento',
  'andamento': 'Em andamento',
  'em execucao': 'Em andamento',
  'execucao': 'Em andamento',
  'em progresso': 'Em andamento',
  'concluido': 'Concluído',
  'concluida': 'Concluído',
  'finalizado': 'Concluído',
  'finalizada': 'Concluído',
  'feito': 'Concluído',
  'atrasado': 'Atrasado',
  'atrasada': 'Atrasado',
};

export const normalizeStatus = (s: any): string => {
  const key = normalizeText(s);
  if (!key) return 'A iniciar';
  return STATUS_MAP[key] || (s ? String(s).trim() : 'A iniciar');
};

const cellValue = (sheet: XLSX.WorkSheet, addr: string): any => {
  const cell = sheet[addr];
  if (!cell) return null;
  return cell.v ?? null;
};

const cellText = (sheet: XLSX.WorkSheet, addr: string): string | null => {
  const v = cellValue(sheet, addr);
  if (v === null || v === undefined || v === '') return null;
  return String(v).trim();
};

const excelDateToISO = (v: any): string | null => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    const mm = String(d.m).padStart(2, '0');
    const dd = String(d.d).padStart(2, '0');
    return `${d.y}-${mm}-${dd}`;
  }
  const str = String(v).trim();
  // dd/mm/yyyy
  const m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // already iso-ish
  const m2 = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m2) return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`;
  return null;
};

const findActionHeaderRow = (sheet: XLSX.WorkSheet, startRow = 0): { row: number; cols: Record<string, number> } | null => {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
  for (let r = Math.max(range.s.r, startRow); r <= range.e.r; r++) {
    const rowVals: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const v = sheet[addr]?.v;
      rowVals.push(v == null ? '' : normalizeText(String(v)));
    }
    const joined = rowVals.join('|');
    if (
      (joined.includes('acao') || joined.includes('açao')) &&
      joined.includes('responsavel') &&
      joined.includes('prazo') &&
      joined.includes('status')
    ) {
      const cols: Record<string, number> = {};
      rowVals.forEach((v, i) => {
        if (!v) return;
        if ((v === 'n' || v.startsWith('n°') || v === 'no' || v === 'num' || v === 'numero' || v.startsWith('nº')) && cols.numero === undefined) cols.numero = i;
        if ((v === 'acao' || v === 'açao' || v.includes('acao')) && cols.acao === undefined) cols.acao = i;
        if (v.includes('responsavel') && cols.responsavel === undefined) cols.responsavel = i;
        if (v.includes('prazo') && cols.prazo === undefined) cols.prazo = i;
        if (v.includes('status') && cols.status === undefined) cols.status = i;
      });
      if (cols.acao !== undefined) return { row: r, cols };
    }
  }
  return null;
};

const parseAcoes = (sheet: XLSX.WorkSheet, startRow = 0): ParsedAcao[] => {
  const header = findActionHeaderRow(sheet, startRow);
  if (!header) return [];
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
  const acoes: ParsedAcao[] = [];
  let autoNum = 0;
  for (let r = header.row + 1; r <= range.e.r; r++) {
    const get = (key: string): any => {
      const c = header.cols[key];
      if (c === undefined) return null;
      return sheet[XLSX.utils.encode_cell({ r, c })]?.v ?? null;
    };
    const numeroRaw = get('numero');
    const acaoRaw = get('acao');
    const acaoStr = acaoRaw != null ? String(acaoRaw).trim() : '';
    const numStr = numeroRaw != null ? String(numeroRaw).trim() : '';
    // stop at status legend row
    if (acaoStr.startsWith('*') || numStr.startsWith('*')) break;
    if (normalizeText(acaoStr).startsWith('status:')) break;
    if (!acaoStr && !numStr) {
      const nextR = r + 1;
      if (nextR > range.e.r) break;
      const nextAcao = header.cols.acao !== undefined
        ? sheet[XLSX.utils.encode_cell({ r: nextR, c: header.cols.acao })]?.v
        : null;
      if (!nextAcao) break;
      continue;
    }
    if (!acaoStr) continue; // skip blank-action rows (just a number)
    autoNum += 1;
    const numero = numStr ? Number(numStr.replace(/\D/g, '')) || autoNum : autoNum;
    acoes.push({
      numero,
      acao: acaoStr,
      responsavel: (() => { const v = get('responsavel'); return v ? String(v).trim() : null; })(),
      prazo: excelDateToISO(get('prazo')),
      status: normalizeStatus(get('status')),
    });
  }
  return acoes;
};

// ---- KR header (first table) — lookup by label in column B ----
const FIELD_ALIASES: Record<string, string[]> = {
  codigo: ['kr codigo', 'codigo', 'codigo do kr'],
  kr: ['descricao do kr', 'descricao', 'kr'],
  tipo: ['tipo'],
  objetivoTexto: ['objetivo relacionado', 'objetivo'],
  periodicidade: ['periodicidade de medicao', 'periodicidade'],
  baseline: ['valor atual (baseline) (para kr resultado)', 'valor atual (baseline)', 'valor atual', 'baseline'],
  fonte_dados: ['fonte de dados', 'fonte dos dados'],
  lider: ['lider responsavel pelo kr', 'lider', 'responsavel pelo kr'],
  equipe: ['equipe envolvida', 'equipe'],
  entregas_esperadas: ['entregas finais esperadas', 'entregas esperadas', 'entregas'],
  datas_revisao: ['datas de revisao', 'data de revisao', 'datas'],
};

const matchField = (labelNorm: string): string | null => {
  if (!labelNorm) return null;
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(labelNorm)) return field;
  }
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some(a => labelNorm.startsWith(a))) return field;
  }
  return null;
};

const parseKRHeader = (sheet: XLSX.WorkSheet): { values: Record<string, string | null>; lastRow: number } => {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
  const values: Record<string, string | null> = {};
  let lastRow = 0;
  const maxScan = Math.min(range.e.r, 29);
  for (let r = range.s.r; r <= maxScan; r++) {
    const labelAddr = XLSX.utils.encode_cell({ r, c: 1 }); // column B
    const label = sheet[labelAddr]?.v;
    if (label == null) continue;
    const field = matchField(normalizeText(String(label)));
    if (!field) continue;
    // value in column C; fallback to D
    let val: any = sheet[XLSX.utils.encode_cell({ r, c: 2 })]?.v;
    if (val == null || String(val).trim() === '') {
      val = sheet[XLSX.utils.encode_cell({ r, c: 3 })]?.v;
    }
    const str = val == null ? null : String(val).trim();
    if (values[field] == null && str) values[field] = str;
    if (r > lastRow) lastRow = r;
  }
  return { values, lastRow };
};

export const parseOkrWorkbook = (data: ArrayBuffer): ParsedSheet => {
  const wb = XLSX.read(data, { type: 'array', cellDates: false });
  const krs: ParsedKR[] = [];
  const objetivosMap = new Map<string, string>();
  let totalAcoes = 0;

  for (const sheetName of wb.SheetNames) {
    if (!SHEET_PATTERN.test(sheetName.trim())) continue;
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;

    const { values: hdr, lastRow } = parseKRHeader(sheet);
    const codigo = ((hdr.codigo || sheetName).replace(/\s+/g, ''));
    const kr = hdr.kr || '';
    const tipo = hdr.tipo || null;
    const objetivoTexto = hdr.objetivoTexto || '';
    const periodicidade = hdr.periodicidade || null;
    const baseline = hdr.baseline || null;
    const fonte_dados = hdr.fonte_dados || null;
    const lider = hdr.lider || null;
    const equipe = hdr.equipe || null;
    const entregas_esperadas = hdr.entregas_esperadas || null;
    const datas_revisao = hdr.datas_revisao || null;

    const expectedFields = ['kr', 'objetivoTexto', 'lider', 'equipe', 'periodicidade'];
    const missing = expectedFields.filter(f => !hdr[f]);
    if (missing.length) console.warn(`[okrImport] ${sheetName}: campos não encontrados por rótulo:`, missing);

    const acoes = parseAcoes(sheet, lastRow + 1);
    totalAcoes += acoes.length;

    const alerts: string[] = [];
    if (!kr) alerts.push('Descrição do KR vazia');
    if (!objetivoTexto) alerts.push('Objetivo relacionado vazio');
    if (!equipe) alerts.push('Equipe vazia');
    if (!entregas_esperadas) alerts.push('Entregas finais vazias');
    if (!datas_revisao) alerts.push('Datas de revisão vazias');
    acoes.forEach((a, i) => {
      if (!a.acao) alerts.push(`Ação #${i + 1} sem descrição`);
      if (!a.responsavel) alerts.push(`Ação #${i + 1} sem responsável`);
    });

    if (objetivoTexto) {
      const norm = normalizeText(objetivoTexto);
      if (!objetivosMap.has(norm)) objetivosMap.set(norm, objetivoTexto);
    }

    krs.push({
      sheetName,
      codigo,
      kr,
      tipo,
      objetivoTexto,
      periodicidade,
      baseline,
      fonte_dados,
      lider,
      equipe,
      entregas_esperadas,
      datas_revisao,
      status: 'Em andamento',
      acoes,
      alerts,
    });
  }

  return {
    krs,
    totalAcoes,
    objetivos: Array.from(objetivosMap.entries()).map(([textoNormalizado, textoOriginal]) => ({
      textoNormalizado,
      textoOriginal,
    })),
  };
};
