"""Importa clientes ou serviços de uma planilha antiga (.xlsx ou .csv) para o UNI9-AGENDA.

Por padrão só SIMULA: mostra o que entraria e o que seria pulado, sem gravar nada.
Para gravar, rode de novo com --confirmar.

Colunas reconhecidas (a primeira linha é o cabeçalho, sem diferença de maiúsculas/acentos):
  clientes: nome, telefone (ou whatsapp/celular), nascimento, instagram (ou rede social), observacoes
  servicos: nome, preco, duracao (minutos), categoria, sinal, custo

A chave secreta do Supabase é lida SÓ da variável de ambiente SUPABASE_SECRET_KEY
na hora de rodar. Nunca a coloque em arquivo do projeto.

Exemplos:
  uv run python importar_planilha.py clientes antigas.xlsx
  uv run python importar_planilha.py servicos precos.csv --confirmar
"""

from __future__ import annotations

import argparse
import csv
import os
import sys
import unicodedata
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Any

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))
from uni9.nucleo import ErroDinheiro, ler_dinheiro  # noqa: E402
from uni9.telefone import normalizar_telefone  # noqa: E402

URL_PADRAO = "https://uqpnjgyxxtniqfxamfuj.supabase.co"
CATEGORIAS = {"extensao_cilios", "design", "sobrancelhas", "cilios", "labios", "facial", "outros"}

SINONIMOS = {
    "nome": "nome",
    "cliente": "nome",
    "telefone": "telefone",
    "whatsapp": "telefone",
    "celular": "telefone",
    "nascimento": "nascimento",
    "aniversario": "nascimento",
    "data de nascimento": "nascimento",
    "instagram": "rede_social",
    "rede social": "rede_social",
    "observacoes": "observacoes",
    "obs": "observacoes",
    "preco": "preco",
    "valor": "preco",
    "duracao": "duracao",
    "tempo": "duracao",
    "categoria": "categoria",
    "sinal": "sinal",
    "custo": "custo",
}


def simplificar(texto: str) -> str:
    sem_acento = unicodedata.normalize("NFD", texto).encode("ascii", "ignore").decode()
    return " ".join(sem_acento.lower().replace("_", " ").split())


def ler_planilha(caminho: Path) -> list[dict[str, Any]]:
    if caminho.suffix.lower() == ".csv":
        bruto = caminho.read_bytes()
        texto = bruto.decode("utf-8-sig") if bruto.startswith(b"\xef\xbb\xbf") else _decodificar(bruto)
        separador = ";" if texto.splitlines()[0].count(";") > texto.splitlines()[0].count(",") else ","
        linhas = list(csv.reader(texto.splitlines(), delimiter=separador))
    elif caminho.suffix.lower() in (".xlsx", ".xlsm"):
        from openpyxl import load_workbook

        planilha = load_workbook(caminho, read_only=True, data_only=True).active
        linhas = [list(lin) for lin in planilha.iter_rows(values_only=True)]
    else:
        raise SystemExit(f"Formato não suportado: {caminho.suffix}. Use .xlsx ou .csv.")

    if not linhas:
        return []
    cabecalho = [SINONIMOS.get(simplificar(str(c or "")), "") for c in linhas[0]]
    return [
        {cabecalho[i]: v for i, v in enumerate(lin) if i < len(cabecalho) and cabecalho[i]}
        for lin in linhas[1:]
        if any(v not in (None, "") for v in lin)
    ]


def _decodificar(bruto: bytes) -> str:
    try:
        return bruto.decode("utf-8")
    except UnicodeDecodeError:
        return bruto.decode("cp1252")  # Excel no Windows salva CSV assim


def texto(v: Any) -> str:
    return "" if v is None else str(v).strip()


def para_data(v: Any) -> str | None:
    if v in (None, ""):
        return None
    if isinstance(v, datetime | date):
        return v.strftime("%Y-%m-%d")
    for formato in ("%d/%m/%Y", "%d/%m/%y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(texto(v), formato).strftime("%Y-%m-%d")
        except ValueError:
            continue
    raise ValueError(f"data não reconhecida: {v}")


def para_centavos(v: Any) -> int:
    if isinstance(v, int | float):
        # Número vindo do Excel: converte pelo texto com 2 casas, sem conta em ponto flutuante.
        v = f"{v:.2f}".replace(".", ",")
    return ler_dinheiro(texto(v))


@dataclass
class Plano:
    entrar: list[dict[str, Any]] = field(default_factory=list)
    pulados: list[tuple[int, str]] = field(default_factory=list)


def planejar_clientes(linhas: list[dict[str, Any]], existentes: set[str]) -> Plano:
    plano = Plano()
    vistos: set[str] = set()
    for n, lin in enumerate(linhas, start=2):
        nome = texto(lin.get("nome"))
        if not nome:
            plano.pulados.append((n, "sem nome"))
            continue
        telefone = normalizar_telefone(texto(lin.get("telefone"))) if texto(lin.get("telefone")) else None
        if texto(lin.get("telefone")) and not telefone:
            plano.pulados.append((n, f"telefone não reconhecido ({lin.get('telefone')})"))
            continue
        if telefone and (telefone in existentes or telefone in vistos):
            plano.pulados.append((n, f"{nome}: telefone já cadastrado"))
            continue
        try:
            nascimento = para_data(lin.get("nascimento"))
        except ValueError as e:
            plano.pulados.append((n, f"{nome}: {e}"))
            continue
        if telefone:
            vistos.add(telefone)
        plano.entrar.append(
            {
                "nome": nome[:120],
                "telefone": telefone,
                "nascimento": nascimento,
                "rede_social": texto(lin.get("rede_social")) or None,
                "observacoes": texto(lin.get("observacoes")) or None,
            }
        )
    return plano


def planejar_servicos(linhas: list[dict[str, Any]], existentes: set[str]) -> Plano:
    plano = Plano()
    for n, lin in enumerate(linhas, start=2):
        nome = texto(lin.get("nome"))
        if not nome:
            plano.pulados.append((n, "sem nome"))
            continue
        if simplificar(nome) in existentes:
            plano.pulados.append((n, f"{nome}: já existe"))
            continue
        try:
            preco = para_centavos(lin.get("preco"))
            sinal = para_centavos(lin.get("sinal")) if texto(lin.get("sinal")) else 0
            custo = para_centavos(lin.get("custo")) if texto(lin.get("custo")) else 0
        except ErroDinheiro as e:
            plano.pulados.append((n, f"{nome}: {e}"))
            continue
        duracao = texto(lin.get("duracao")) or "60"
        if not duracao.isdigit() or not 5 <= int(duracao) <= 720:
            plano.pulados.append((n, f"{nome}: duração inválida ({duracao})"))
            continue
        categoria = simplificar(texto(lin.get("categoria"))).replace(" ", "_") or "outros"
        plano.entrar.append(
            {
                "nome": nome[:120],
                "preco_centavos": preco,
                "duracao_min": int(duracao),
                "categoria": categoria if categoria in CATEGORIAS else "outros",
                "sinal_centavos": min(sinal, preco),
                "custo_centavos": custo,
            }
        )
        existentes.add(simplificar(nome))
    return plano


class Supabase:
    def __init__(self, url: str, chave: str) -> None:
        self.http = httpx.Client(
            base_url=f"{url}/rest/v1",
            headers={"apikey": chave, "Authorization": f"Bearer {chave}"},
            timeout=30,
        )

    def todos(self, tabela: str, colunas: str) -> list[dict[str, Any]]:
        linhas: list[dict[str, Any]] = []
        de = 0
        while True:  # o Supabase corta em 1000 linhas: busca em blocos
            r = self.http.get(
                f"/{tabela}",
                params={"select": colunas, "deleted_at": "is.null", "order": "id"},
                headers={"Range": f"{de}-{de + 999}"},
            )
            r.raise_for_status()
            bloco = r.json()
            linhas += bloco
            if len(bloco) < 1000:
                return linhas
            de += 1000

    def inserir(self, tabela: str, linhas: list[dict[str, Any]]) -> None:
        for i in range(0, len(linhas), 500):
            r = self.http.post(f"/{tabela}", json=linhas[i : i + 500], headers={"Prefer": "return=minimal"})
            r.raise_for_status()


def principal(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        prog="importar_planilha.py",
        description="Importa clientes ou serviços de uma planilha para o UNI9-AGENDA. Simula por padrão.",
    )
    p.add_argument("tipo", choices=["clientes", "servicos"], help="o que a planilha contém")
    p.add_argument("arquivo", type=Path, help="planilha .xlsx ou .csv")
    p.add_argument("--confirmar", action="store_true", help="grava de verdade (sem isso, só simula)")
    args = p.parse_args(argv)

    if not args.arquivo.exists():
        print(f"Arquivo não encontrado: {args.arquivo}")
        return 1
    chave = os.environ.get("SUPABASE_SECRET_KEY", "")
    if not chave.startswith("sb_secret_"):
        print("Defina SUPABASE_SECRET_KEY (a chave sb_secret_… do painel) só no terminal, na hora de rodar.")
        return 1

    try:
        linhas = ler_planilha(args.arquivo)
        banco = Supabase(os.environ.get("SUPABASE_URL", URL_PADRAO), chave)
        if args.tipo == "clientes":
            existentes = {lin["telefone"] for lin in banco.todos("clientes", "telefone") if lin["telefone"]}
            plano = planejar_clientes(linhas, existentes)
        else:
            existentes = {simplificar(lin["nome"]) for lin in banco.todos("servicos", "nome")}
            plano = planejar_servicos(linhas, existentes)

        print(f"{len(plano.entrar)} {args.tipo} para entrar, {len(plano.pulados)} pulado(s).")
        for linha, motivo in plano.pulados:
            print(f"  linha {linha}: {motivo}")

        if not args.confirmar:
            print("Simulação: nada foi gravado. Rode de novo com --confirmar para gravar.")
            return 0
        banco.inserir(args.tipo, plano.entrar)
        print(f"Pronto: {len(plano.entrar)} {args.tipo} gravado(s).")
        return 0
    except httpx.HTTPStatusError as e:
        print(f"O Supabase recusou ({e.response.status_code}). Confira a chave e a planilha.")
    except httpx.HTTPError:
        print("Não consegui falar com o Supabase. Confira a internet.")
    except RuntimeError as e:
        print(e)
    return 1


if __name__ == "__main__":
    sys.exit(principal())
