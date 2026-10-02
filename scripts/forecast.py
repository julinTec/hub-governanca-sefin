"""
Previsao de arrecadacao - motor multi-modelo (Naive Sazonal, SARIMAX
padronizado, Random Forest) com comparacao formal entre familias de
modelo, por categoria de receita (Judicial, Extra Judicial, Rendimento).

Baseado no caderno metodologico "Analise Descritiva e Series Temporais
TJCE" (dissertacao de mestrado): mesmo desenho de backtest (treino ate
um corte fixo, teste nos ultimos N meses fechados), mesma padronizacao
z-score das variaveis exogenas (ajustada so no treino, sem vazamento),
mesmas 3 familias de modelo competindo (Naive / SARIMAX / Random
Forest) com MAE/MAPE/RMSE/R^2 e teste de Diebold-Mariano, mesmos
diagnosticos de interpretabilidade (coeficientes do SARIMAX com
p-valor; importancia de variavel do Random Forest) e mesma logica de
projecao de cenarios (padrao sazonal dos ultimos 12 meses x taxa de
crescimento por cenario).

Uso:
    python forecast.py --base-path "./dados/BASE_MONTADA_LIMPA_-_atualizac_a_o.xlsx" \
        --meses-teste 12 --horizonte-meses 6 --saida previsao.json

Nao ha mais um "alvo" unico por execucao: o script sempre roda as 3
categorias fixas (Judicial, Extra Judicial, Rendimento), cada uma com
as 3 familias de modelo, e devolve tudo num unico JSON estruturado por
categoria/modelo. Quem decide o que fazer com o resultado (gravar no
banco, mostrar na tela) e o resto do pipeline (Edge Functions /
frontend) - este script so calcula.
"""

import argparse
import json
import sys
import warnings
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import pmdarima as pm
from scipy import stats
from sklearn.ensemble import RandomForestRegressor
from sklearn.inspection import permutation_importance
from statsmodels.stats.diagnostic import acorr_ljungbox
from statsmodels.tsa.seasonal import STL
from statsmodels.tsa.stattools import acf, pacf, kpss

warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# Configuracao fixa das 3 categorias de receita
# ---------------------------------------------------------------------------
# 'transforma'/'reverte': mesma escolha do caderno metodologico - log para
# Judicial/Extra Judicial (nunca chegam a zero na serie), log1p para
# Rendimento (mais proximo de zero em alguns meses).
CENARIOS = {
    "Judicial": {
        "alvo": "Tipo Judiciais",
        "corte": "2019-01-01",
        "variaveis": ["Casos Baixados", "Casos novos", "Casos Julgados"],
        "transforma": np.log,
        "reverte": np.exp,
    },
    "Extra Judicial": {
        "alvo": "Tipo Extra Judiciais",
        "corte": "2022-01-01",
        "variaveis": ["Casos Baixados", "IGP-M", "Saldos"],
        "transforma": np.log,
        "reverte": np.exp,
    },
    "Rendimento": {
        "alvo": "Tipo Rendimento",
        "corte": "2022-01-01",
        "variaveis": ["Selic (%)", "Saldos"],
        "transforma": np.log1p,
        "reverte": np.expm1,
    },
}

# Nomes dos 3 cenarios (a taxa de cada um e calculada por categoria, nao e
# mais um numero fixo igual pra todas - ver calcular_taxa_crescimento_historica).
NOMES_CENARIOS = ["conservador", "base", "otimista"]
OFFSET_CENARIO = 0.05  # pontos percentuais acima/abaixo da taxa base historica


def calcular_taxa_crescimento_historica(y: pd.Series, meses_janela: int = 24) -> float:
    """
    Taxa de crescimento anual (YoY) tipica da categoria: mediana do
    crescimento Y(t)/Y(t-12) - 1 nos ultimos `meses_janela` meses (mediana
    em vez de media pra nao deixar um mes fora da curva distorcer o cenario
    'base'). Cai pro default antigo (10%) se nao houver historico suficiente,
    e e limitada a uma faixa razoavel pra nao gerar cenarios absurdos.
    """
    yoy = (y / y.shift(12) - 1).dropna()
    if len(yoy) == 0:
        return 0.10
    taxa = float(yoy.iloc[-meses_janela:].median())
    return float(np.clip(taxa, -0.15, 0.40))


def montar_taxas_cenario(taxa_base: float) -> dict:
    """Conservador/base/otimista como desvio de +-OFFSET_CENARIO em torno da
    taxa historica real da categoria, em vez de 5%/10%/15% fixos iguais pra
    todas."""
    return {
        "conservador": round(taxa_base - OFFSET_CENARIO, 4),
        "base": round(taxa_base, 4),
        "otimista": round(taxa_base + OFFSET_CENARIO, 4),
    }


# ---------------------------------------------------------------------------
# Ingestao e preparacao
# ---------------------------------------------------------------------------
def carregar_base(base_path: str) -> pd.DataFrame:
    df = pd.read_excel(base_path)
    df["Data"] = pd.to_datetime(df["Data"])
    df = df.sort_values("Data").set_index("Data")
    df.index.freq = "MS"
    return df


def padronizar(treino: pd.DataFrame, teste: pd.DataFrame | None, colunas: list[str]):
    """Padroniza (z-score) usando media/desvio calculados so no treino."""
    medias = treino[colunas].mean()
    desvios = treino[colunas].std(ddof=1).replace(0, 1.0)
    x_treino = (treino[colunas] - medias) / desvios
    x_teste = None
    if teste is not None and len(teste):
        x_teste = (teste[colunas] - medias) / desvios
    return x_treino, x_teste, medias, desvios


def serie_para_json(index: pd.DatetimeIndex, valores) -> dict:
    return {d.strftime("%Y-%m-%d"): (None if pd.isna(v) else round(float(v), 2)) for d, v in zip(index, valores)}


# ---------------------------------------------------------------------------
# Metricas e teste de Diebold-Mariano
# ---------------------------------------------------------------------------
def calcular_metricas(real: np.ndarray, prev: np.ndarray) -> dict:
    real = np.asarray(real, dtype=float)
    prev = np.asarray(prev, dtype=float)
    erro = real - prev
    mae = float(np.mean(np.abs(erro)))
    mape = float(np.mean(np.abs(erro / real)) * 100)
    rmse = float(np.sqrt(np.mean(erro**2)))
    sst = float(np.sum((real - real.mean()) ** 2))
    sse = float(np.sum(erro**2))
    r2 = float(1 - sse / sst) if sst > 0 else None
    return {
        "mae": round(mae, 2),
        "mape": round(mape, 2),
        "rmse": round(rmse, 2),
        "r2": round(r2, 4) if r2 is not None else None,
    }


def diebold_mariano(erro_a: np.ndarray, erro_b: np.ndarray, h: int = 1) -> dict:
    """
    Teste de Diebold-Mariano (1995) para diferenca de acuracia preditiva,
    usando perda quadratica. H0: as duas series de erro tem a mesma
    acuracia esperada. Implementacao equivalente ao forecast::dm.test do R.
    """
    d = erro_a**2 - erro_b**2
    n = len(d)
    d_bar = float(np.mean(d))
    # variancia de longo prazo com correcao de autocovariancia ate h-1
    gamma0 = float(np.var(d, ddof=0))
    soma_gamma = gamma0
    for k in range(1, h):
        if k >= n:
            break
        cov_k = float(np.mean((d[:-k] - d_bar) * (d[k:] - d_bar)))
        soma_gamma += 2 * cov_k
    var_d_bar = soma_gamma / n
    if var_d_bar <= 0:
        return {"estatistica": None, "p_valor": None, "conclusao": "Variancia nao positiva - teste nao aplicavel"}
    dm_stat = d_bar / np.sqrt(var_d_bar)
    p_valor = float(2 * (1 - stats.norm.cdf(abs(dm_stat))))
    conclusao = "Acuracias equivalentes (p>0.05)" if p_valor > 0.05 else "Diferenca estatisticamente significante"
    return {"estatistica": round(float(dm_stat), 4), "p_valor": round(p_valor, 4), "conclusao": conclusao}


# ---------------------------------------------------------------------------
# Familia 1: Naive Sazonal
# ---------------------------------------------------------------------------
def modelo_naive(y_treino: pd.Series, y_teste: pd.Series) -> np.ndarray:
    """Y_t = Y_(t-12). Exige pelo menos 12 meses de treino antes do teste."""
    serie_completa = pd.concat([y_treino, y_teste])
    previsao = serie_completa.shift(12).loc[y_teste.index]
    # Fallback pros primeiros meses de teste caso o treino tenha menos de 12m de historico
    previsao = previsao.ffill().fillna(y_treino.iloc[-1])
    return previsao.values


# ---------------------------------------------------------------------------
# Familia 2: SARIMAX padronizado
# ---------------------------------------------------------------------------
def modelo_sarimax(y_treino_transf, x_treino, x_teste, meses_teste: int, reverte):
    # d/D nao sao mais forcados em 1: com series curtas (~40-50 meses),
    # forcar diferenciacao sazonal (D=1) junto com termos AR/MA sazonais
    # de ordem alta gera modelos instaveis que "explodem" ao extrapolar
    # varios passos a frente (visto na pratica: MAPE > 600% em Rendimento).
    # Deixamos o auto_arima decidir d/D via teste estatistico (KPSS/OCSB),
    # com tetos (max_D=1, max_P/Q=1) pra manter o modelo parcimonioso.
    modelo = pm.auto_arima(
        y=y_treino_transf,
        X=x_treino if x_treino is not None and len(x_treino.columns) else None,
        test="kpss",
        seasonal_test="ocsb",
        max_d=2,
        max_D=1,
        max_p=3,
        max_q=3,
        max_P=1,
        max_Q=1,
        m=12,
        seasonal=True,
        stepwise=True,
        trace=False,
        error_action="ignore",
        suppress_warnings=True,
    )
    prev_transf = modelo.predict(n_periods=meses_teste, X=x_teste if x_teste is not None and len(x_teste.columns) else None)
    prev_reais = reverte(np.asarray(prev_transf))

    coeficientes = extrair_coeficientes_sarimax(modelo, list(x_treino.columns) if x_treino is not None else [])
    return prev_reais, modelo, coeficientes


def extrair_coeficientes_sarimax(modelo, nomes_exogenas: list[str]) -> list[dict]:
    """
    Extrai coeficiente, erro padrao, estatistica z e p-valor de cada termo
    do SARIMAX (AR/MA/sazonais + exogenas), igual ao Modulo 11 do caderno
    metodologico (summary do modelo ARIMA).
    """
    try:
        arima_res = modelo.arima_res_
        params = arima_res.params
        bse = arima_res.bse
        zvalues = arima_res.zvalues
        pvalues = arima_res.pvalues
        nomes = list(params.index)
    except Exception:
        return []

    saida = []
    for nome in nomes:
        try:
            saida.append(
                {
                    "termo": str(nome),
                    "e_exogena": str(nome) in nomes_exogenas,
                    "coeficiente": round(float(params[nome]), 4),
                    "erro_padrao": round(float(bse[nome]), 4),
                    "estatistica_z": round(float(zvalues[nome]), 4),
                    "p_valor": round(float(pvalues[nome]), 4),
                    "significante_5pct": bool(pvalues[nome] < 0.05),
                }
            )
        except Exception:
            continue
    return saida


# ---------------------------------------------------------------------------
# Familia 3: Random Forest (com defasagens/medias moveis/calendario)
# ---------------------------------------------------------------------------
def construir_features_rf(y: pd.Series, exogenas: pd.DataFrame) -> pd.DataFrame:
    feat = pd.DataFrame(index=y.index)
    feat["lag_1"] = y.shift(1)
    feat["lag_2"] = y.shift(2)
    feat["lag_12"] = y.shift(12)
    feat["ma_3"] = y.shift(1).rolling(3).mean()
    feat["ma_12"] = y.shift(1).rolling(12).mean()
    feat["mes"] = y.index.month
    feat["trimestre"] = y.index.quarter
    for col in exogenas.columns:
        feat[col] = exogenas[col]
    feat["alvo"] = y
    return feat


def modelo_random_forest(y_completo: pd.Series, exogenas_completo: pd.DataFrame, y_treino: pd.Series, meses_teste: int):
    """
    Treina com as features (lags/medias moveis/calendario/exogenas) so
    dentro do periodo de treino, e faz previsao RECURSIVA mes a mes no
    periodo de teste (usa a propria previsao do RF como lag do mes
    seguinte, ja que na producao os meses futuros nao tem valor real
    ainda) - diferente do backtest "em bloco" do caderno original, mas
    necessario pra simular a mesma situacao que o modelo vai enfrentar
    ao prever o futuro de verdade.
    """
    feat_completo = construir_features_rf(y_completo, exogenas_completo).dropna()
    feat_treino = feat_completo.loc[feat_completo.index.isin(y_treino.index)]

    if len(feat_treino) < 24:
        return None, None, []

    x_cols = [c for c in feat_treino.columns if c != "alvo"]
    x_treino = feat_treino[x_cols]
    y_treino_rf = feat_treino["alvo"]

    modelo = RandomForestRegressor(n_estimators=500, max_features=min(4, len(x_cols)), random_state=42)
    modelo.fit(x_treino, y_treino_rf)

    # Previsao recursiva no periodo de teste
    y_hist = y_completo.copy()
    previsoes = []
    datas_teste = y_completo.index[-meses_teste:]
    for data in datas_teste:
        linha_exo = exogenas_completo.loc[[data]] if len(exogenas_completo.columns) else pd.DataFrame(index=[data])
        linha_feat = construir_features_rf(y_hist, exogenas_completo.loc[y_hist.index.union([data])]).loc[[data]]
        linha_feat = linha_feat[x_cols]
        if linha_feat.isna().any(axis=None):
            pred = float(y_hist.iloc[-1])
        else:
            pred = float(modelo.predict(linha_feat)[0])
        previsoes.append(pred)
        y_hist.loc[data] = pred  # alimenta o proprio lag do proximo passo

    importancias = extrair_importancia_rf(modelo, x_cols, x_treino, y_treino_rf)
    return np.array(previsoes), modelo, importancias


def extrair_importancia_rf(modelo, colunas: list[str], x_treino, y_treino) -> list[dict]:
    """Importancia por permutacao (%IncMSE), igual ao Modulo 11 do caderno."""
    try:
        resultado = permutation_importance(modelo, x_treino, y_treino, n_repeats=10, random_state=42, scoring="neg_mean_squared_error")
        importancias = []
        for nome, media in zip(colunas, resultado.importances_mean):
            importancias.append({"variavel": nome, "importancia_pct_inc_mse": round(float(media), 4)})
        importancias.sort(key=lambda x: x["importancia_pct_inc_mse"], reverse=True)
        return importancias
    except Exception:
        return []


# ---------------------------------------------------------------------------
# Fase 3: robustez da validacao - backtest rolling-origin (varias janelas
# deslizantes, nao so os ultimos N meses) e diagnostico de residuos do
# modelo vencedor (Ljung-Box / Shapiro-Wilk).
# ---------------------------------------------------------------------------
def rodar_backtest_unico(y: pd.Series, exogenas: pd.DataFrame, variaveis: list[str], regras: dict, meses_teste: int) -> dict | None:
    """
    Roda os 3 modelos pra um unico corte treino/teste e devolve so as
    metricas (sem previsao detalhada/coeficientes) - usado tanto pro
    backtest principal (reaproveitado, nao recalculado) quanto pras janelas
    extras do rolling-origin. Retorna None se a janela nao tiver historico
    suficiente.
    """
    if len(y) <= meses_teste + 12:
        return None
    y_treino = y.iloc[:-meses_teste]
    y_teste = y.iloc[-meses_teste:]
    exo_treino_raw = exogenas.iloc[:-meses_teste]
    exo_teste_raw = exogenas.iloc[-meses_teste:]
    y_transf = regras["transforma"](y)
    y_treino_transf = y_transf.iloc[:-meses_teste]
    x_treino_pad, x_teste_pad, medias, desvios = padronizar(exo_treino_raw, exo_teste_raw, variaveis) if variaveis else (None, None, None, None)

    prev_naive = modelo_naive(y_treino, y_teste)
    metricas = {"naive_sazonal": calcular_metricas(y_teste.values, prev_naive)}

    try:
        prev_sarimax, _, _ = modelo_sarimax(y_treino_transf, x_treino_pad, x_teste_pad, meses_teste, regras["reverte"])
        metricas["sarimax"] = calcular_metricas(y_teste.values, prev_sarimax)
    except Exception:
        pass

    try:
        exo_pad_completo = ((exogenas - medias) / desvios) if variaveis else pd.DataFrame(index=exogenas.index)
        prev_rf, _, _ = modelo_random_forest(y, exo_pad_completo, y_treino, meses_teste)
        if prev_rf is not None:
            metricas["random_forest"] = calcular_metricas(y_teste.values, prev_rf)
    except Exception:
        pass

    if not metricas:
        return None
    vencedor = min(metricas.items(), key=lambda kv: kv[1]["mape"])[0]
    return {"origem_teste": y_teste.index[0].strftime("%Y-%m-%d"), "metricas": metricas, "vencedor": vencedor}


def rolling_origin_backtest(
    y: pd.Series,
    exogenas: pd.DataFrame,
    variaveis: list[str],
    regras: dict,
    meses_teste: int,
    janela_principal: dict,
    n_janelas: int = 3,
    passo: int = 6,
) -> dict | None:
    """
    Repete o backtest em `n_janelas` janelas deslizantes (a principal, ja
    calculada em gerar_previsao_categoria, mais `n_janelas - 1` anteriores
    deslocadas `passo` meses pra tras), pra checar se o "vencedor por MAPE"
    de uma unica janela e estavel ou so sorte de corte. Para quando nao ha
    mais historico suficiente pra abrir outra janela.
    """
    janelas = [janela_principal]
    for i in range(1, n_janelas):
        fim = len(y) - i * passo
        if fim < meses_teste + 24:
            break
        y_jan = y.iloc[:fim]
        exo_jan = exogenas.iloc[:fim] if len(exogenas.columns) else exogenas.iloc[:fim]
        resultado = rodar_backtest_unico(y_jan, exo_jan, variaveis, regras, meses_teste)
        if resultado is not None:
            janelas.append(resultado)

    if len(janelas) < 2:
        return None

    modelos_presentes: set[str] = set()
    for j in janelas:
        modelos_presentes.update(j["metricas"].keys())

    resumo_por_modelo = {}
    for modelo in modelos_presentes:
        mapes = [j["metricas"][modelo]["mape"] for j in janelas if modelo in j["metricas"]]
        resumo_por_modelo[modelo] = {
            "mape_medio": round(float(np.mean(mapes)), 2),
            "mape_desvio": round(float(np.std(mapes, ddof=1)), 2) if len(mapes) > 1 else 0.0,
            "n_janelas": len(mapes),
        }

    vencedores_por_janela = [j["vencedor"] for j in janelas]
    return {
        "n_janelas": len(janelas),
        "janelas": [{"origem_teste": j["origem_teste"], "vencedor": j["vencedor"], "metricas": j["metricas"]} for j in janelas],
        "resumo_por_modelo": resumo_por_modelo,
        "vencedor_por_janela": vencedores_por_janela,
        "vencedor_estavel": len(set(vencedores_por_janela)) == 1,
    }


def diagnostico_residuos(residuos: np.ndarray) -> dict:
    """
    Diagnostico dos residuos (real - previsto) do modelo vencedor no
    backtest principal: Ljung-Box (autocorrelacao residual - H0: residuos
    sao ruido branco) e Shapiro-Wilk (normalidade - H0: residuos sao
    normais). Informativo, nao e criterio automatico de descarte: em
    series curtas (40-90 meses) e comum um teste dar "nao ideal" mesmo em
    modelos razoaveis.
    """
    residuos = np.asarray(residuos, dtype=float)
    saida: dict = {"n_observacoes": int(len(residuos))}

    try:
        lags = max(1, min(10, len(residuos) - 1))
        lb = acorr_ljungbox(residuos, lags=[lags], return_df=True)
        stat_lb = float(lb["lb_stat"].iloc[0])
        p_lb = float(lb["lb_pvalue"].iloc[0])
        saida["ljung_box"] = {
            "estatistica": round(stat_lb, 4),
            "p_valor": round(p_lb, 4),
            "lags": lags,
            "conclusao": "Sem autocorrelacao residual significante (p>0.05)" if p_lb > 0.05 else "Ha autocorrelacao residual significante - modelo pode estar deixando padrao nao capturado",
        }
    except Exception:
        saida["ljung_box"] = None

    try:
        stat_sw, p_sw = stats.shapiro(residuos)
        saida["shapiro_wilk"] = {
            "estatistica": round(float(stat_sw), 4),
            "p_valor": round(float(p_sw), 4),
            "conclusao": "Residuos compativeis com normalidade (p>0.05)" if p_sw > 0.05 else "Residuos nao-normais (p<0.05) - comum em series curtas, nao e descarte automatico",
        }
    except Exception:
        saida["shapiro_wilk"] = None

    return saida


# ---------------------------------------------------------------------------
# Fase 4: analise descritiva/exploratoria por categoria (Modulos 1-7 do
# caderno metodologico) - decomposicao STL, ACF/PACF e teste de
# estacionariedade, expostos como diagnostico (nao alimentam o modelo, que
# ja decide isso sozinho via auto_arima).
# ---------------------------------------------------------------------------
def analise_descritiva_categoria(y: pd.Series, regras: dict) -> dict:
    saida: dict = {}

    saida["estatisticas"] = {
        "media": round(float(y.mean()), 2),
        "mediana": round(float(y.median()), 2),
        "desvio_padrao": round(float(y.std(ddof=1)), 2),
        "minimo": round(float(y.min()), 2),
        "maximo": round(float(y.max()), 2),
        "coeficiente_variacao": round(float(y.std(ddof=1) / y.mean()), 4) if y.mean() else None,
    }

    try:
        y_log = np.log(y.clip(lower=0.01))
        stl = STL(y_log, period=12, robust=True).fit()
        saida["stl"] = {
            "tendencia": serie_para_json(y.index, np.exp(stl.trend)),
            "sazonalidade_log": serie_para_json(y.index, stl.seasonal),
            "residuo_log": serie_para_json(y.index, stl.resid),
        }
    except Exception:
        saida["stl"] = None

    try:
        y_transf = regras["transforma"](y).dropna()
        n_lags = max(1, min(24, len(y_transf) // 2 - 1))
        valores_acf = acf(y_transf, nlags=n_lags)
        valores_pacf = pacf(y_transf, nlags=n_lags)
        limite = round(float(1.96 / np.sqrt(len(y_transf))), 4)
        saida["acf"] = [{"lag": i, "valor": round(float(v), 4)} for i, v in enumerate(valores_acf)]
        saida["pacf"] = [{"lag": i, "valor": round(float(v), 4)} for i, v in enumerate(valores_pacf)]
        saida["limite_significancia_95pct"] = limite
    except Exception:
        saida["acf"] = None
        saida["pacf"] = None
        saida["limite_significancia_95pct"] = None

    try:
        y_transf = regras["transforma"](y).dropna()
        stat_kpss, p_kpss, _, _ = kpss(y_transf, regression="c", nlags="auto")
        p_kpss = float(p_kpss) if p_kpss is not None else None
        saida["kpss"] = {
            "estatistica": round(float(stat_kpss), 4),
            "p_valor": round(p_kpss, 4) if p_kpss is not None else None,
            "conclusao": (
                "Serie estacionaria em nivel (KPSS nao rejeita, p>0.05)"
                if (p_kpss is not None and p_kpss > 0.05)
                else "Serie nao-estacionaria em nivel (KPSS rejeita) - e por isso que o auto_arima aplica diferenciacao"
            ),
        }
    except Exception:
        saida["kpss"] = None

    return saida


# ---------------------------------------------------------------------------
# Projecao de cenarios futuros (producao)
# ---------------------------------------------------------------------------
def projetar_exogenas_futuras(exogenas_historico: pd.DataFrame, datas_futuras: pd.DatetimeIndex, taxa_crescimento: float) -> pd.DataFrame:
    """
    Repete o padrao sazonal dos ultimos 12 meses observados, aplicando
    uma taxa de crescimento anual composta ao longo do horizonte futuro -
    mesma logica do Modulo 12 do caderno metodologico.
    """
    if not len(exogenas_historico.columns):
        return pd.DataFrame(index=datas_futuras)
    ultimos_12 = exogenas_historico.iloc[-12:]
    padrao = pd.concat([ultimos_12] * (len(datas_futuras) // 12 + 1), ignore_index=True).iloc[: len(datas_futuras)]
    padrao.index = datas_futuras
    fator_tempo = np.array([(i + 1) / 12 for i in range(len(datas_futuras))])
    for col in padrao.columns:
        padrao[col] = padrao[col].values * (1 + taxa_crescimento * fator_tempo)
    return padrao


def gerar_previsao_categoria(df: pd.DataFrame, nome_categoria: str, regras: dict, meses_teste: int, horizonte_meses: int) -> dict:
    df_cat = df.loc[regras["corte"] :].copy()
    y = df_cat[regras["alvo"]].replace(0, np.nan).interpolate(method="linear")
    variaveis = [v for v in regras["variaveis"] if v in df_cat.columns]
    for col in variaveis:
        df_cat[col] = df_cat[col].ffill().bfill()
    exogenas = df_cat[variaveis] if variaveis else pd.DataFrame(index=df_cat.index)

    if len(y) <= meses_teste + 12:
        raise ValueError(f"Historico insuficiente para '{nome_categoria}' com {meses_teste} meses de teste.")

    y_treino = y.iloc[:-meses_teste]
    y_teste = y.iloc[-meses_teste:]
    exo_treino_raw = exogenas.iloc[:-meses_teste]
    exo_teste_raw = exogenas.iloc[-meses_teste:]

    y_transf = regras["transforma"](y)
    y_treino_transf = y_transf.iloc[:-meses_teste]

    x_treino_pad, x_teste_pad, medias, desvios = padronizar(exo_treino_raw, exo_teste_raw, variaveis) if variaveis else (None, None, None, None)

    resultados_modelos = {}

    # --- Naive Sazonal ---
    prev_naive = modelo_naive(y_treino, y_teste)
    resultados_modelos["naive_sazonal"] = {
        "nome": "Naive Sazonal",
        "descricao": "Y(t) = Y(t-12) - repete o mesmo mes do ano anterior.",
        "previsao_teste": serie_para_json(y_teste.index, prev_naive),
        "metricas": calcular_metricas(y_teste.values, prev_naive),
    }

    # --- SARIMAX padronizado ---
    prev_sarimax, modelo_sx, coeficientes = modelo_sarimax(y_treino_transf, x_treino_pad, x_teste_pad, meses_teste, regras["reverte"])
    ordem_sarimax = list(modelo_sx.order) + list(modelo_sx.seasonal_order) if modelo_sx is not None else None
    if ordem_sarimax:
        p, d, q, P, D, Q, m = ordem_sarimax
        descricao_ordem = f"ordem (p,d,q)(P,D,Q)m = ({p},{d},{q})({P},{D},{Q}){m}, escolhida pelo auto_arima via teste KPSS/OCSB (nao mais fixada em d=1 D=1)"
    else:
        descricao_ordem = "ordem escolhida pelo auto_arima via teste KPSS/OCSB"
    resultados_modelos["sarimax"] = {
        "nome": "SARIMAX Padronizado",
        "descricao": f"auto_arima sobre {'log1p' if regras['reverte'] is np.expm1 else 'log'}(y), {descricao_ordem}, exogenas: {', '.join(variaveis) or 'nenhuma (ARIMA puro)'}, padronizadas por z-score (ajustado so no treino).",
        "previsao_teste": serie_para_json(y_teste.index, prev_sarimax),
        "metricas": calcular_metricas(y_teste.values, prev_sarimax),
        "coeficientes": coeficientes,
        "ordem": ordem_sarimax,
    }

    # --- Random Forest ---
    exo_pad_completo = ((exogenas - medias) / desvios) if variaveis else pd.DataFrame(index=exogenas.index)
    prev_rf, modelo_rf, importancias = modelo_random_forest(y, exo_pad_completo, y_treino, meses_teste)
    if prev_rf is not None:
        resultados_modelos["random_forest"] = {
            "nome": "Random Forest",
            "descricao": "500 arvores, features: lag_1/lag_2/lag_12, media movel 3m/12m, mes, trimestre e exogenas. Previsao recursiva mes a mes.",
            "previsao_teste": serie_para_json(y_teste.index, prev_rf),
            "metricas": calcular_metricas(y_teste.values, prev_rf),
            "importancia_variaveis": importancias,
        }

    # --- Teste de Diebold-Mariano: SARIMAX vs Random Forest ---
    dm_resultado = None
    if prev_rf is not None:
        erro_sarimax = y_teste.values - prev_sarimax
        erro_rf = y_teste.values - prev_rf
        dm_resultado = diebold_mariano(erro_sarimax, erro_rf, h=1)

    # --- Ranking pelo MAPE ---
    ranking = sorted(resultados_modelos.items(), key=lambda kv: kv[1]["metricas"]["mape"])
    for posicao, (chave, _) in enumerate(ranking, start=1):
        resultados_modelos[chave]["ranking_mape"] = posicao
    vencedor_mape = ranking[0][0]

    # --- Fase 3: diagnostico de residuos do modelo vencedor no backtest ---
    prev_por_chave = {"naive_sazonal": prev_naive, "sarimax": prev_sarimax}
    if prev_rf is not None:
        prev_por_chave["random_forest"] = prev_rf
    residuo_vencedor = y_teste.values - prev_por_chave[vencedor_mape]
    diag_residuos_vencedor = diagnostico_residuos(residuo_vencedor)

    # --- Fase 3: rolling-origin - repete o backtest em janelas deslizantes
    # anteriores pra checar se o vencedor desta janela e estavel. Reaproveita
    # as metricas ja calculadas acima pra janela principal (nao recalcula).
    janela_principal = {
        "origem_teste": y_teste.index[0].strftime("%Y-%m-%d"),
        "metricas": {chave: resultados_modelos[chave]["metricas"] for chave in resultados_modelos},
        "vencedor": vencedor_mape,
    }
    validacao_robustez = rolling_origin_backtest(y, exogenas, variaveis, regras, meses_teste, janela_principal, n_janelas=3, passo=6)

    # --- Fase 4: analise descritiva/exploratoria (STL, ACF/PACF, KPSS) ---
    analise_descritiva = analise_descritiva_categoria(y, regras)
    variaveis_historico = {col: serie_para_json(df_cat.index, df_cat[col]) for col in variaveis}

    # --- Producao: retreina com toda a base e projeta os cenarios futuros ---
    x_completo_pad = ((exogenas - exogenas.mean()) / exogenas.std(ddof=1).replace(0, 1.0)) if variaveis else None
    modelo_producao = pm.auto_arima(
        y=y_transf,
        X=x_completo_pad if x_completo_pad is not None and len(variaveis) else None,
        test="kpss",
        seasonal_test="ocsb",
        max_d=2,
        max_D=1,
        max_p=3,
        max_q=3,
        max_P=1,
        max_Q=1,
        m=12,
        seasonal=True,
        stepwise=True,
        error_action="ignore",
        suppress_warnings=True,
    )
    datas_futuras = pd.date_range(start=y.index[-1] + pd.DateOffset(months=1), periods=horizonte_meses, freq="MS")

    # Taxas de cenario ancoradas na taxa de crescimento historica real da
    # categoria (mediana do YoY dos ultimos 24 meses), nao mais 5%/10%/15%
    # fixos e iguais pra Judicial, Extra Judicial e Rendimento.
    taxa_base_historica = calcular_taxa_crescimento_historica(y)
    taxas_cenario = montar_taxas_cenario(taxa_base_historica)

    cenarios_saida = {}
    for nome_cenario in NOMES_CENARIOS:
        taxa = taxas_cenario[nome_cenario]
        exo_futura = projetar_exogenas_futuras(exogenas, datas_futuras, taxa) if variaveis else None
        exo_futura_pad = ((exo_futura - exogenas.mean()) / exogenas.std(ddof=1).replace(0, 1.0)) if exo_futura is not None else None
        prev_transf, conf_int_transf = modelo_producao.predict(
            n_periods=horizonte_meses,
            X=exo_futura_pad if exo_futura_pad is not None and len(variaveis) else None,
            return_conf_int=True,
            alpha=0.05,
        )
        prev_reais = regras["reverte"](np.asarray(prev_transf))
        conf_int_reais = regras["reverte"](np.asarray(conf_int_transf))
        cenarios_saida[nome_cenario] = {
            "taxa_crescimento_anual": taxa,
            "previsao": serie_para_json(datas_futuras, prev_reais),
            "intervalo_confianca_95": {
                d.strftime("%Y-%m-%d"): [round(float(lo), 2), round(float(hi), 2)]
                for d, lo, hi in zip(datas_futuras, conf_int_reais[:, 0], conf_int_reais[:, 1])
            },
        }

    # --- Fase 2 (opcao B): a projecao de cenario futuro sempre usa o
    # SARIMAX de producao, mesmo quando outro modelo vence o backtest -
    # expor isso explicitamente em vez de deixar implicito, pra tela e API
    # nao sugerirem que o vencedor do backtest e quem projeta o futuro.
    projecao_usa_modelo_vencedor = vencedor_mape == "sarimax"
    nota_consistencia_vencedor = (
        "A projecao de cenario futuro usa o SARIMAX de producao, que tambem foi o vencedor do backtest nesta categoria."
        if projecao_usa_modelo_vencedor
        else f"Atencao: o vencedor do backtest foi {resultados_modelos[vencedor_mape]['nome']}, mas a projecao de cenario futuro abaixo continua usando o SARIMAX (unico modelo com intervalo de confianca fechado hoje)."
    )

    return {
        "categoria": nome_categoria,
        "alvo": regras["alvo"],
        "variaveis_exogenas": variaveis,
        "meses_teste": meses_teste,
        "horizonte_meses": horizonte_meses,
        "historico": serie_para_json(y.index, y.values),
        "variaveis_historico": variaveis_historico,
        "modelos": resultados_modelos,
        "diebold_mariano_sarimax_vs_rf": dm_resultado,
        "modelo_vencedor_mape": vencedor_mape,
        "diagnostico_residuos_vencedor": diag_residuos_vencedor,
        "validacao_robustez": validacao_robustez,
        "analise_descritiva": analise_descritiva,
        "cenarios_futuros": cenarios_saida,
        "projecao_cenario_modelo": "sarimax",
        "projecao_usa_modelo_vencedor": projecao_usa_modelo_vencedor,
        "nota_consistencia_vencedor": nota_consistencia_vencedor,
    }


# ---------------------------------------------------------------------------
# Resumo geral da execucao - estrutura "achatada" (uma linha por categoria,
# so os numeros-chave), no mesmo espirito do que a API de OKR expoe: pensada
# pra consumo externo (Power BI / outra ferramenta de BI), nao pra repetir
# o detalhe tecnico completo (series dia a dia, coeficientes, ACF/PACF) que
# ja fica em `categorias`.
# ---------------------------------------------------------------------------
def _soma_previsao(cenario: dict | None) -> float | None:
    if not cenario or not cenario.get("previsao"):
        return None
    valores = [v for v in cenario["previsao"].values() if v is not None]
    return round(float(sum(valores)), 2) if valores else None


def montar_resumo_estudo(resultado: dict) -> dict:
    linhas = []
    for nome_cat, dados_cat in resultado["categorias"].items():
        vencedor_chave = dados_cat["modelo_vencedor_mape"]
        vencedor = dados_cat["modelos"][vencedor_chave]
        cenarios = dados_cat["cenarios_futuros"]
        cenario_base = cenarios.get("base")
        ultimo_mes_historico = max(dados_cat["historico"].keys())
        dm = dados_cat.get("diebold_mariano_sarimax_vs_rf")
        robustez = dados_cat.get("validacao_robustez")
        linhas.append(
            {
                "categoria": nome_cat,
                "alvo": dados_cat["alvo"],
                "modelo_vencedor": vencedor["nome"],
                "mape_vencedor_pct": vencedor["metricas"]["mape"],
                "r2_vencedor": vencedor["metricas"]["r2"],
                "diebold_mariano_p_valor": dm["p_valor"] if dm else None,
                "diebold_mariano_significante": bool(dm and dm["p_valor"] is not None and dm["p_valor"] < 0.05),
                "vencedor_estavel_entre_janelas": robustez["vencedor_estavel"] if robustez else None,
                "ultimo_mes_historico": ultimo_mes_historico,
                "valor_ultimo_mes_historico": dados_cat["historico"][ultimo_mes_historico],
                "taxa_crescimento_cenario_base_pct": round(cenario_base["taxa_crescimento_anual"] * 100, 2) if cenario_base else None,
                "total_previsto_cenario_conservador": _soma_previsao(cenarios.get("conservador")),
                "total_previsto_cenario_base": _soma_previsao(cenario_base),
                "total_previsto_cenario_otimista": _soma_previsao(cenarios.get("otimista")),
                "projecao_usa_modelo_vencedor": dados_cat["projecao_usa_modelo_vencedor"],
            }
        )

    total_base = sum((l["total_previsto_cenario_base"] or 0) for l in linhas)
    return {
        "gerado_em": resultado["gerado_em"],
        "meses_teste": resultado["meses_teste"],
        "horizonte_meses": resultado["horizonte_meses"],
        "total_previsto_geral_cenario_base": round(float(total_base), 2),
        "categorias": linhas,
    }


def main(argv=None):
    p = argparse.ArgumentParser(description="Previsao de arrecadacao multi-modelo (Naive/SARIMAX/Random Forest)")
    p.add_argument("--base-path", required=True)
    p.add_argument("--meses-teste", type=int, default=12, help="Meses fechados reservados pro backtest (default: 12, ultimo ano fechado)")
    p.add_argument("--horizonte-meses", type=int, default=6, help="Quantos meses futuros projetar (default: 6)")
    p.add_argument("--saida", default="previsao.json")
    args = p.parse_args(argv)

    df = carregar_base(args.base_path)

    resultado = {
        "gerado_em": datetime.now(timezone.utc).isoformat(),
        "meses_teste": args.meses_teste,
        "horizonte_meses": args.horizonte_meses,
        "categorias": {},
    }
    for nome_categoria, regras in CENARIOS.items():
        print(f"Processando categoria: {nome_categoria}...")
        resultado["categorias"][nome_categoria] = gerar_previsao_categoria(df, nome_categoria, regras, args.meses_teste, args.horizonte_meses)

    resultado["resumo_estudo"] = montar_resumo_estudo(resultado)

    Path(args.saida).write_text(json.dumps(resultado, ensure_ascii=False, indent=2))

    print("\nResumo (MAPE % no backtest, menor = melhor):")
    for nome_categoria, dados_cat in resultado["categorias"].items():
        linha = " | ".join(f"{m['nome']}: {m['metricas']['mape']}%" for m in dados_cat["modelos"].values())
        print(f"  {nome_categoria}: {linha} -> vencedor: {dados_cat['modelos'][dados_cat['modelo_vencedor_mape']]['nome']}")
    print(f"\nSalvo em {args.saida}")
    return resultado


if __name__ == "__main__":
    main(sys.argv[1:])
