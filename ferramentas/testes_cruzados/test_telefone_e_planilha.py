"""Telefone: Python e TypeScript normalizam igual. Planilha: simulação não grava e pula duplicadas."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from hypothesis import given, settings
from hypothesis import strategies as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from importar_planilha import planejar_clientes, planejar_servicos  # noqa: E402
from uni9.telefone import normalizar_telefone  # noqa: E402

RAIZ = Path(__file__).resolve().parents[2]


def normalizar_no_ts(textos: list[str]) -> list[str | None]:
    codigo = (
        'import { normalizarTelefone } from "./src/lib/telefone.ts";'
        "let e='';process.stdin.on('data',d=>e+=d).on('end',()=>"
        "console.log(JSON.stringify(JSON.parse(e).map(t=>normalizarTelefone(t)))));"
    )
    r = subprocess.run(
        ["node", "--input-type=module", "-e", codigo],
        input=json.dumps(textos),
        capture_output=True,
        text=True,
        encoding="utf-8",
        cwd=RAIZ,
        check=True,
    )
    return json.loads(r.stdout)


CASOS = {
    "+55 (11) 98765-4321": "11987654321",
    "011987654321": "11987654321",
    "0 15 11 98765-4321": "11987654321",
    "98765-4321": "11987654321",
    "3456-7890": "1134567890",
    "(21) 3456-7890": "2134567890",
    "123": None,
    "": None,
}


def test_casos_conhecidos():
    for entrada, esperado in CASOS.items():
        assert normalizar_telefone(entrada) == esperado, entrada


@settings(max_examples=50, deadline=None)
@given(st.lists(st.text(alphabet="0123456789+()- ", max_size=20), min_size=40, max_size=40))
def test_python_igual_ao_typescript(textos):
    assert normalizar_no_ts(textos) == [normalizar_telefone(t) for t in textos]


def test_planejar_clientes_pula_duplicadas_e_invalidas():
    linhas = [
        {"nome": "Ana", "telefone": "(11) 98765-4321"},
        {"nome": "Ana de novo", "telefone": "11987654321"},
        {"nome": "Bia", "telefone": "abc"},
        {"nome": "", "telefone": "11911112222"},
        {"nome": "Carla", "telefone": "11922223333"},
        {"nome": "Duda", "nascimento": "15/03/1990"},
    ]
    plano = planejar_clientes(linhas, existentes={"11922223333"})
    assert [c["nome"] for c in plano.entrar] == ["Ana", "Duda"]
    assert plano.entrar[1]["nascimento"] == "1990-03-15"
    assert len(plano.pulados) == 4


def test_planejar_servicos_usa_nucleo_c():
    linhas = [
        {"nome": "Volume brasileiro", "preco": "180,00", "duracao": "120", "categoria": "Extensão cílios"},
        {"nome": "Design", "preco": 45.5, "sinal": "100"},
        {"nome": "Ruim", "preco": "abc"},
    ]
    plano = planejar_servicos(linhas, existentes=set())
    assert plano.entrar[0]["preco_centavos"] == 18000
    assert plano.entrar[0]["categoria"] == "extensao_cilios"
    assert plano.entrar[1]["preco_centavos"] == 4550
    assert plano.entrar[1]["sinal_centavos"] == 4550  # sinal limitado ao preço
    assert len(plano.pulados) == 1
