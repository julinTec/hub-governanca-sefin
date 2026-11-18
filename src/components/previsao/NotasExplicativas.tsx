import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { chamarApiPublica, PublicoApiError } from '@/lib/publicoApi';
import { UNIDADES_SEFIN } from '@/lib/okrDiretoria';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowDown, ArrowUp, Download, Loader2, Minus, Pencil, Plus, StickyNote, Trash2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Notas Explicativas da Arrecadacao (18/11/2026)
//
// Os coordenadores registram, por periodo, os fatos que explicam a
// arrecadacao (ex.: "alta da Selic elevou os rendimentos", "concurso de
// jun/26 aumentou o Extra Judicial"). As notas aparecem:
//   - nos graficos (marcador no mes, com a nota no tooltip);
//   - na tabela mes a mes do Real x Previsto (icone no mes);
//   - na aba "Notas Explicativas" (linha do tempo, filtros, Excel).
//
// Os dados vem de um Provider: NotasHubProvider (Hub autenticado, direto na
// tabela notas_arrecadacao) ou NotasPublicoProvider (link publico, via Edge
// Function hub-publico-api). No link so o "link de colaboracao" registra;
// editar/excluir e so do admin, no Hub.
// ---------------------------------------------------------------------------

export const CATEGORIAS_NOTA = ['Geral', 'Judicial', 'Extra Judicial', 'Rendimento'] as const;
export type CategoriaNota = (typeof CATEGORIAS_NOTA)[number];
export type EfeitoNota = 'aumento' | 'reducao' | 'neutro';
export type NaturezaNota = 'pontual' | 'recorrente';

export interface NotaArrecadacao {
  id: string;
  periodo_inicio: string; // AAAA-MM-01
  periodo_fim: string | null;
  categoria: CategoriaNota;
  efeito: EfeitoNota;
  natureza: NaturezaNota;
  impacto_estimado: number | null;
  titulo: string;
  descricao: string;
  autor_nome: string;
  autor_coordenadoria: string;
  origem: 'hub' | 'link_colaboracao';
  created_at: string;
  updated_at: string;
}

export type NovaNota = Pick<
  NotaArrecadacao,
  'periodo_inicio' | 'periodo_fim' | 'categoria' | 'efeito' | 'natureza' | 'impacto_estimado' | 'titulo' | 'descricao' | 'autor_nome' | 'autor_coordenadoria'
>;

const COLUNAS =
  'id, periodo_inicio, periodo_fim, categoria, efeito, natureza, impacto_estimado, titulo, descricao, autor_nome, autor_coordenadoria, origem, created_at, updated_at';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const mesCurtoNota = (iso: string) => `${MESES[parseInt(iso.slice(5, 7), 10) - 1]}/${iso.slice(2, 4)}`;

export const EFEITO_INFO: Record<EfeitoNota, { rotulo: string; cor: string; Icone: typeof ArrowUp }> = {
  aumento: { rotulo: 'Aumentou a arrecadação', cor: 'text-emerald-700 border-emerald-300 bg-emerald-50 dark:text-emerald-300 dark:border-emerald-800 dark:bg-emerald-950', Icone: ArrowUp },
  reducao: { rotulo: 'Reduziu a arrecadação', cor: 'text-red-700 border-red-300 bg-red-50 dark:text-red-300 dark:border-red-800 dark:bg-red-950', Icone: ArrowDown },
  neutro: { rotulo: 'Contexto (sem efeito direto)', cor: 'text-slate-700 border-slate-300 bg-slate-50 dark:text-slate-300 dark:border-slate-700 dark:bg-slate-900', Icone: Minus },
};

export const NATUREZA_INFO: Record<NaturezaNota, { rotulo: string; ajuda: string }> = {
  pontual: { rotulo: 'Pontual', ajuda: 'Só naquele período (ex.: um concurso, uma receita de capital). Não deve ser projetado pra frente.' },
  recorrente: { rotulo: 'Recorrente', ajuda: 'Muda o patamar dali em diante (ex.: nova tabela de custas, alta da Selic).' },
};

/** Periodo da nota em texto: "jun/26" ou "jun/26 a dez/26". */
export function periodoNota(n: Pick<NotaArrecadacao, 'periodo_inicio' | 'periodo_fim'>) {
  const ini = mesCurtoNota(n.periodo_inicio);
  return n.periodo_fim && n.periodo_fim.slice(0, 7) !== n.periodo_inicio.slice(0, 7) ? `${ini} a ${mesCurtoNota(n.periodo_fim)}` : ini;
}

/** A nota cobre o mes (AAAA-MM-01)? */
export function notaCobreMes(n: NotaArrecadacao, mes: string) {
  const m = mes.slice(0, 7);
  const ini = n.periodo_inicio.slice(0, 7);
  const fim = (n.periodo_fim ?? n.periodo_inicio).slice(0, 7);
  return ini <= m && m <= fim;
}

/** Notas do mes pra uma visao: "Total" (ou null) mostra todas; uma categoria mostra as dela + as gerais. */
export function notasDoMes(notas: NotaArrecadacao[], mes: string, categoria?: string | null) {
  return notas.filter(
    (n) => notaCobreMes(n, mes) && (!categoria || categoria === 'Total' || n.categoria === categoria || n.categoria === 'Geral')
  );
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

/** "4,4 mi" / "4.400.000" / "R$ 4.400.000,00" / "-1,2 mi" -> numero. */
function lerValor(txt: string): number | null {
  const t = txt.trim().toLowerCase().replace(/r\$|\s/g, '');
  if (!t) return null;
  const mult = /mi(lh(ao|oes|ões))?$/.test(t) ? 1e6 : /mil$/.test(t) ? 1e3 : 1;
  const num = t.replace(/[a-zãõ]+$/, '');
  const normal = num.includes(',') ? num.replace(/\./g, '').replace(',', '.') : mult > 1 ? num : num.replace(/\.(?=\d{3}(\D|$))/g, '');
  const n = Number(normal) * mult;
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Contexto
// ---------------------------------------------------------------------------

interface NotasContexto {
  notas: NotaArrecadacao[];
  carregando: boolean;
  erro: string | null;
  /** Tabela ainda nao existe no banco (migration pendente). */
  indisponivel: boolean;
  podeRegistrar: boolean;
  /** Admin no Hub: edita e exclui. */
  podeGerenciar: boolean;
  /** Abre o formulario (novo, com mes/categoria pre-preenchidos, ou editando uma nota). */
  abrirFormulario: (inicial?: Partial<NovaNota>, editando?: NotaArrecadacao) => void;
  pedirExclusao: (nota: NotaArrecadacao) => void;
}

const Ctx = createContext<NotasContexto | null>(null);

/** Notas do contexto, ou null fora de um Provider (componentes funcionam sem notas). */
export const useNotasArrecadacao = () => useContext(Ctx);

interface Backend {
  carregar: () => Promise<{ notas: NotaArrecadacao[]; indisponivel?: boolean }>;
  registrar: (n: NovaNota) => Promise<void>;
  atualizar?: (id: string, n: NovaNota) => Promise<void>;
  excluir?: (id: string) => Promise<void>;
  autorPadrao?: { nome?: string; coordenadoria?: string };
}

const ehTabelaAusente = (msg: string) => /notas_arrecadacao/.test(msg) && /(does not exist|schema cache|not find)/i.test(msg);

function NotasProviderBase({ backend, podeRegistrar, podeGerenciar, children }: { backend: Backend; podeRegistrar: boolean; podeGerenciar: boolean; children: ReactNode }) {
  const { toast } = useToast();
  const [notas, setNotas] = useState<NotaArrecadacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [indisponivel, setIndisponivel] = useState(false);
  const [form, setForm] = useState<{ inicial?: Partial<NovaNota>; editando?: NotaArrecadacao } | null>(null);
  const [paraExcluir, setParaExcluir] = useState<NotaArrecadacao | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const recarregar = useCallback(async () => {
    try {
      const r = await backend.carregar();
      setNotas(r.notas);
      setIndisponivel(!!r.indisponivel);
      setErro(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (ehTabelaAusente(msg)) setIndisponivel(true);
      else setErro(msg);
    } finally {
      setCarregando(false);
    }
  }, [backend]);

  useEffect(() => { recarregar(); }, [recarregar]);

  const salvar = async (n: NovaNota) => {
    if (form?.editando && backend.atualizar) await backend.atualizar(form.editando.id, n);
    else await backend.registrar(n);
    lembrarAutor(n.autor_nome, n.autor_coordenadoria);
    toast({ title: form?.editando ? 'Nota atualizada' : 'Nota registrada', description: `${periodoNota(n)} · ${n.titulo}` });
    setForm(null);
    recarregar();
  };

  const excluir = async () => {
    if (!paraExcluir || !backend.excluir) return;
    setExcluindo(true);
    try {
      await backend.excluir(paraExcluir.id);
      toast({ title: 'Nota excluída' });
      setParaExcluir(null);
      recarregar();
    } catch (e) {
      toast({ title: 'Não consegui excluir', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setExcluindo(false);
    }
  };

  const valor: NotasContexto = {
    notas,
    carregando,
    erro,
    indisponivel,
    podeRegistrar: podeRegistrar && !indisponivel,
    podeGerenciar: podeGerenciar && !indisponivel,
    abrirFormulario: (inicial, editando) => setForm({ inicial, editando }),
    pedirExclusao: setParaExcluir,
  };

  return (
    <Ctx.Provider value={valor}>
      {children}
      {form && (
        <FormularioNota
          aberto
          inicial={form.inicial}
          editando={form.editando}
          autorPadrao={backend.autorPadrao}
          onFechar={() => setForm(null)}
          onSalvar={salvar}
        />
      )}
      <AlertDialog open={!!paraExcluir} onOpenChange={(o) => !o && setParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta nota?</AlertDialogTitle>
            <AlertDialogDescription>
              {paraExcluir && `${periodoNota(paraExcluir)} · ${paraExcluir.titulo} (registrada por ${paraExcluir.autor_nome}). `}
              A exclusão não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={excluindo} onClick={(ev) => { ev.preventDefault(); excluir(); }}>
              {excluindo && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Ctx.Provider>
  );
}

const CHAVE_AUTOR = 'hub-notas-arrecadacao-autor';
function lembrarAutor(nome: string, coordenadoria: string) {
  try { localStorage.setItem(CHAVE_AUTOR, JSON.stringify({ nome, coordenadoria })); } catch { /* sem storage */ }
}
function autorLembrado(): { nome?: string; coordenadoria?: string } {
  try { return JSON.parse(localStorage.getItem(CHAVE_AUTOR) || '{}') ?? {}; } catch { return {}; }
}

/** Hub autenticado: le/grava direto na tabela (RLS: todos criam, admin edita/exclui). */
export function NotasHubProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [perfil, setPerfil] = useState<{ nome?: string; coordenadoria?: string }>({});

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('nome, area').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      const p = data as { nome?: string | null; area?: string | null } | null;
      setPerfil({ nome: p?.nome ?? undefined, coordenadoria: p?.area ?? undefined });
    });
  }, [user]);

  const backend = useMemo<Backend>(() => {
    const tabela = () => (supabase as any).from('notas_arrecadacao');
    return {
      carregar: async () => {
        const { data, error } = await tabela().select(COLUNAS).order('periodo_inicio', { ascending: false }).order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return { notas: (data ?? []) as NotaArrecadacao[] };
      },
      registrar: async (n) => {
        const { error } = await tabela().insert({ ...n, origem: 'hub', criado_por: user?.id });
        if (error) throw new Error(error.message);
      },
      atualizar: async (id, n) => {
        const { data, error } = await tabela().update({ ...n, updated_at: new Date().toISOString() }).eq('id', id).select('id');
        if (error) throw new Error(error.message);
        if (!data?.length) throw new Error('Sem permissão para editar esta nota (só administradores).');
      },
      excluir: async (id) => {
        const { data, error } = await tabela().delete().eq('id', id).select('id');
        if (error) throw new Error(error.message);
        if (!data?.length) throw new Error('Sem permissão para excluir esta nota (só administradores).');
      },
      autorPadrao: perfil,
    };
  }, [user, perfil]);

  return <NotasProviderBase backend={backend} podeRegistrar={!!user} podeGerenciar={isAdmin}>{children}</NotasProviderBase>;
}

/** Link publico: le pela Edge Function; registra so com o link de colaboracao. */
export function NotasPublicoProvider({ token, podeRegistrar, children }: { token: string; podeRegistrar: boolean; children: ReactNode }) {
  const backend = useMemo<Backend>(() => ({
    carregar: async () => {
      const r = await chamarApiPublica<{ notas: NotaArrecadacao[]; indisponivel?: boolean }>(token, 'notas');
      return { notas: r.notas ?? [], indisponivel: r.indisponivel };
    },
    registrar: async (n) => {
      await chamarApiPublica(token, 'registrar-nota', {}, n);
    },
  }), [token]);
  return <NotasProviderBase backend={backend} podeRegistrar={podeRegistrar} podeGerenciar={false}>{children}</NotasProviderBase>;
}

// ---------------------------------------------------------------------------
// Formulario
// ---------------------------------------------------------------------------

const ANOS = Array.from({ length: 2032 - 2015 + 1 }, (_, i) => String(2015 + i));

function MesAno({ valor, onChange, id }: { valor: string; onChange: (v: string) => void; id?: string }) {
  const [ano, mes] = [valor.slice(0, 4), valor.slice(5, 7)];
  return (
    <div className="flex gap-2">
      <Select value={mes} onValueChange={(m) => onChange(`${ano}-${m}-01`)}>
        <SelectTrigger id={id} className="w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          {MESES_LONGOS.map((nome, i) => {
            const v = String(i + 1).padStart(2, '0');
            return <SelectItem key={v} value={v}>{nome}</SelectItem>;
          })}
        </SelectContent>
      </Select>
      <Select value={ano} onValueChange={(a) => onChange(`${a}-${mes}-01`)}>
        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
        <SelectContent>
          {ANOS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Ultimo mes fechado (mes anterior ao atual) - o caso mais comum de nota. */
function mesAtualIso() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function FormularioNota({
  aberto, inicial, editando, autorPadrao, onFechar, onSalvar,
}: {
  aberto: boolean;
  inicial?: Partial<NovaNota>;
  editando?: NotaArrecadacao;
  autorPadrao?: { nome?: string; coordenadoria?: string };
  onFechar: () => void;
  onSalvar: (n: NovaNota) => Promise<void>;
}) {
  const base = editando ?? inicial ?? {};
  const lembrado = autorLembrado();
  const [inicio, setInicio] = useState(base.periodo_inicio?.slice(0, 10) ?? mesAtualIso());
  const [temFim, setTemFim] = useState(!!base.periodo_fim);
  const [fim, setFim] = useState(base.periodo_fim?.slice(0, 10) ?? base.periodo_inicio?.slice(0, 10) ?? mesAtualIso());
  const [categoria, setCategoria] = useState<CategoriaNota>((base.categoria as CategoriaNota) ?? 'Geral');
  const [efeito, setEfeito] = useState<EfeitoNota>(base.efeito ?? 'aumento');
  const [natureza, setNatureza] = useState<NaturezaNota>(base.natureza ?? 'pontual');
  const [impacto, setImpacto] = useState(
    base.impacto_estimado !== null && base.impacto_estimado !== undefined ? base.impacto_estimado.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : ''
  );
  const [titulo, setTitulo] = useState(base.titulo ?? '');
  const [descricao, setDescricao] = useState(base.descricao ?? '');
  const [autor, setAutor] = useState(base.autor_nome ?? lembrado.nome ?? autorPadrao?.nome ?? '');
  const [coord, setCoord] = useState(base.autor_coordenadoria ?? lembrado.coordenadoria ?? autorPadrao?.coordenadoria ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Perfil do Hub chega depois do primeiro render: preenche se ainda vazio.
  useEffect(() => {
    if (!autor && autorPadrao?.nome) setAutor(autorPadrao.nome);
    if (!coord && autorPadrao?.coordenadoria) setCoord(autorPadrao.coordenadoria);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autorPadrao]);

  const impactoNum = impacto.trim() ? lerValor(impacto) : null;
  const impactoInvalido = impacto.trim() !== '' && impactoNum === null;
  const fimInvalido = temFim && fim < inicio;
  const faltando = titulo.trim().length < 3 || descricao.trim().length < 3 || autor.trim().length < 2 || coord.trim().length < 2;

  const enviar = async () => {
    setErro(null);
    if (faltando) { setErro('Preencha título, descrição, seu nome e a coordenadoria.'); return; }
    if (fimInvalido) { setErro('O mês final não pode ser antes do inicial.'); return; }
    if (impactoInvalido) { setErro('Impacto estimado não é um valor válido (ex.: 4.400.000 ou 4,4 mi).'); return; }
    setSalvando(true);
    try {
      await onSalvar({
        periodo_inicio: inicio,
        periodo_fim: temFim && fim !== inicio ? fim : null,
        categoria,
        efeito,
        natureza,
        impacto_estimado: impactoNum,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        autor_nome: autor.trim(),
        autor_coordenadoria: coord.trim(),
      });
    } catch (e) {
      setErro(e instanceof PublicoApiError || e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && !salvando && onFechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar nota explicativa' : 'Registrar nota explicativa'}</DialogTitle>
          <DialogDescription>
            Explique um fato que afetou (ou vai afetar) a arrecadação no período. A nota aparece nos gráficos e na tabela da previsão, no Hub e no link público.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nota-titulo">Título *</Label>
            <Input id="nota-titulo" maxLength={140} placeholder="Ex.: Concurso público elevou o Extra Judicial" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nota-inicio">{temFim ? 'De *' : 'Mês *'}</Label>
              <MesAno id="nota-inicio" valor={inicio} onChange={(v) => { setInicio(v); if (fim < v) setFim(v); }} />
            </div>
            <div className="space-y-1.5">
              <label className="flex h-[22px] cursor-pointer items-center gap-2 text-sm font-medium">
                <Checkbox checked={temFim} onCheckedChange={(v) => setTemFim(v === true)} /> Vale por mais de um mês
              </label>
              {temFim && <MesAno valor={fim} onChange={setFim} />}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Categoria afetada</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS_NOTA.map((c) => (
                <Button key={c} type="button" size="sm" variant={categoria === c ? 'default' : 'outline'} onClick={() => setCategoria(c)}>
                  {c === 'Geral' ? 'Geral (todas)' : c}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Efeito</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(EFEITO_INFO) as EfeitoNota[]).map((e) => {
                const { rotulo, Icone, cor } = EFEITO_INFO[e];
                return (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEfeito(e)}
                    className={cn('inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors', efeito === e ? cor + ' font-medium ring-1 ring-current' : 'border-input hover:bg-accent')}
                  >
                    <Icone className="h-3.5 w-3.5" /> {rotulo}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Natureza</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(NATUREZA_INFO) as NaturezaNota[]).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNatureza(n)}
                  className={cn('rounded-md border p-2.5 text-left text-sm transition-colors', natureza === n ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-input hover:bg-accent')}
                >
                  <span className="font-medium">{NATUREZA_INFO[n].rotulo}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{NATUREZA_INFO[n].ajuda}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nota-impacto">Impacto estimado (R$, opcional)</Label>
            <Input
              id="nota-impacto"
              inputMode="decimal"
              placeholder="Ex.: 4.400.000 ou 4,4 mi"
              className={cn('sm:w-64', impactoInvalido && 'border-destructive')}
              value={impacto}
              onChange={(e) => setImpacto(e.target.value)}
            />
            {impactoNum !== null && <p className="text-xs text-muted-foreground">= {brl(impactoNum)}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nota-descricao">Descrição *</Label>
            <Textarea
              id="nota-descricao"
              rows={4}
              maxLength={4000}
              placeholder="O que aconteceu, por que afetou a arrecadação e, se souber, até quando deve durar."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nota-autor">Seu nome *</Label>
              <Input id="nota-autor" maxLength={120} value={autor} onChange={(e) => setAutor(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nota-coord">Coordenadoria *</Label>
              <Input id="nota-coord" list="nota-unidades" maxLength={160} placeholder="Comece a digitar…" value={coord} onChange={(e) => setCoord(e.target.value)} />
              <datalist id="nota-unidades">
                {UNIDADES_SEFIN.map((u) => <option key={u} value={u} />)}
              </datalist>
            </div>
          </div>

          {erro && (
            <Alert variant="destructive">
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button>
          <Button onClick={enviar} disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editando ? 'Salvar alterações' : 'Registrar nota'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Pecas reutilizadas nos graficos e tabelas
// ---------------------------------------------------------------------------

/** Botao "+ Registrar nota" (so aparece pra quem pode registrar). */
export function BotaoRegistrarNota({ inicial, size = 'sm', variant = 'outline', className }: {
  inicial?: Partial<NovaNota>;
  size?: 'sm' | 'default';
  variant?: 'outline' | 'default' | 'ghost';
  className?: string;
}) {
  const ctx = useNotasArrecadacao();
  if (!ctx?.podeRegistrar) return null;
  return (
    <Button size={size} variant={variant} className={className} onClick={() => ctx.abrirFormulario(inicial)}>
      <Plus className="h-4 w-4 mr-1.5" /> Registrar nota
    </Button>
  );
}

function BadgesNota({ n, compacto }: { n: NotaArrecadacao; compacto?: boolean }) {
  const { Icone, cor, rotulo } = EFEITO_INFO[n.efeito];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="secondary" className="font-semibold tabular-nums">{periodoNota(n)}</Badge>
      <Badge variant="outline" className="font-normal">{n.categoria}</Badge>
      <Badge variant="outline" className={cn('gap-1 font-normal', cor)}>
        <Icone className="h-3 w-3" /> {compacto ? (n.efeito === 'aumento' ? 'Aumento' : n.efeito === 'reducao' ? 'Redução' : 'Contexto') : rotulo}
      </Badge>
      <Badge variant="outline" className="font-normal">{NATUREZA_INFO[n.natureza].rotulo}</Badge>
    </div>
  );
}

/** Lista curta das notas (tooltip do grafico, popover da tabela). */
export function ResumoNotas({ notas, limite = 4 }: { notas: NotaArrecadacao[]; limite?: number }) {
  return (
    <div className="space-y-2">
      {notas.slice(0, limite).map((n) => {
        const { Icone } = EFEITO_INFO[n.efeito];
        return (
          <div key={n.id} className="space-y-0.5">
            <p className="flex items-start gap-1 text-xs font-medium leading-snug">
              <Icone className={cn('mt-0.5 h-3 w-3 shrink-0', n.efeito === 'aumento' ? 'text-emerald-600' : n.efeito === 'reducao' ? 'text-red-600' : 'text-slate-500')} />
              <span>{n.titulo}</span>
            </p>
            <p className="pl-4 text-[11px] text-muted-foreground">
              {n.categoria} · {NATUREZA_INFO[n.natureza].rotulo.toLowerCase()}{n.impacto_estimado !== null ? ` · ~${brl(n.impacto_estimado)}` : ''} · {n.autor_nome}
            </p>
          </div>
        );
      })}
      {notas.length > limite && <p className="text-[11px] text-muted-foreground">+ {notas.length - limite} nota(s) — veja a aba Notas Explicativas</p>}
    </div>
  );
}

/** Icone clicavel com as notas do mes (tabela mes a mes); sem notas, um "+" discreto no hover pra quem pode registrar. */
export function NotasDoMesBotao({ mes, categoria }: { mes: string; categoria?: string | null }) {
  const ctx = useNotasArrecadacao();
  if (!ctx) return null;
  const doMes = notasDoMes(ctx.notas, mes, categoria);
  const categoriaInicial = categoria && categoria !== 'Total' ? (categoria as CategoriaNota) : undefined;
  if (doMes.length === 0) {
    if (!ctx.podeRegistrar) return null;
    return (
      <button
        type="button"
        title={`Registrar nota para ${mesCurtoNota(mes)}`}
        onClick={(e) => { e.stopPropagation(); ctx.abrirFormulario({ periodo_inicio: mes, categoria: categoriaInicial }); }}
        className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 focus:opacity-100"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    );
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          title={`${doMes.length} nota(s) explicativa(s)`}
          className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-200 dark:bg-amber-900/60 dark:text-amber-200"
        >
          <StickyNote className="h-3 w-3" /> {doMes.length}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notas explicativas · {mesCurtoNota(mes)}</p>
        <ResumoNotas notas={doMes} limite={6} />
        {ctx.podeRegistrar && (
          <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => ctx.abrirFormulario({ periodo_inicio: mes, categoria: categoriaInicial })}>
            <Plus className="h-4 w-4 mr-1.5" /> Registrar nota para {mesCurtoNota(mes)}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Marcador desenhado no grafico (Scatter): circulo ambar com o numero de notas do mes. */
export function MarcadorNota(props: { cx?: number; cy?: number; payload?: { qtdNotas?: number } }) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload?.qtdNotas) return null;
  return (
    <g style={{ cursor: 'default' }}>
      <circle cx={cx} cy={cy} r={8} fill="#f59e0b" stroke="#fff" strokeWidth={1.5} />
      <text x={cx} y={cy} dy={3.5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#fff">{payload.qtdNotas}</text>
    </g>
  );
}

/** Caixa com as notas do mes, pra por embaixo do tooltip do grafico. */
export function TooltipNotas({ notas }: { notas: NotaArrecadacao[] }) {
  if (!notas.length) return null;
  return (
    <div className="mt-1 max-w-[18rem] rounded-lg border border-amber-300 bg-background px-2.5 py-2 shadow-xl dark:border-amber-800">
      <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
        <StickyNote className="h-3 w-3" /> Notas explicativas
      </p>
      <ResumoNotas notas={notas} limite={3} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba "Notas Explicativas": linha do tempo
// ---------------------------------------------------------------------------

export function NotasExplicativasView() {
  const ctx = useNotasArrecadacao();
  const [categoria, setCategoria] = useState<string>('todas');
  const [ano, setAno] = useState<string>('todos');
  const [natureza, setNatureza] = useState<string>('todas');
  const [busca, setBusca] = useState('');

  const notasCtx = ctx?.notas;
  const notas = useMemo(() => notasCtx ?? [], [notasCtx]);
  const anos = useMemo(
    () => Array.from(new Set(notas.flatMap((n) => {
      const a0 = Number(n.periodo_inicio.slice(0, 4));
      const a1 = Number((n.periodo_fim ?? n.periodo_inicio).slice(0, 4));
      return Array.from({ length: a1 - a0 + 1 }, (_, i) => String(a0 + i));
    }))).sort().reverse(),
    [notas]
  );

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return notas.filter((n) => {
      if (categoria !== 'todas' && n.categoria !== categoria) return false;
      if (natureza !== 'todas' && n.natureza !== natureza) return false;
      if (ano !== 'todos') {
        const a0 = n.periodo_inicio.slice(0, 4);
        const a1 = (n.periodo_fim ?? n.periodo_inicio).slice(0, 4);
        if (ano < a0 || ano > a1) return false;
      }
      if (q && !`${n.titulo} ${n.descricao} ${n.autor_nome} ${n.autor_coordenadoria}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [notas, categoria, natureza, ano, busca]);

  if (!ctx) return null;

  const exportar = () => {
    const rows = filtradas.map((n) => ({
      'Período': periodoNota(n),
      'Início': n.periodo_inicio.slice(0, 7),
      'Fim': (n.periodo_fim ?? n.periodo_inicio).slice(0, 7),
      'Categoria': n.categoria,
      'Efeito': EFEITO_INFO[n.efeito].rotulo,
      'Natureza': NATUREZA_INFO[n.natureza].rotulo,
      'Impacto estimado (R$)': n.impacto_estimado,
      'Título': n.titulo,
      'Descrição': n.descricao,
      'Autor': n.autor_nome,
      'Coordenadoria': n.autor_coordenadoria,
      'Registrada em': new Date(n.created_at).toLocaleString('pt-BR'),
      'Origem': n.origem === 'link_colaboracao' ? 'Link de colaboração' : 'Hub',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 18 }, { wch: 9 }, { wch: 9 }, { wch: 14 }, { wch: 26 }, { wch: 11 }, { wch: 16 }, { wch: 40 }, { wch: 80 }, { wch: 22 }, { wch: 40 }, { wch: 18 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Notas Explicativas');
    XLSX.writeFile(wb, 'notas-explicativas-arrecadacao.xlsx');
  };

  // agrupa por ano de inicio, mais recente primeiro
  const grupos = filtradas.reduce<Record<string, NotaArrecadacao[]>>((acc, n) => {
    (acc[n.periodo_inicio.slice(0, 4)] ??= []).push(n);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div>
            <CardTitle className="text-base">Notas Explicativas da Arrecadação</CardTitle>
            <CardDescription>
              Fatos registrados pelas coordenadorias que explicam a arrecadação de cada período. Aparecem como marcador nos gráficos e na tabela do Real × Previsto.
              {!ctx.podeGerenciar && ctx.podeRegistrar && ' Para corrigir ou excluir uma nota, fale com a Coordenadoria de Governança.'}
            </CardDescription>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="outline" onClick={exportar} disabled={!filtradas.length}><Download className="h-4 w-4 mr-1.5" /> Excel</Button>
            <BotaoRegistrarNota variant="default" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {ctx.indisponivel && (
            <Alert>
              <AlertTitle>Notas ainda não disponíveis</AlertTitle>
              <AlertDescription>A tabela de notas ainda não foi criada no banco (migration de 18/11 pendente no Lovable).</AlertDescription>
            </Alert>
          )}
          {ctx.erro && (
            <Alert variant="destructive">
              <AlertTitle>Não consegui carregar as notas</AlertTitle>
              <AlertDescription>{ctx.erro}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-wrap gap-2">
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {CATEGORIAS_NOTA.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={ano} onValueChange={setAno}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os anos</SelectItem>
                {anos.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={natureza} onValueChange={setNatureza}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Pontual e recorrente</SelectItem>
                <SelectItem value="pontual">Só pontuais</SelectItem>
                <SelectItem value="recorrente">Só recorrentes</SelectItem>
              </SelectContent>
            </Select>
            <Input className="w-full sm:w-64" placeholder="Buscar no texto, autor…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {ctx.carregando ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          {notas.length === 0 ? 'Nenhuma nota registrada ainda.' : 'Nenhuma nota com esses filtros.'}
          {notas.length === 0 && ctx.podeRegistrar && <div className="mt-3"><BotaoRegistrarNota variant="default" /></div>}
        </div>
      ) : (
        Object.keys(grupos).sort().reverse().map((a) => (
          <div key={a} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">{a}</h3>
            <ol className="relative space-y-3 border-l-2 border-amber-200 pl-5 dark:border-amber-900">
              {grupos[a].map((n) => (
                <li key={n.id} className="relative">
                  <span className="absolute -left-[27px] top-4 h-3 w-3 rounded-full border-2 border-background bg-amber-500" />
                  <Card>
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <BadgesNota n={n} />
                        {ctx.podeGerenciar && (
                          <div className="flex shrink-0 gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar" onClick={() => ctx.abrirFormulario(undefined, n)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Excluir" onClick={() => ctx.pedirExclusao(n)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        )}
                      </div>
                      <p className="font-semibold leading-snug">{n.titulo}</p>
                      <p className="whitespace-pre-line text-sm text-foreground/90">{n.descricao}</p>
                      {n.impacto_estimado !== null && (
                        <p className="text-sm"><span className="text-muted-foreground">Impacto estimado:</span> <strong className="tabular-nums">{brl(n.impacto_estimado)}</strong></p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {n.autor_nome} · {n.autor_coordenadoria} · registrada em {new Date(n.created_at).toLocaleDateString('pt-BR')}
                        {n.origem === 'link_colaboracao' && ' · via link de colaboração'}
                        {n.updated_at && new Date(n.updated_at).getTime() - new Date(n.created_at).getTime() > 60000 && ` · editada em ${new Date(n.updated_at).toLocaleDateString('pt-BR')}`}
                      </p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        ))
      )}
    </div>
  );
}
