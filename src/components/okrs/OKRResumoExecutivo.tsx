import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toPng } from 'html-to-image';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Copy, Download, Loader2 } from 'lucide-react';
import { DIRETORIAS, diretoriaDaEquipe } from '@/lib/okrDiretoria';
import { krCancelado } from '@/lib/okrStatus';
import { normalizeStatus, progressoDoKr } from '@/components/okrs/OKRDashboardGerencial';
import sefinLogo from '@/assets/sefin-logo.png.asset.json';

// ---------------------------------------------------------------------------
// Resumo Executivo dos OKRs (25/11/2026)
//
// Uma pagina-infografico pra mandar ao Secretario pelo WhatsApp: numeros
// gerais, barras por objetivo, entregas / destaques / pontos de atencao e
// uma mensagem livre da Governanca. Gera PNG (baixar ou copiar).
//
// O cartao usa cores fixas (hex), e nao as variaveis do tema, pra imagem
// sair igual no modo claro e no escuro. Mesmo criterio de progresso do
// Dashboard Gerencial (maior entre % registrado e andamento das acoes);
// KRs cancelados ficam fora dos numeros.
// ---------------------------------------------------------------------------

interface Objetivo { id: string; objetivo: string; responsavel: string | null }
interface KR {
  id: string; objetivo_id: string; kr: string; codigo: string | null; responsavel: string | null;
  status: string | null; percentual: number | null; lider: string | null; equipe: string | null;
  cancelado_em?: string | null;
}
interface Acao { id: string; key_result_id: string; acao: string; responsavel: string | null; status: string | null; prazo: string | null }

const COR = {
  texto: '#1f1f1e', suave: '#5f5e5a', fraco: '#888780', borda: '#e4e2da', fundo: '#ffffff', cartao: '#f4f3ee',
  verde: '#1D9E75', azul: '#378ADD', vermelho: '#E24B4A', ambarFundo: '#FAEEDA', ambarTexto: '#854F0B', marca: '#0C447C',
};

const hojeIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const corDoPct = (p: number) => (p >= 70 ? COR.verde : p >= 30 ? COR.azul : COR.vermelho);
const corta = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const ordemCodigo = (a: KR, b: KR) => (a.codigo || '').localeCompare(b.codigo || '', 'pt-BR', { numeric: true });

const CHAVE_MSG = 'hub-okr-resumo-mensagem';

export default function OKRResumoExecutivo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [carregando, setCarregando] = useState(true);
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [krs, setKrs] = useState<KR[]>([]);
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [diretoria, setDiretoria] = useState<string>('todas');
  const [mensagem, setMensagem] = useState<string>(() => {
    try { return localStorage.getItem(CHAVE_MSG) ?? ''; } catch { return ''; }
  });
  const [gerando, setGerando] = useState<'baixar' | 'copiar' | null>(null);
  const cartaoRef = useRef<HTMLDivElement>(null);
  // Logo embutido como data URL: a geracao do PNG nao depende de buscar nada fora.
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    if (!open || logo) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    fetch(sefinLogo.url, { signal: ctrl.signal })
      .then((r) => (r.ok && (r.headers.get('content-type') || '').startsWith('image/') ? r.blob() : null))
      .then((b) => {
        if (!b) return;
        const fr = new FileReader();
        fr.onload = () => setLogo(String(fr.result));
        fr.readAsDataURL(b);
      })
      .catch(() => { /* sem logo: cartao sai sem ele */ })
      .finally(() => clearTimeout(t));
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [open, logo]);

  useEffect(() => {
    if (!open) return;
    setCarregando(true);
    Promise.all([
      supabase.from('okr_objetivos').select('*'),
      supabase.from('okr_key_results').select('*'),
      supabase.from('okr_acoes').select('*'),
    ]).then(([o, k, a]) => {
      const erro = o.error || k.error || a.error;
      if (erro) toast({ title: 'Erro ao carregar OKRs', description: erro.message, variant: 'destructive' });
      setObjetivos((o.data ?? []) as Objetivo[]);
      setKrs((k.data ?? []) as KR[]);
      setAcoes((a.data ?? []) as Acao[]);
      setCarregando(false);
    });
  }, [open, toast]);

  const salvarMensagem = (v: string) => {
    setMensagem(v);
    try { localStorage.setItem(CHAVE_MSG, v); } catch { /* sem storage */ }
  };

  const resumo = useMemo(() => {
    const hoje = hojeIso();
    const fimAno = `${hoje.slice(0, 4)}-12-31`;
    const daDiretoria = (k: KR) => diretoria === 'todas' || diretoriaDaEquipe(k.equipe) === diretoria;
    const todos = krs.filter(daDiretoria);
    const ativos = todos.filter((k) => !krCancelado(k));
    const cancelados = todos.length - ativos.length;
    const acoesPorKr = new Map<string, Acao[]>();
    acoes.forEach((a) => acoesPorKr.set(a.key_result_id, [...(acoesPorKr.get(a.key_result_id) ?? []), a]));

    const krsComPct = ativos.map((k) => ({ k, p: progressoDoKr(k, acoesPorKr.get(k.id) ?? []) }));
    const acoesAtivas = ativos.flatMap((k) => acoesPorKr.get(k.id) ?? []).filter((a) => normalizeStatus(a.status) !== 'Cancelado');
    const aberta = (a: Acao) => normalizeStatus(a.status) !== 'Concluído';
    const vencidas = acoesAtivas.filter((a) => aberta(a) && a.prazo && a.prazo.slice(0, 10) < hoje);
    const vencemAteFimAno = acoesAtivas.filter((a) => aberta(a) && a.prazo && a.prazo.slice(0, 10) >= hoje && a.prazo.slice(0, 10) <= fimAno);

    const media = krsComPct.length ? Math.round(krsComPct.reduce((s, x) => s + x.p.pct, 0) / krsComPct.length) : 0;
    const concluidosKr = krsComPct.filter((x) => x.p.pct >= 100 || normalizeStatus(x.k.status) === 'Concluído');

    const porObjetivo = objetivos
      .map((o) => {
        const lista = krsComPct.filter((x) => x.k.objetivo_id === o.id);
        if (!lista.length) return null;
        return {
          id: o.id,
          nome: o.objetivo.replace(/[​\s]+$/g, '').replace(/\.$/, ''),
          area: o.responsavel,
          pct: Math.round(lista.reduce((s, x) => s + x.p.pct, 0) / lista.length),
          nKrs: lista.length,
        };
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => b.pct - a.pct);

    const destaques = krsComPct
      .filter((x) => !concluidosKr.includes(x) && x.p.pct >= 50)
      .sort((a, b) => b.p.pct - a.p.pct)
      .slice(0, 3);
    const parados = krsComPct.filter((x) => x.p.pct < 20).sort((a, b) => ordemCodigo(a.k, b.k));

    // KRs com mais acoes vencidas (pra dizer onde esta o atraso)
    const vencidasPorKr = new Map<string, number>();
    vencidas.forEach((a) => vencidasPorKr.set(a.key_result_id, (vencidasPorKr.get(a.key_result_id) ?? 0) + 1));
    const krsComVencidas = [...vencidasPorKr.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, n]) => ({ codigo: ativos.find((k) => k.id === id)?.codigo || 'KR', n }));

    return {
      hoje, media, nKrs: ativos.length, concluidosKr, cancelados,
      nAcoes: acoesAtivas.length, acoesConcluidas: acoesAtivas.length - acoesAtivas.filter(aberta).length,
      vencidas: vencidas.length, vencemAteFimAno: vencemAteFimAno.length,
      porObjetivo, destaques, parados, krsComVencidas,
    };
  }, [krs, acoes, objetivos, diretoria]);

  const gerarPng = async () => {
    if (!cartaoRef.current) throw new Error('Cartão não encontrado');
    const gerar = toPng(cartaoRef.current, {
      pixelRatio: 2,
      backgroundColor: COR.fundo,
      // fontes do sistema no cartao: nao embute webfonts (evita buscar CSS externo)
      skipFonts: true,
      imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    });
    const limite = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Tempo esgotado ao gerar a imagem. Tente de novo.')), 20000));
    return Promise.race([gerar, limite]);
  };

  const nomeArquivo = `resumo-okrs-sefin-${resumo.hoje}.png`;

  const baixar = async () => {
    setGerando('baixar');
    try {
      const url = await gerarPng();
      const a = document.createElement('a');
      a.href = url;
      a.download = nomeArquivo;
      a.click();
      toast({ title: 'Imagem baixada', description: 'Anexe no WhatsApp como foto.' });
    } catch (e) {
      toast({ title: 'Não consegui gerar a imagem', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setGerando(null);
    }
  };

  const copiar = async () => {
    setGerando('copiar');
    try {
      const url = await gerarPng();
      const blob = await (await fetch(url)).blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast({ title: 'Imagem copiada', description: 'Cole (Ctrl+V) direto na conversa do WhatsApp Web.' });
    } catch (e) {
      toast({ title: 'Não consegui copiar', description: 'Seu navegador bloqueou a cópia de imagem. Use "Baixar imagem".', variant: 'destructive' });
    } finally {
      setGerando(null);
    }
  };

  if (!open) return null;

  const dataBR = new Date(`${resumo.hoje}T12:00:00`).toLocaleDateString('pt-BR');
  const titulo = diretoria === 'todas' ? 'OKRs SEFIN 2026' : `OKRs · ${diretoria}`;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-2 rounded-full">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div>
            <h2 className="text-lg font-semibold leading-tight">Resumo Executivo</h2>
            <p className="text-xs text-muted-foreground">Infográfico dos OKRs para enviar ao Secretário</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copiar} disabled={!!gerando || carregando}>
            {gerando === 'copiar' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Copy className="h-4 w-4 mr-2" />}
            Copiar imagem
          </Button>
          <Button onClick={baixar} disabled={!!gerando || carregando}>
            {gerando === 'baixar' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Baixar imagem (PNG)
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:items-start">
          {/* Controles */}
          <div className="w-full space-y-4 lg:sticky lg:top-0 lg:w-72 lg:shrink-0">
            <div className="space-y-1.5">
              <Label>Diretoria</Label>
              <Select value={diretoria} onValueChange={setDiretoria}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Toda a SEFIN</SelectItem>
                  {DIRETORIAS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="msg-governanca">Mensagem da Governança</Label>
              <Textarea
                id="msg-governanca"
                rows={6}
                maxLength={400}
                placeholder="Sua leitura em 2 ou 3 frases. Ex.: Objetivos de orçamento e arrecadação avançados; atenção às ações vencidas em processos, com replanejamento previsto para dezembro."
                value={mensagem}
                onChange={(e) => salvarMensagem(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{mensagem.length}/400 · opcional; fica salva neste navegador.</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Progresso de cada KR = maior entre o % registrado e o andamento das ações (mesmo critério do Dashboard Gerencial). KRs cancelados ficam fora dos números.
            </p>
            <p className="text-xs text-muted-foreground">
              Antes de enviar, confira se as ações vencidas estão atrasadas mesmo ou só sem atualização no Hub.
            </p>
          </div>

          {/* Cartao (vira a imagem) */}
          <div className="min-w-0 flex-1 overflow-x-auto rounded-lg border bg-muted/30 p-3">
            {carregando ? (
              <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div
                ref={cartaoRef}
                style={{ width: 900, background: COR.fundo, color: COR.texto, fontFamily: 'Inter, "Segoe UI", Arial, sans-serif', padding: 36, boxSizing: 'border-box', margin: '0 auto' }}
              >
                {/* Cabecalho */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderBottom: `3px solid ${COR.marca}`, paddingBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {logo && <img src={logo} alt="" style={{ height: 52, width: 'auto', objectFit: 'contain' }} />}
                    <div>
                      <div style={{ fontSize: 26, fontWeight: 700, color: COR.marca, lineHeight: 1.2 }}>{titulo}</div>
                      <div style={{ fontSize: 15, color: COR.suave, marginTop: 2 }}>Resumo executivo · situação em {dataBR}</div>
                    </div>
                  </div>
                  {resumo.vencidas > 0 && (
                    <div style={{ background: COR.ambarFundo, color: COR.ambarTexto, borderRadius: 8, padding: '8px 14px', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      ⚠ {resumo.vencidas} {resumo.vencidas === 1 ? 'ação vencida' : 'ações vencidas'}
                    </div>
                  )}
                </div>

                {/* Numeros */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 22 }}>
                  {[
                    { rotulo: 'Progresso médio', valor: `${resumo.media}%`, sub: `${resumo.nKrs} KRs ativos` },
                    { rotulo: 'KRs concluídos', valor: `${resumo.concluidosKr.length} de ${resumo.nKrs}`, sub: resumo.nKrs ? `${Math.round((resumo.concluidosKr.length / resumo.nKrs) * 100)}% dos KRs` : '' },
                    { rotulo: 'Ações concluídas', valor: `${resumo.acoesConcluidas} de ${resumo.nAcoes}`, sub: resumo.nAcoes ? `${Math.round((resumo.acoesConcluidas / resumo.nAcoes) * 100)}% do plano` : '' },
                    { rotulo: 'Vencem até 31/12', valor: String(resumo.vencemAteFimAno), sub: 'ações em aberto' },
                  ].map((m) => (
                    <div key={m.rotulo} style={{ background: COR.cartao, borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ fontSize: 13, color: COR.suave }}>{m.rotulo}</div>
                      <div style={{ fontSize: 30, fontWeight: 700, marginTop: 2, lineHeight: 1.15 }}>{m.valor}</div>
                      <div style={{ fontSize: 12, color: COR.fraco, marginTop: 2 }}>{m.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Barras por objetivo */}
                <div style={{ marginTop: 26 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Progresso por objetivo</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px 52px', columnGap: 16, rowGap: 12, alignItems: 'center' }}>
                    {resumo.porObjetivo.map((o) => (
                      <div key={o.id} style={{ display: 'contents' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, lineHeight: 1.3 }}>{corta(o.nome, 95)}</div>
                          <div style={{ fontSize: 12, color: COR.fraco }}>{o.area ? `${o.area} · ` : ''}{o.nKrs} KR{o.nKrs > 1 ? 's' : ''}</div>
                        </div>
                        <div style={{ height: 14, background: COR.cartao, borderRadius: 7, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.max(o.pct, 2)}%`, height: 14, background: corDoPct(o.pct), borderRadius: 7 }} />
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, textAlign: 'right', color: corDoPct(o.pct) }}>{o.pct}%</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: COR.fraco }}>
                    {[[COR.verde, '70% ou mais'], [COR.azul, '30% a 69%'], [COR.vermelho, 'abaixo de 30%']].map(([c, t]) => (
                      <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 5, background: c, display: 'inline-block' }} />{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tres colunas */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginTop: 26 }}>
                  <Coluna cor={COR.verde} titulo="✓ Entregas">
                    {resumo.concluidosKr.length === 0 ? (
                      <Item>Nenhum KR concluído ainda.</Item>
                    ) : (
                      resumo.concluidosKr.slice(0, 4).map(({ k }) => <Item key={k.id}><b>{k.codigo}</b> {corta(k.kr, 80)}</Item>)
                    )}
                    {resumo.concluidosKr.length > 4 && <Item>+ {resumo.concluidosKr.length - 4} KR(s)</Item>}
                  </Coluna>
                  <Coluna cor={COR.azul} titulo="► Destaques em andamento">
                    {resumo.destaques.length === 0 ? (
                      <Item>Nenhum KR acima de 50% ainda.</Item>
                    ) : (
                      resumo.destaques.map(({ k, p }) => <Item key={k.id}><b>{k.codigo} · {p.pct}%</b> {corta(k.kr, 70)}</Item>)
                    )}
                  </Coluna>
                  <Coluna cor={COR.vermelho} titulo="! Pontos de atenção">
                    {resumo.parados.map(({ k, p }) => <Item key={k.id}><b>{k.codigo} · {p.pct}%</b> {corta(k.kr, 60)}</Item>)}
                    {resumo.vencidas > 0 && (
                      <Item>
                        <b>{resumo.vencidas} {resumo.vencidas === 1 ? 'ação vencida' : 'ações vencidas'}</b>
                        {resumo.krsComVencidas.length > 0 && ` (${resumo.krsComVencidas.slice(0, 4).map((x) => `${x.codigo}: ${x.n}`).join(', ')}${resumo.krsComVencidas.length > 4 ? '…' : ''})`}
                      </Item>
                    )}
                    {resumo.parados.length === 0 && resumo.vencidas === 0 && <Item>Sem pontos críticos no momento.</Item>}
                  </Coluna>
                </div>

                {/* Mensagem */}
                {mensagem.trim() && (
                  <div style={{ marginTop: 24, background: COR.cartao, borderLeft: `4px solid ${COR.marca}`, padding: '14px 18px', fontSize: 15, lineHeight: 1.5 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: COR.marca, marginBottom: 4 }}>MENSAGEM DA GOVERNANÇA</div>
                    <div style={{ whiteSpace: 'pre-line' }}>{mensagem.trim()}</div>
                  </div>
                )}

                {/* Rodape */}
                <div style={{ marginTop: 24, paddingTop: 12, borderTop: `1px solid ${COR.borda}`, display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11, color: COR.fraco }}>
                  <span>Fonte: Hub de Governança SEFIN/TJCE · {dataBR}</span>
                  <span>
                    Progresso = maior entre % registrado e andamento das ações
                    {resumo.cancelados > 0 && ` · ${resumo.cancelados} KR${resumo.cancelados > 1 ? 's' : ''} cancelado${resumo.cancelados > 1 ? 's' : ''} fora dos números`}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Coluna({ cor, titulo, children }: { cor: string; titulo: string; children: ReactNode }) {
  return (
    <div style={{ borderTop: `4px solid ${cor}`, paddingTop: 10 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: cor, marginBottom: 8 }}>{titulo}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  );
}

function Item({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 13, lineHeight: 1.4, color: COR.texto }}>{children}</div>;
}
