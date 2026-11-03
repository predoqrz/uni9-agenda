"""Testes cruzados da agenda: encaixes e colunas iguais no C nativo e no WebAssembly do app,
e conferidos contra uma definição direta em Python."""

from __future__ import annotations

from hypothesis import given, settings
from hypothesis import strategies as st
from test_dinheiro import ambos

intervalo = st.tuples(st.integers(min_value=0, max_value=1440), st.integers(min_value=5, max_value=240)).map(
    lambda t: (t[0], t[0] + t[1])
)
dia = st.lists(intervalo, min_size=0, max_size=25)


def cruza(a: tuple[int, int], b: tuple[int, int]) -> bool:
    return a[0] < b[1] and b[0] < a[1]


@settings(max_examples=150, deadline=None)
@given(st.lists(st.tuples(intervalo, dia), min_size=20, max_size=20))
def test_conflitos(casos):
    linhas = [
        f"conflitos {n[0]} {n[1]} " + " ".join(f"{i} {f}" for i, f in existentes) for n, existentes in casos
    ]
    c, ts = ambos(linhas)
    assert c == ts
    for (novo, existentes), saida in zip(casos, c, strict=True):
        esperado = [i for i, e in enumerate(existentes) if cruza(novo, e)]
        assert list(map(int, saida.split()[1:])) == esperado


@settings(max_examples=150, deadline=None)
@given(st.lists(dia, min_size=20, max_size=20))
def test_colunas(dias):
    linhas = ["colunas " + " ".join(f"{i} {f}" for i, f in d) for d in dias]
    c, ts = ambos(linhas)
    assert c == ts
    for d, saida in zip(dias, c, strict=True):
        pares = [tuple(map(int, p.split("/"))) for p in saida.split()[1:]]
        for i, (col, tot) in enumerate(pares):
            assert 0 <= col < tot
            for j, (col2, _) in enumerate(pares):
                # Dois que se cruzam nunca ficam na mesma coluna e usam o mesmo total de colunas.
                if i != j and cruza(d[i], d[j]):
                    assert col != col2
                    assert tot == pares[j][1]
