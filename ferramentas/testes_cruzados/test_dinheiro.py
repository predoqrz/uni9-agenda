"""Testes cruzados: o núcleo C (CLI nativa), o mesmo C via ctypes e a camada
TypeScript + WebAssembly do app precisam dar exatamente o mesmo resultado."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from uni9.nucleo import ErroDinheiro, formatar_dinheiro, ler_dinheiro, repartir_dinheiro  # noqa: E402

RAIZ = Path(__file__).resolve().parents[2]
CLI_C = RAIZ / "nucleo" / "bin" / ("uni9.exe" if sys.platform == "win32" else "uni9")
CLI_TS = RAIZ / "scripts" / "nucleo-ts.mts"


def rodar_lote(comando: list[str], linhas: list[str]) -> list[str]:
    r = subprocess.run(
        comando, input="\n".join(linhas) + "\n", capture_output=True, text=True, encoding="utf-8", check=True
    )
    return r.stdout.splitlines()


def ambos(linhas: list[str]) -> tuple[list[str], list[str]]:
    return rodar_lote([str(CLI_C)], linhas), rodar_lote(["node", str(CLI_TS)], linhas)


def via_ctypes(linha: str) -> str:
    op, _, resto = linha.partition(" ")
    try:
        if op == "ler":
            return f"ok {ler_dinheiro(resto)}"
        if op == "formatar":
            return f"ok {formatar_dinheiro(int(resto))}"
        total, *pesos = map(int, resto.split())
        return "ok " + " ".join(map(str, repartir_dinheiro(total, pesos)))
    except ErroDinheiro as e:
        return f"erro {e.codigo}"


# Textos parecidos com o que se digita num celular: dígitos, vírgula, ponto, espaço, R$.
digitado = st.text(alphabet="0123456789.,  R$", max_size=16)
centavos = st.integers(min_value=-(10**15), max_value=10**15)
pesos = st.lists(st.integers(min_value=0, max_value=10**12), min_size=1, max_size=12)
total = st.integers(min_value=0, max_value=10**12)

FIXOS = [
    "ler 120",
    "ler 120,50",
    "ler 1.234,56",
    "ler 120.50",
    "ler ,50",
    "ler R$ 35,90",
    "ler -1",
    "ler 1,234",
    "ler ",
    "formatar 0",
    "formatar -5",
    "formatar 123456789",
    "repartir 2000 15000 5000",
    "repartir 100 100 100 100",
    "repartir 1 0 0",
]


def test_casos_fixos_iguais_nas_tres_camadas():
    c, ts = ambos(FIXOS)
    assert c == ts
    assert c == [via_ctypes(lin) for lin in FIXOS]


@settings(max_examples=300, deadline=None)
@given(st.lists(digitado, min_size=50, max_size=50))
def test_ler_igual(textos):
    linhas = [f"ler {t.strip()}" for t in textos]
    c, ts = ambos(linhas)
    assert c == ts


@settings(max_examples=100, deadline=None)
@given(st.lists(centavos, min_size=50, max_size=50))
def test_formatar_igual_e_volta(valores):
    linhas = [f"formatar {v}" for v in valores]
    c, ts = ambos(linhas)
    assert c == ts
    # Formatar e ler de volta dá o mesmo valor (para não negativos).
    for v, saida in zip(valores, c, strict=True):
        if v >= 0 and v <= 10**12:
            assert ler_dinheiro(saida.removeprefix("ok ")) == v


@settings(max_examples=100, deadline=None)
@given(st.lists(st.tuples(total, pesos), min_size=20, max_size=20))
def test_repartir_igual_e_soma_exata(casos):
    linhas = [f"repartir {t} " + " ".join(map(str, p)) for t, p in casos]
    c, ts = ambos(linhas)
    assert c == ts
    for (t, _), saida in zip(casos, c, strict=True):
        partes = list(map(int, saida.split()[1:]))
        assert sum(partes) == t
        assert all(x >= 0 for x in partes)


@pytest.mark.parametrize(
    ("entrada", "esperado"),
    [("120", 12000), ("1.234,56", 123456), ("120.5", 12050), (" R$ 1.000 ", 100000)],
)
def test_ctypes(entrada, esperado):
    assert ler_dinheiro(entrada) == esperado
