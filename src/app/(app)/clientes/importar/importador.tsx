"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { FileUp, LoaderCircle } from "lucide-react";
import { Aviso, BotaoPrincipal, BotaoSecundario, estiloCampo } from "@/components/ui";
import { formatarTelefone, normalizarTelefone } from "@/lib/telefone";
import { casaBusca } from "@/lib/texto";
import { lerVcf } from "@/lib/vcf";
import { importarContatos, type ResultadoImportacao } from "../acoes";

type Linha = { chave: string; nome: string; telefone: string; jaExiste: boolean };

export function Importador({ telefonesExistentes }: { telefonesExistentes: string[] }) {
  const existentes = useMemo(() => new Set(telefonesExistentes), [telefonesExistentes]);
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set()); // começa sem nenhuma marcada
  const [busca, setBusca] = useState("");
  const [erroArquivo, setErroArquivo] = useState("");
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [enviando, iniciar] = useTransition();

  async function abrir(arquivo: File | undefined) {
    setErroArquivo("");
    setResultado(null);
    if (!arquivo) return;
    const contatos = lerVcf(await arquivo.text());
    const vistos = new Set<string>();
    const novas: Linha[] = [];
    for (const c of contatos) {
      // Um contato pode ter vários números: fica o primeiro que der para entender.
      const telefone = c.telefones.map((t) => normalizarTelefone(t)).find(Boolean);
      if (!telefone || vistos.has(telefone)) continue;
      vistos.add(telefone);
      novas.push({ chave: telefone, nome: c.nome, telefone, jaExiste: existentes.has(telefone) });
    }
    novas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    if (novas.length === 0) setErroArquivo("Não achei contatos com telefone nesse arquivo. Ele é um .vcf?");
    setLinhas(novas);
    setMarcadas(new Set());
  }

  const visiveis = (linhas ?? []).filter((l) => casaBusca(l.nome, busca));
  const alternar = (chave: string) =>
    setMarcadas((m) => {
      const n = new Set(m);
      if (n.has(chave)) n.delete(chave);
      else n.add(chave);
      return n;
    });

  function importar() {
    const escolhidas = (linhas ?? []).filter((l) => marcadas.has(l.chave) && !l.jaExiste);
    iniciar(async () => {
      const r = await importarContatos(escolhidas.map(({ nome, telefone }) => ({ nome, telefone })));
      setResultado(r);
      if (!("erro" in r)) {
        setLinhas((ls) => ls?.map((l) => (marcadas.has(l.chave) ? { ...l, jaExiste: true } : l)) ?? null);
        setMarcadas(new Set());
      }
    });
  }

  if (!linhas) {
    return (
      <div className="flex flex-col gap-4">
        <ol className="list-decimal space-y-1 pl-5 text-secundario">
          <li>No iPhone, abra Contatos, toque em “Listas” e segure “Todos os Contatos”.</li>
          <li>Escolha “Exportar” e salve o arquivo .vcf em Arquivos.</li>
          <li>Volte aqui e escolha esse arquivo.</li>
        </ol>
        <label className="apertavel flex h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-dourado font-semibold text-preto">
          <FileUp size={20} aria-hidden />
          Escolher arquivo .vcf
          <input
            type="file"
            accept=".vcf,text/vcard,text/x-vcard"
            className="sr-only"
            onChange={(e) => abrir(e.target.files?.[0])}
          />
        </label>
        {erroArquivo && <Aviso tipo="erro">{erroArquivo}</Aviso>}
      </div>
    );
  }

  const novasMarcadas = (linhas ?? []).filter((l) => marcadas.has(l.chave) && !l.jaExiste).length;

  return (
    <div className="flex flex-col gap-4">
      {resultado &&
        ("erro" in resultado ? (
          <Aviso tipo="erro">{resultado.erro}</Aviso>
        ) : (
          <Aviso tipo="ok">
            {resultado.importadas} cliente(s) importada(s).{" "}
            <Link href="/clientes" className="underline underline-offset-4">Ver lista</Link>
          </Aviso>
        ))}
      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder={`Buscar entre ${linhas.length} contatos`}
        className={estiloCampo}
      />
      <div className="flex gap-2">
        <BotaoSecundario
          type="button"
          className="flex-1"
          onClick={() => setMarcadas((m) => new Set([...m, ...visiveis.filter((l) => !l.jaExiste).map((l) => l.chave)]))}
        >
          Marcar visíveis
        </BotaoSecundario>
        <BotaoSecundario type="button" className="flex-1" onClick={() => setMarcadas(new Set())}>
          Desmarcar todos
        </BotaoSecundario>
      </div>
      <ul className="divide-y divide-linha overflow-hidden rounded-2xl border border-linha">
        {visiveis.slice(0, 400).map((l) => (
          <li key={l.chave}>
            <label className={`flex min-h-16 items-center gap-3 px-4 py-2 ${l.jaExiste ? "opacity-60" : "cursor-pointer hover:bg-superficie"}`}>
              <input
                type="checkbox"
                checked={marcadas.has(l.chave)}
                disabled={l.jaExiste}
                onChange={() => alternar(l.chave)}
                className="size-6 shrink-0 accent-[var(--dourado)]"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{l.nome}</span>
                <span className="text-sm text-secundario tabular-nums">
                  {formatarTelefone(l.telefone)}
                  {l.jaExiste && " · já cadastrada"}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))]">
        <BotaoPrincipal type="button" className="w-full" disabled={novasMarcadas === 0 || enviando} onClick={importar}>
          {enviando && <LoaderCircle size={20} className="animate-spin" aria-hidden />}
          {enviando ? "Importando…" : `Importar ${novasMarcadas} contato(s)`}
        </BotaoPrincipal>
      </div>
    </div>
  );
}
