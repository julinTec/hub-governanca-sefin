"""
Previsao de arrecadacao (SARIMAX) - versao parametrizavel.

Refatorado a partir do script original (Colab) para rodar via linha de
comando ou GitHub Actions (workflow_dispatch), recebendo alvo, variaveis
exogenas e horizonte como parametros em vez de valores fixos no codigo.

Uso local:
    python forecast.py --alvo "Tipo Judiciais" \
        --variaveis "Casos Baixados,Casos novos,Casos Julgados" \
        --meses-teste 6 \
        --base-path "./BASE_MONTADA_LIMPA - atualizacao.xlsx" \
        --saida previsao.json

No GitHub Actions, os mesmos parametros chegam como inputs do
workflow_dispatch (ver .github/workflows/previsao.yml).
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pmdarima as pm
import warnings

warnings.filterwarnings("ignore")


def carregar_serie(base_path: str, data_inicio: str = "2022-01-01") -> pd.DataFrame:
    """Carrega a base montada e retorna a serie a partir de data_inicio."""
    df = pd.read_excel(base_path)
    df["Data"] = pd.to_datetime(df["Data"], format="%d/%m/%Y")
    df.set_index("Data", inplace=True)
    df.index.freq = "MS"
    return df.loc[data_inicio:].copy()


def preparar_dados(df: pd.DataFrame, alvo: str, variaveis: list[str]) -> pd.DataFrame:
    """Interpola zeros no alvo e preenche buracos nas variaveis exogenas."""
    df = df.copy()
    df[alvo] = df[alvo].replace(0, np.nan).interpolate(method="linear")
    for col in variaveis:
        if col not in df.columns:
            raise ValueError(f"Variavel exogena '{col}' nao existe na base.")
        df[col] = df[col].ffill().bfill()
    return df


def gerar_previsao(
    df: pd.DataFrame,
    alvo: str,
    variaveis: list[str],
    meses_teste: int,
) -> dict:
    """
    Treina o SARIMAX com backtest de `meses_teste` meses e devolve
    previsao, valores reais do periodo de teste e o MAPE.
    """
    y = df[alvo]
    y_log = np.log1p(y)

    y_treino_log = y_log.iloc[:-meses_teste]
    y_teste_reais = y.iloc[-meses_teste:]

    x_treino = df[variaveis].iloc[:-meses_teste] if variaveis else None
    x_teste = df[variaveis].iloc[-meses_teste:] if variaveis else None

    modelo = pm.auto_arima(
        y=y_treino_log,
        X=x_treino,
        d=1,
        D=1,
        m=12,
        seasonal=True,
        stepwise=True,
        trace=False,
        suppress_warnings=True,
        error_action="ignore",
    )

    prev_log = modelo.predict(n_periods=meses_teste, X=x_teste)
    prev_reais = np.expm1(prev_log)

    mape = float(np.mean(np.abs((y_teste_reais - prev_reais) / y_teste_reais)) * 100)

    return {
        "alvo": alvo,
        "variaveis_exogenas": variaveis,
        "meses_teste": meses_teste,
        "mape": round(mape, 2),
        "previsao": {
            data.strftime("%Y-%m-%d"): round(float(valor), 2)
            for data, valor in prev_reais.items()
        },
        "real_periodo_teste": {
            data.strftime("%Y-%m-%d"): round(float(valor), 2)
            for data, valor in y_teste_reais.items()
        },
    }


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="Previsao de arrecadacao via SARIMAX")
    p.add_argument("--alvo", required=True, help='Ex: "Tipo Judiciais"')
    p.add_argument(
        "--variaveis",
        default="",
        help='Variaveis exogenas separadas por virgula. Vazio = so a serie do alvo.',
    )
    p.add_argument("--meses-teste", type=int, default=6)
    p.add_argument("--base-path", required=True)
    p.add_argument("--saida", default="previsao.json", help="Caminho do JSON de saida")
    return p.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    variaveis = [v.strip() for v in args.variaveis.split(",") if v.strip()]

    df = carregar_serie(args.base_path)
    df = preparar_dados(df, args.alvo, variaveis)
    resultado = gerar_previsao(df, args.alvo, variaveis, args.meses_teste)

    Path(args.saida).write_text(json.dumps(resultado, ensure_ascii=False, indent=2))
    print(f"MAPE: {resultado['mape']}% | previsao salva em {args.saida}")
    return resultado


if __name__ == "__main__":
    main(sys.argv[1:])
