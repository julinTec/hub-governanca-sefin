import * as XLSX from 'xlsx';

interface Objetivo {
  id: string;
  objetivo: string;
  ciclo: string;
}

interface KeyResult {
  id: string;
  objetivo_id: string;
  kr: string;
  codigo: string | null;
  tipo: string | null;
  periodicidade: string | null;
  baseline: string | null;
  fonte_dados: string | null;
  lider: string | null;
  equipe: string | null;
  entregas_esperadas: string | null;
  datas_revisao: string | null;
}

interface Acao {
  id: string;
  key_result_id: string;
  numero: number | null;
  acao: string;
  responsavel: string | null;
  prazo: string | null;
  status: string | null;
}

const parseCodigo = (codigo: string | null, fallbackObjNum: number): { obj: number; kr: number; label: string } => {
  const parts = (codigo?.match(/\d+/g) || []).map(Number);
  const obj = parts[0] ?? fallbackObjNum;
  const kr = parts[1] ?? 1;
  return { obj, kr, label: `KR ${obj}.${kr}` };
};

const fmtDatePtBr = (iso: string | null): string => {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
};

const buildKrSheet = (
  objNum: number,
  krNum: number,
  kr: KeyResult,
  objetivoTexto: string,
  acoes: Acao[],
): XLSX.WorkSheet => {
  const rows: (string | number | null)[][] = [];
  // Row 1 empty (start data at row 2)
  rows.push([]);
  // Row 2: headers
  rows.push([null, 'Campo', 'Informação', null, null, 'Núm. do Obj Relacionado', 'Núm. do KR do objetivo']);
  // Row 3: KR Código
  rows.push([null, 'KR Código', kr.codigo || `KR${objNum}.${krNum}`, null, 'KR Código', objNum, krNum]);
  rows.push([null, 'Descrição do KR', kr.kr || '']);
  rows.push([null, 'Tipo', kr.tipo || '']);
  rows.push([null, 'Objetivo relacionado', objetivoTexto]);
  rows.push([null, 'Periodicidade de medição', kr.periodicidade || '']);
  rows.push([null, 'Valor atual (baseline) (para KR resultado)', kr.baseline || '']);
  rows.push([null, 'Fonte de dados', kr.fonte_dados || '']);
  rows.push([null, 'Líder responsável pelo KR', kr.lider || '']);
  rows.push([null, 'Equipe envolvida', kr.equipe || '']);
  rows.push([null, 'Entregas finais esperadas', kr.entregas_esperadas || '']);
  rows.push([null, 'Datas de revisão', kr.datas_revisao || '']);
  // Row 14 empty
  rows.push([]);
  // Row 15: Gerenciamento de Riscos section
  rows.push([null, 'Gerenciamento de Riscos - Vinculação ao KR']);
  rows.push([null, 'Relacionado a algum risco do processo?', '']);
  rows.push([null, 'Qual processo de trabalho?', '']);
  rows.push([null, 'Qual risco?', '']);
  rows.push([null, 'Previsto anteriormente como ação do plano de resposta ao risco?', '']);
  rows.push([null, 'Se sim, ação preventiva ou contingencial?', '']);
  // Row 21 empty
  rows.push([]);
  // Row 22: header ações
  rows.push([null, 'Nº', 'Ação', 'Responsável', 'Prazo', 'Status']);
  const sortedAcoes = [...acoes].sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0));
  sortedAcoes.forEach((a, idx) => {
    rows.push([
      null,
      a.numero ?? idx + 1,
      a.acao || '',
      a.responsavel || '',
      fmtDatePtBr(a.prazo),
      a.status || '',
    ]);
  });
  rows.push([]);
  rows.push([null, '*STATUS: A iniciar / Em andamento / Concluído / Atrasado']);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 4 },
    { wch: 38 },
    { wch: 65 },
    { wch: 16 },
    { wch: 12 },
    { wch: 13 },
    { wch: 13 },
  ];
  // merges: B15:C15 and *STATUS row
  const lastRowIdx = rows.length - 1;
  ws['!merges'] = [
    { s: { r: 14, c: 1 }, e: { r: 14, c: 2 } },
    { s: { r: lastRowIdx, c: 1 }, e: { r: lastRowIdx, c: 5 } },
  ];
  return ws;
};

const buildFichaSheet = (): XLSX.WorkSheet => {
  const rows: (string | number | null)[][] = [];
  rows.push([]);
  rows.push([null, 'Campo', 'Informação', null, null, 'Núm. do KR do objetivo', 'Núm. do Obj Relacionado']);
  rows.push([null, 'KR Código', '', null, 'KR Código', 'x', '1--6']);
  rows.push([null, 'Descrição do KR']);
  rows.push([null, 'Tipo']);
  rows.push([null, 'Objetivo relacionado']);
  rows.push([null, 'Periodicidade de medição']);
  rows.push([null, 'Valor atual (baseline) (para KR resultado)']);
  rows.push([null, 'Fonte de dados']);
  rows.push([null, 'Líder responsável pelo KR']);
  rows.push([null, 'Equipe envolvida']);
  rows.push([null, 'Entregas finais esperadas']);
  rows.push([null, 'Datas de revisão']);
  rows.push([]);
  rows.push([]);
  rows.push([null, 'Nº', 'Ação', 'Responsável', 'Prazo', 'Status']);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 4 }, { wch: 38 }, { wch: 65 }, { wch: 16 }, { wch: 12 }, { wch: 13 }, { wch: 13 },
  ];
  return ws;
};

export const exportOkrWorkbook = (
  objetivos: Objetivo[],
  keyResults: KeyResult[],
  acoes: Acao[],
): void => {
  const wb = XLSX.utils.book_new();

  // Ficha do KR (template)
  XLSX.utils.book_append_sheet(wb, buildFichaSheet(), 'Ficha do KR');

  // Order objetivos by first KR codigo, keep numbering stable
  const objOrder = new Map<string, number>();
  objetivos.forEach((o, i) => objOrder.set(o.id, i + 1));

  // Collect KRs with computed sheet name
  type Entry = { kr: KeyResult; obj: Objetivo; objNum: number; krNum: number; sheetName: string };
  const entries: Entry[] = [];
  for (const kr of keyResults) {
    const obj = objetivos.find((o) => o.id === kr.objetivo_id);
    if (!obj) continue;
    const fallback = objOrder.get(obj.id) || 1;
    const { obj: objN, kr: krN } = parseCodigo(kr.codigo, fallback);
    entries.push({
      kr,
      obj,
      objNum: objN,
      krNum: krN,
      sheetName: `KR ${objN}.${krN}`,
    });
  }

  entries.sort((a, b) => a.objNum - b.objNum || a.krNum - b.krNum);

  const used = new Set<string>();
  for (const e of entries) {
    let name = e.sheetName;
    let n = 2;
    while (used.has(name)) name = `${e.sheetName} (${n++})`;
    used.add(name);
    const krAcoes = acoes.filter((a) => a.key_result_id === e.kr.id);
    const ws = buildKrSheet(e.objNum, e.krNum, e.kr, e.obj.objetivo, krAcoes);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  }

  const today = new Date();
  const stamp = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}`;
  XLSX.writeFile(wb, `Ficha_KRs_${today.getFullYear()}-SEFIN_${stamp}.xlsx`);
};
