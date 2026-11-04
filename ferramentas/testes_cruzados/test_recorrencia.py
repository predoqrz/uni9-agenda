"""Testes cruzados das contas fixas: C nativo, WebAssembly do app e o calendário do Python dão o mesmo dia."""

from __future__ import annotations

import calendar

from hypothesis import given, settings
from hypothesis import strategies as st
from test_dinheiro import ambos


def esperado(ano: int, mes: int, dia: int) -> int:
    if not 1 <= mes <= 12 or not 1 <= dia <= 31:
        return 0
    return min(dia, calendar.monthrange(ano, mes)[1])


@settings(max_examples=60, deadline=None)
@given(
    st.lists(
        st.tuples(
            st.integers(min_value=1900, max_value=2400),
            st.integers(min_value=0, max_value=13),
            st.integers(min_value=0, max_value=32),
        ),
        min_size=60,
        max_size=60,
    )
)
def test_vencimento(casos):
    linhas = [f"vencimento {a} {m} {d}" for a, m, d in casos]
    c, ts = ambos(linhas)
    assert c == ts
    assert c == [f"ok {esperado(a, m, d)}" for a, m, d in casos]
