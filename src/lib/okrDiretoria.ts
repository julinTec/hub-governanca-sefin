// Diretoria de cada equipe dos OKRs, conforme o organograma da SEFIN.
// O campo `equipe` dos KRs e texto livre (vem da planilha), entao a comparacao
// ignora acento, maiusculas e espacos, e aceita nomes encurtados
// (ex. "Coordenadoria de Receitas Extrajudiciais" casa com
// "Coordenadoria de Receitas Extrajudiciais e Financeiras",
// "Gerencia de Despesa" casa com "Gerencia de Despesas").
// Pra incluir uma equipe nova, basta acrescentar o nome na lista da diretoria.

export const DIRETORIAS = [
  'Diretoria de Orçamento e Contabilidade',
  'Diretoria Financeira',
  'Gerência de Governança e Controle Interno',
] as const;

export type Diretoria = (typeof DIRETORIAS)[number];

const EQUIPES_POR_DIRETORIA: Record<Diretoria, string[]> = {
  'Diretoria de Orçamento e Contabilidade': [
    'Diretoria de Orçamento e Contabilidade',
    'DOC',
    'Coordenadoria de Gestão Orçamentária',
    'Coordenadoria de Contabilidade',
    'Coordenadoria de Gestão Fiscal e Apoio Técnico-Administrativo',
    'Coordenadoria de Monitoramento da Arrecadação e Gestão de Custos',
  ],
  'Diretoria Financeira': [
    'Diretoria Financeira',
    'Coordenadoria de Receitas Judiciais',
    'Coordenadoria de Receitas Extrajudiciais e Financeiras',
    'Gerência de Despesas',
    'Coordenadoria de Empenho',
    'Coordenadoria de Pagamento',
  ],
  'Gerência de Governança e Controle Interno': [
    'Gerência de Governança e Controle Interno',
    'Coordenadoria de Governança',
  ],
};

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const MAPA = Object.entries(EQUIPES_POR_DIRETORIA).flatMap(([diretoria, equipes]) =>
  equipes.map((e) => ({ diretoria: diretoria as Diretoria, nome: normalizar(e) }))
);

/** Diretoria a que a equipe pertence, ou null se a equipe nao estiver no organograma. */
export function diretoriaDaEquipe(equipe: string | null | undefined): Diretoria | null {
  if (!equipe) return null;
  const n = normalizar(equipe);
  if (!n) return null;
  const exato = MAPA.find((m) => m.nome === n);
  if (exato) return exato.diretoria;
  // Nome encurtado ou com plural diferente: um e prefixo do outro
  // (minimo de 3 palavras pra nao casar coisas genericas como "Coordenadoria de").
  if (n.split(' ').length < 3) return null;
  const parcial = MAPA.find((m) => m.nome.startsWith(n) || n.startsWith(m.nome));
  return parcial?.diretoria ?? null;
}
