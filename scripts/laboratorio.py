"""
Laboratorio de Modelos - previsao de arrecadacao (26/11/2026)

Roda DEPOIS do forecast.py, na mesma execucao, e acrescenta a chave
"laboratorio" ao previsao.json. Nao altera a projecao oficial
(categorias/cenarios_futuros): produz uma projecao DESAFIANTE, lado a lado,
para a equipe comparar e decidir se promove.

Fases da proposta "Previsao da Arrecadacao - Proposta de Aprofundamento dos
Modelos" implementadas aqui:
  1. Backtest multi-origem (cortes a cada 3 meses, 12 meses a frente) com
     Naive Sazonal, ETS, Theta, ARIMA e a combinacao ETS+Theta+ARIMA;
     erro no total de 12 meses, vies e faixas de 80% calibradas pelos
     erros reais (abordagem conforme, por quantis empiricos).
  2. Premissas economicas do Focus/BCB (Selic e IPCA anuais), buscadas a
     cada execucao (com valores de reserva se a API nao responder).
  3. Rendimento estrutural, a partir da memoria de calculo de precatorios:
       Rendimento = remuneracao dos depositos judiciais
                      (saldo remuneravel x taxa contratual 0,28% a.m.)
                  + rendimento das aplicacoes proprias
                      (saldo implicito x Selic mensal)

Desafiante por categoria:
  - Judicial e Extra Judicial: combinacao ETS+Theta+ARIMA (sobre log), com
    correcao do vies medido no backtest quando o vies tem sinal consistente.
  - Rendimento: modelo estrutural acima.
  - Depois de dez/2027 (todas): cresce IPCA Focus do ano + crescimento real
    (premissa), +- 2 p.p. nos cenarios conservador/otimista.

Uso:
    python scripts/laboratorio.py --base-path dados/BASE.xlsx \
        --depositos dados/rendimento_depositos_judiciais.csv \
        --previsao previsao.json
"""

import argparse
import json
import sys
import urllib.parse
import urllib.request
import warnings
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

CATEGORIAS = {
    "Judicial": "Tipo Judiciais",
    "Extra Judicial": "Tipo Extra Judiciais",
    "Rendimento": "Tipo Rendimento",
}

# Focus de 19/11/2026 (medianas anuais) - usado so se a API do BCB nao responder.
FOCUS_RESERVA = {
    "data": "2026-11-19",
    "Selic": {2026: 13.75, 2027: 13.00, 2028: 11.00, 2029: 10.50, 2030: 10.25},
    "IPCA": {2026: 5.1505, 2027: 5.1214, 2028: 4.00, 2029: 4.00, 2030: 3.95},
    "PIB Total": {2026: 1.7018, 2027: 0.9995, 2028: 1.7071, 2029: 2.00, 2030: 2.00},
}
URL_SGS_IPCA = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=01/01/2018"
URL_FOCUS = "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais"

# Longo prazo (depois de dez/2027), aprovado pelo Julio em 26/11/2026:
#   conservador = IPCA Focus (0% real)
#   base        = IPCA Focus + PIB Focus do ano (receita acompanha a economia)
#   otimista    = IPCA Focus + crescimento real medio historico da categoria
#                 (12 meses mais recentes contra os 12 meses de 4 anos antes,
#                 deflacionado pelo IPCA oficial SGS 433)
ANOS_HISTORICO_REAL = 4
REAL_HISTORICO_RESERVA = {"Judicial": 0.084, "Extra Judicial": 0.067}  # medido em 26/11/2026 (out/26 vs out/22)
TAXA_DJ_MES = 0.0028             # taxa contratual da remuneracao dos depositos judiciais (memoria de calculo)
N_JANELAS = 7
PASSO = 3
H_BACKTEST = 12

NOMES_MODELOS = {
    "SeasonalNaive": "Naive Sazonal",
    "AutoETS": "ETS",
    "AutoTheta": "Theta",
    "AutoARIMA": "ARIMA sazonal",
    "Combinacao": "Combinação ETS+Theta+ARIMA",
}
COMBINA = ["AutoETS", "AutoTheta", "AutoARIMA"]


# ---------------------------------------------------------------------------
# Premissas: Focus / BCB
# ---------------------------------------------------------------------------
def buscar_focus(timeout: int = 20) -> dict:
    """Medianas anuais mais recentes de Selic e IPCA (baseCalculo 0)."""
    out = {"fonte": "BCB - Expectativas de Mercado (Focus), API Olinda", "reserva": False}
    try:
        for indicador in ("Selic", "IPCA", "PIB Total"):
            params = {
                "$top": "40",
                "$filter": f"Indicador eq '{indicador}' and baseCalculo eq 0",
                "$orderby": "Data desc",
                "$format": "json",
                "$select": "Indicador,Data,DataReferencia,Mediana",
            }
            url = URL_FOCUS + "?" + urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
            with urllib.request.urlopen(url, timeout=timeout) as r:
                valores = json.load(r)["value"]
            if not valores:
                raise ValueError(f"Focus sem dados para {indicador}")
            data_mais_recente = valores[0]["Data"]
            anos = {int(v["DataReferencia"]): float(v["Mediana"]) for v in valores if v["Data"] == data_mais_recente}
            out[indicador] = anos
            out["data"] = data_mais_recente
    except Exception as erro:  # sem rede / API fora: usa a reserva e avisa
        print(f"  aviso: Focus indisponivel ({erro}); usando valores de reserva de {FOCUS_RESERVA['data']}")
        out = {"fonte": "Valores de reserva (Focus de " + FOCUS_RESERVA["data"] + ")", "reserva": True, **FOCUS_RESERVA}
    return out


def crescimento_real_historico(df: pd.DataFrame, timeout: int = 20) -> tuple[dict, str]:
    """CAGR real por categoria: soma dos 12 meses mais recentes contra a dos 12
    meses terminados ANOS_HISTORICO_REAL anos antes, cada uma deflacionada pela
    media do indice IPCA na janela. IPCA oficial (SGS 433); sem a API, usa a reserva."""
    try:
        with urllib.request.urlopen(URL_SGS_IPCA, timeout=timeout) as r:
            ip = pd.DataFrame(json.load(r))
        ip["data"] = pd.to_datetime(ip["data"], dayfirst=True)
        indice = (1 + ip.set_index("data")["valor"].astype(float) / 100).cumprod()
        fim = df.index[-1]
        ini = fim - pd.DateOffset(months=11)
        fim0 = fim - pd.DateOffset(years=ANOS_HISTORICO_REAL)
        ini0 = fim0 - pd.DateOffset(months=11)
        out = {}
        for cat in REAL_HISTORICO_RESERVA:
            col = CATEGORIAS[cat]
            agora = df.loc[ini:fim, col].sum() / indice.loc[ini:fim].mean()
            antes = df.loc[ini0:fim0, col].sum() / indice.loc[ini0:fim0].mean()
            out[cat] = float((agora / antes) ** (1 / ANOS_HISTORICO_REAL) - 1)
        return out, f"12 meses até {fim:%m/%Y} contra 12 meses até {fim0:%m/%Y}, deflacionado pelo IPCA (BCB SGS 433)"
    except Exception as erro:
        print(f"  aviso: IPCA SGS indisponivel ({erro}); usando crescimento real historico de reserva")
        return dict(REAL_HISTORICO_RESERVA), "valores de reserva medidos em 26/11/2026 (12 meses até out/26 contra out/22)"


def valor_ano(serie: dict, ano: int) -> float:
    """Valor do ano; depois do ultimo ano publicado, repete o ultimo."""
    anos = sorted(serie)
    if ano in serie:
        return serie[ano]
    return serie[anos[-1]] if ano > anos[-1] else serie[anos[0]]


def caminho_selic_mensal(selic_ultima: float, ultimo_mes: pd.Timestamp, datas: pd.DatetimeIndex, focus_selic: dict) -> pd.Series:
    """Selic anual (decimal) mes a mes: interpola linearmente entre o ultimo valor
    observado e a mediana Focus de fim de cada ano (dezembro)."""
    pontos = {ultimo_mes: selic_ultima}
    for ano in range(ultimo_mes.year, datas[-1].year + 1):
        dez = pd.Timestamp(year=ano, month=12, day=1)
        if dez > ultimo_mes:
            pontos[dez] = valor_ano(focus_selic, ano) / 100
    s = pd.Series(pontos).sort_index()
    idx = pd.date_range(s.index[0], max(datas[-1], s.index[-1]), freq="MS")
    s = s.reindex(idx).interpolate(method="linear")
    return s.reindex(datas).ffill()


# ---------------------------------------------------------------------------
# Fase 1: backtest multi-origem
# ---------------------------------------------------------------------------
def montar_long(df: pd.DataFrame) -> pd.DataFrame:
    partes = []
    for cat, col in CATEGORIAS.items():
        y = df[col].astype(float).replace(0, np.nan).interpolate().clip(lower=1)
        partes.append(pd.DataFrame({"unique_id": cat, "ds": df.index, "y": np.log(y.values)}))
    return pd.concat(partes, ignore_index=True)


def modelos_sf():
    from statsforecast.models import AutoARIMA, AutoETS, AutoTheta, SeasonalNaive

    return [SeasonalNaive(season_length=12), AutoETS(season_length=12), AutoTheta(season_length=12), AutoARIMA(season_length=12)]


def rodar_backtest(long: pd.DataFrame) -> pd.DataFrame:
    from statsforecast import StatsForecast

    sf = StatsForecast(models=modelos_sf(), freq="MS", n_jobs=1)
    cv = sf.cross_validation(df=long, h=H_BACKTEST, n_windows=N_JANELAS, step_size=PASSO)
    for m in ["SeasonalNaive"] + COMBINA + ["y"]:
        cv[m] = np.exp(cv[m])
    cv["Combinacao"] = cv[COMBINA].mean(axis=1)
    cv["h"] = cv.groupby(["unique_id", "cutoff"]).cumcount() + 1
    return cv


def metricas_backtest(cv: pd.DataFrame) -> dict:
    modelos = list(NOMES_MODELOS)
    por_cat = {}
    for cat, g_cat in list(cv.groupby("unique_id")) + [("Total", cv.groupby(["cutoff", "ds", "h"])[modelos + ["y"]].sum().reset_index())]:
        linhas = {}
        for m in modelos:
            mapes, erros12 = [], []
            for _, g in g_cat.groupby("cutoff"):
                mapes.append(float(np.mean(np.abs(g[m] - g["y"]) / g["y"]) * 100))
                erros12.append(float((g[m].sum() / g["y"].sum() - 1) * 100))
            linhas[m] = {
                "nome": NOMES_MODELOS[m],
                "mape_mensal": round(float(np.mean(mapes)), 2),
                "erro_abs_12m": round(float(np.mean(np.abs(erros12))), 2),
                "vies_12m": round(float(np.mean(erros12)), 2),
                "erros_12m_por_janela": [round(e, 2) for e in erros12],
            }
        por_cat[cat] = linhas
    return por_cat


def correcao_vies(erros12: list[float]) -> tuple[float, bool]:
    """Fator multiplicativo que desfaz o vies medio do total de 12 meses, aplicado
    so se o erro teve o mesmo sinal em pelo menos 5 de cada 7 janelas.
    Limitado a [0,90; 1,15]."""
    e = np.array(erros12) / 100
    consistente = max((e < 0).mean(), (e > 0).mean()) >= 5 / 7
    if not consistente:
        return 1.0, False
    fator = 1 / (1 + e.mean())
    return float(np.clip(fator, 0.90, 1.15)), True


def faixas_empiricas(cv: pd.DataFrame, cat: str, fator: float) -> dict:
    """Quantis 10%/90% de real / previsto (combinacao ja corrigida) por bloco de
    horizonte: 1-6 e 7-12 meses a frente. Abordagem conforme por quantis."""
    g = cv[cv.unique_id == cat]
    razao = g["y"] / (g["Combinacao"] * fator)
    out = {}
    for nome, filtro in (("h1_6", g["h"] <= 6), ("h7_12", g["h"] > 6)):
        r = razao[filtro]
        lo, hi = np.quantile(r, [0.10, 0.90])
        out[nome] = [round(float(min(lo, 1.0)), 4), round(float(max(hi, 1.0)), 4)]
    return out


# ---------------------------------------------------------------------------
# Projecao desafiante
# ---------------------------------------------------------------------------
def projetar_combinacao(long: pd.DataFrame, h: int) -> pd.DataFrame:
    from statsforecast import StatsForecast

    sf = StatsForecast(models=modelos_sf()[1:], freq="MS", n_jobs=1)
    fc = sf.forecast(df=long[long.unique_id != "Rendimento"], h=h)
    if "unique_id" not in fc.columns:
        fc = fc.reset_index()
    for m in COMBINA:
        fc[m] = np.exp(fc[m])
    fc["Combinacao"] = fc[COMBINA].mean(axis=1)
    return fc


def estender_anual(base_mensal: pd.Series, ate: pd.Timestamp, taxa_ano) -> pd.Series:
    """De jan do ano seguinte ao fim da serie mensal ate `ate`: repete o padrao
    mensal do ultimo ano e cresce taxa_ano(ano) (nominal, decimal), composta."""
    ultimo_ano = base_mensal.index[-1].year
    padrao = base_mensal[base_mensal.index.year == ultimo_ano]
    valores = {}
    fator = 1.0
    for ano in range(ultimo_ano + 1, ate.year + 1):
        fator *= 1 + taxa_ano(ano)
        for mes, v in padrao.items():
            valores[pd.Timestamp(year=ano, month=mes.month, day=1)] = v * fator
    return pd.Series(valores, dtype=float)


def rendimento_estrutural(df: pd.DataFrame, dj: pd.DataFrame, datas: pd.DatetimeIndex, focus: dict) -> dict:
    """Rendimento = depositos judiciais (saldo remuneravel x 0,28% a.m.) + aplicacoes (saldo x Selic/12)."""
    rend = df["Tipo Rendimento"].astype(float)
    selic = df["Selic (%)"].astype(float)
    selic = selic.where(selic < 1, selic / 100)  # aceita 13,65 ou 0,1365

    dj = dj.copy()
    dj.index = pd.to_datetime(dj["mes"])
    comum = dj.index.intersection(rend.index)
    aplic_hist = rend.loc[comum] - dj.loc[comum, "resultado_mes"]
    saldo_aplic_impl = aplic_hist / (selic.loc[comum] / 12)

    # saldos de partida
    saldo_dj_base = float(dj["saldo_remuneravel_medio"].iloc[-3:].mean())
    saldo_aplic_base = float(saldo_aplic_impl.iloc[-12:].median())
    cresc_dj_12m = float(dj["saldo_remuneravel_medio"].iloc[-1] / dj["saldo_remuneravel_medio"].iloc[-13] - 1) if len(dj) >= 13 else 0.10

    ultimo = rend.index[-1]
    selic_fut = caminho_selic_mensal(float(selic.iloc[-1]), ultimo, datas, focus["Selic"])

    # crescimento anual do saldo dos depositos por cenario
    def cresc_dj(nome, ano):
        ipca = valor_ano(focus["IPCA"], ano) / 100
        # otimista: o crescimento observado nos ultimos 12 meses, limitado a IPCA + 5 p.p.
        return {"conservador": 0.0, "base": ipca, "otimista": float(np.clip(cresc_dj_12m, ipca, ipca + 0.05))}[nome]

    fator_aplic = {"conservador": 0.9, "base": 1.0, "otimista": 1.1}
    cen, comp = {}, {}
    for nome in ("conservador", "base", "otimista"):
        dj_vals, ap_vals = [], []
        for i, d in enumerate(datas):
            meses = i + 1
            g = cresc_dj(nome, d.year)
            saldo = saldo_dj_base * (1 + g) ** (meses / 12)
            dj_vals.append(saldo * TAXA_DJ_MES)
            ap_vals.append(saldo_aplic_base * fator_aplic[nome] * selic_fut.loc[d] / 12)
        dj_s, ap_s = pd.Series(dj_vals, index=datas), pd.Series(ap_vals, index=datas)
        cen[nome] = dj_s + ap_s
        comp[nome] = {"depositos_judiciais": dj_s, "aplicacoes": ap_s}

    # aderencia no periodo com dados (abr/25 em diante): aplicacoes com o saldo implicito mediano
    ajuste = dj.loc[comum, "resultado_mes"] + saldo_aplic_base * selic.loc[comum] / 12
    mape_aderencia = float(np.mean(np.abs(ajuste - rend.loc[comum]) / rend.loc[comum]) * 100)
    razao = (rend.loc[comum] / ajuste).values
    lo, hi = np.quantile(razao, [0.10, 0.90])

    return {
        "cenarios": cen,
        "componentes": comp,
        "selic_mensal": selic_fut,
        "faixa": [float(min(lo, 1.0)), float(max(hi, 1.0))],
        "historico": {
            "depositos_judiciais": dj.loc[comum, "resultado_mes"],
            "aplicacoes": aplic_hist,
            "saldo_remuneravel": dj["saldo_remuneravel_medio"],
        },
        "premissas": {
            "taxa_depositos_mes": TAXA_DJ_MES,
            "saldo_depositos_base": round(saldo_dj_base, 2),
            "crescimento_saldo_depositos_12m_observado": round(cresc_dj_12m, 4),
            "saldo_aplicacoes_implicito": round(saldo_aplic_base, 2),
            "mape_aderencia_pct": round(mape_aderencia, 2),
            "periodo_dados": [comum[0].strftime("%Y-%m"), comum[-1].strftime("%Y-%m")],
        },
    }


def br(v: float, casas: int = 2) -> str:
    """Numero no formato brasileiro (virgula decimal) para os textos exibidos no Hub."""
    return f"{v:,.{casas}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def serie_json(s: pd.Series) -> dict:
    return {d.strftime("%Y-%m-%d"): round(float(v), 2) for d, v in s.items() if pd.notna(v)}


def totais_por_ano(cen: dict) -> dict:
    out = {}
    for nome, s in cen.items():
        for ano, v in s.groupby(s.index.year).sum().items():
            out.setdefault(str(ano), {})[nome] = round(float(v), 2)
    return out


# ---------------------------------------------------------------------------
def rodar(base_path: str, depositos_path: str, ate_ano: int | None = None) -> dict:
    df = pd.read_excel(base_path)
    df["Data"] = pd.to_datetime(df["Data"])
    df = df.sort_values("Data").set_index("Data")
    df = df[df[list(CATEGORIAS.values())].notna().all(axis=1)]
    ultimo = df.index[-1]
    ate = pd.Timestamp(year=ate_ano or 2032, month=12, day=1)
    datas = pd.date_range(ultimo + pd.DateOffset(months=1), ate, freq="MS")
    fim_modelo = pd.Timestamp(year=max(ultimo.year + 1, 2027), month=12, day=1)
    datas_modelo = datas[datas <= fim_modelo]

    print("Laboratorio: buscando Focus...")
    focus = buscar_focus()
    print(f"  Focus {focus['data']}: Selic {focus['Selic']} | IPCA {focus['IPCA']} | PIB {focus['PIB Total']}")
    real_hist, real_hist_desc = crescimento_real_historico(df)
    print(f"  crescimento real historico: {real_hist}")

    print("Laboratorio: backtest multi-origem...")
    long = montar_long(df)
    cv = rodar_backtest(long)
    metricas = metricas_backtest(cv)
    cortes = sorted(pd.to_datetime(cv["cutoff"]).dt.strftime("%Y-%m").unique().tolist())

    print("Laboratorio: projecao desafiante...")
    fc = projetar_combinacao(long, len(datas_modelo))
    desafiante, metodo, correcoes, faixas_out = {}, {}, {}, {}
    for cat in ("Judicial", "Extra Judicial"):
        fator, consistente = correcao_vies(metricas[cat]["Combinacao"]["erros_12m_por_janela"])
        correcoes[cat] = {"fator": round(fator, 4), "aplicada": consistente, "vies_medio_12m_pct": metricas[cat]["Combinacao"]["vies_12m"]}
        faixa = faixas_empiricas(cv, cat, fator)
        faixas_out[cat] = faixa
        g = fc[fc.unique_id == cat].set_index("ds")["Combinacao"] * fator
        g.index = pd.to_datetime(g.index)
        g = g.reindex(datas_modelo)
        h = np.arange(1, len(g) + 1)
        lo = np.where(h <= 6, faixa["h1_6"][0], faixa["h7_12"][0])
        hi = np.where(h <= 6, faixa["h1_6"][1], faixa["h7_12"][1])
        cen = {"conservador": g * lo, "base": g, "otimista": g * hi}
        def ipca(a):
            return valor_ano(focus["IPCA"], a) / 100

        taxas = {
            "conservador": lambda a: ipca(a),
            "base": lambda a: ipca(a) + valor_ano(focus["PIB Total"], a) / 100,
            "otimista": lambda a, c=cat: ipca(a) + real_hist[c],
        }
        # 2027: faixa de 80% dos erros reais; de 2028 em diante os 3 cenarios partem
        # do padrao mensal BASE de 2027 e diferem so pela premissa de crescimento
        cen = {nome: pd.concat([cen[nome], estender_anual(g, ate, taxas[nome])]) for nome in cen}
        desafiante[cat] = cen
        metodo[cat] = (
            f"Combinação ETS + Theta + ARIMA sobre log, de {datas_modelo[0]:%m/%Y} a {datas_modelo[-1]:%m/%Y}"
            + (f", corrigida pelo viés do backtest (×{br(fator, 3)})" if consistente else ", sem correção de viés (viés sem sinal consistente)")
            + "; faixa de 80% calibrada pelos erros reais. Depois de 2027: conservador = IPCA Focus; base = IPCA + PIB Focus; "
            + f"otimista = IPCA + {br(real_hist[cat] * 100, 1)}% real (média histórica da categoria)."
        )

    dj = pd.read_csv(depositos_path)
    est = rendimento_estrutural(df, dj, datas, focus)
    # cenarios = premissas de saldo (conservador/otimista); a faixa empirica da
    # aderencia so entra ate dez/2027, como nas outras categorias
    lo_r, hi_r = est["faixa"]
    ate_2027 = np.asarray(datas <= fim_modelo)
    rend_cen = {
        "conservador": est["cenarios"]["conservador"] * np.where(ate_2027, lo_r, 1.0),
        "base": est["cenarios"]["base"],
        "otimista": est["cenarios"]["otimista"] * np.where(ate_2027, hi_r, 1.0),
    }
    desafiante["Rendimento"] = rend_cen
    p = est["premissas"]
    metodo["Rendimento"] = (
        f"Estrutural: depósitos judiciais (saldo remunerável de R$ {br(p['saldo_depositos_base']/1e9)} bi × {br(TAXA_DJ_MES*100)}% a.m., "
        f"saldo crescendo pelo IPCA Focus) + aplicações (saldo implícito de R$ {br(p['saldo_aplicacoes_implicito']/1e9)} bi × Selic Focus mensal)."
    )

    total = {nome: sum(desafiante[c][nome] for c in desafiante) for nome in ("conservador", "base", "otimista")}

    return {
        "gerado_em": datetime.now(timezone.utc).isoformat(),
        "versao": 2,
        "premissas": {
            "focus": {
                "fonte": focus["fonte"],
                "data_referencia": focus["data"],
                "reserva": focus["reserva"],
                "selic_fim_de_ano_pct": {str(k): v for k, v in sorted(focus["Selic"].items())},
                "ipca_pct": {str(k): v for k, v in sorted(focus["IPCA"].items())},
                "pib_pct": {str(k): v for k, v in sorted(focus["PIB Total"].items())},
            },
            "longo_prazo": {
                "conservador": "IPCA Focus (0% real)",
                "base": "IPCA Focus + PIB Focus do ano",
                "otimista": "IPCA Focus + crescimento real médio histórico da categoria",
                "real_historico_pct": {c: round(v * 100, 2) for c, v in real_hist.items()},
                "real_historico_metodo": real_hist_desc,
            },
            "rendimento": p,
            "selic_mensal_projetada": serie_json(est["selic_mensal"]),
            "ultimo_mes_realizado": ultimo.strftime("%Y-%m-%d"),
        },
        "backtest": {
            "cortes": cortes,
            "horizonte_meses": H_BACKTEST,
            "janelas": N_JANELAS,
            "metricas": metricas,
            "correcao_vies": correcoes,
            "faixas_80": faixas_out,
            "observacao": "Modelos sem variáveis exógenas, sobre log. SARIMAX e Random Forest oficiais não entram nesta comparação.",
        },
        "desafiante": {
            "metodo": metodo,
            "categorias": {c: {n: serie_json(s) for n, s in cen.items()} for c, cen in desafiante.items()},
            "total": {n: serie_json(s) for n, s in total.items()},
            "totais_por_ano": {c: totais_por_ano(cen) for c, cen in desafiante.items()} | {"Total": totais_por_ano(total)},
            "rendimento_componentes": {
                "projecao_base": {k: serie_json(v) for k, v in est["componentes"]["base"].items()},
                "historico": {k: serie_json(v) for k, v in est["historico"].items()},
            },
        },
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description="Laboratorio de Modelos (projecao desafiante)")
    ap.add_argument("--base-path", required=True)
    ap.add_argument("--depositos", default="dados/rendimento_depositos_judiciais.csv")
    ap.add_argument("--previsao", default="previsao.json", help="JSON do forecast.py; recebe a chave 'laboratorio'")
    ap.add_argument("--ate-ano", type=int, default=None)
    args = ap.parse_args(argv)

    caminho = Path(args.previsao)
    resultado = json.loads(caminho.read_text()) if caminho.exists() else {}
    ate_ano = args.ate_ano
    if ate_ano is None and resultado.get("categorias"):
        meses = [m for c in resultado["categorias"].values() for m in c["cenarios_futuros"]["base"]["previsao"]]
        ate_ano = max(int(m[:4]) for m in meses) if meses else None
    lab = rodar(args.base_path, args.depositos, ate_ano)
    resultado["laboratorio"] = lab
    caminho.write_text(json.dumps(resultado, ensure_ascii=False, indent=2))

    print("\nLaboratorio - total previsto por ano (desafiante, cenario base):")
    for ano, v in lab["desafiante"]["totais_por_ano"]["Total"].items():
        print(f"  {ano}: R$ {v['base']/1e6:,.1f} mi")
    return lab


if __name__ == "__main__":
    main(sys.argv[1:])
