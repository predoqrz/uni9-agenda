"""Acesso ao núcleo C (nucleo/bin/bpq.dll ou libbpq.so) via ctypes.

A regra de dinheiro mora no C; o Python não reimplementa, só chama.
Compile antes com `make -C nucleo`.
"""

from __future__ import annotations

import ctypes
import sys
from functools import cache
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
PASTA_BIN = RAIZ / "nucleo" / "bin"

MENSAGENS = {
    1: "Digite um valor.",
    2: "Valor não reconhecido. Use, por exemplo, 120 ou 120,50.",
    3: "Valor alto demais. Confira os zeros.",
}


class ErroDinheiro(ValueError):
    def __init__(self, codigo: int) -> None:
        self.codigo = codigo
        super().__init__(MENSAGENS.get(codigo, "Valor inválido."))


@cache
def _biblioteca() -> ctypes.CDLL:
    nome = "bpq.dll" if sys.platform == "win32" else "libbpq.so"
    caminho = PASTA_BIN / nome
    if not caminho.exists():
        raise RuntimeError(f"Não achei {caminho}. Rode `make -C nucleo` antes.")
    lib = ctypes.CDLL(str(caminho))
    lib.dinheiro_ler.argtypes = [ctypes.c_char_p, ctypes.POINTER(ctypes.c_int64)]
    lib.dinheiro_ler.restype = ctypes.c_int
    lib.dinheiro_formatar.argtypes = [ctypes.c_int64, ctypes.c_char_p, ctypes.c_size_t]
    lib.dinheiro_formatar.restype = ctypes.c_int
    lib.dinheiro_repartir.argtypes = [
        ctypes.c_int64,
        ctypes.POINTER(ctypes.c_int64),
        ctypes.c_size_t,
        ctypes.POINTER(ctypes.c_int64),
    ]
    lib.dinheiro_repartir.restype = ctypes.c_int
    return lib


def ler_dinheiro(texto: str) -> int:
    """'1.234,56' -> 123456 centavos. Levanta ErroDinheiro se não entender."""
    centavos = ctypes.c_int64()
    codigo = _biblioteca().dinheiro_ler(texto.encode("utf-8"), ctypes.byref(centavos))
    if codigo:
        raise ErroDinheiro(codigo)
    return centavos.value


def formatar_dinheiro(centavos: int) -> str:
    """123456 -> 'R$ 1.234,56'."""
    buf = ctypes.create_string_buffer(32)
    codigo = _biblioteca().dinheiro_formatar(centavos, buf, len(buf))
    if codigo:
        raise ErroDinheiro(codigo)
    return buf.value.decode("utf-8")


def repartir_dinheiro(total: int, pesos: list[int]) -> list[int]:
    n = len(pesos)
    entrada = (ctypes.c_int64 * max(n, 1))(*pesos)
    saida = (ctypes.c_int64 * max(n, 1))()
    codigo = _biblioteca().dinheiro_repartir(total, entrada, n, saida)
    if codigo:
        raise ErroDinheiro(codigo)
    return list(saida[:n])
