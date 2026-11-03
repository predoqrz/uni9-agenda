"""Normalização de telefone igual à do app (src/lib/telefone.ts)."""

from __future__ import annotations

import re

DDD_PADRAO = "11"


def normalizar_telefone(texto: str, ddd_padrao: str = DDD_PADRAO) -> str | None:
    d = re.sub(r"\D", "", texto or "")
    if not d:
        return None
    if len(d) in (12, 13) and d.startswith("55"):
        d = d[2:]
    if d.startswith("0"):
        # 0 + operadora (2 dígitos) + DDD + número, ou 0 + DDD + número
        d = d[3:] if len(d) in (13, 14) else d[1:]
    if len(d) in (8, 9):
        d = ddd_padrao + d
    if len(d) not in (10, 11) or d[0] == "0":
        return None
    return d
