"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { estiloCampo } from "@/components/ui";
import { formatarTelefone } from "@/lib/telefone";
import { casaBusca } from "@/lib/texto";

export type ClienteResumo = { id: string; nome: string; telefone: string | null };

/** Busca enquanto digita: sem acento, por pedaços do nome ou pelo telefone. */
export function ListaClientes({ clientes, arquivadas }: { clientes: ClienteResumo[]; arquivadas: boolean }) {
  const [busca, setBusca] = useState("");
  const filtradas = useMemo(() => {
    const digitos = busca.replace(/\D/g, "");
    return clientes.filter(
      (c) => casaBusca(c.nome, busca) || (digitos.length >= 3 && (c.telefone ?? "").includes(digitos)),
    );
  }, [clientes, busca]);

  return (
    <>
      <label className="relative mb-4 block">
        <span className="sr-only">Buscar cliente</span>
        <Search size={20} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-secundario" aria-hidden />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Nome ou telefone"
          className={`${estiloCampo} pl-12`}
        />
      </label>

      <p className="mb-2 text-sm text-secundario" aria-live="polite">
        {filtradas.length === clientes.length
          ? `${clientes.length} ${arquivadas ? "arquivada(s)" : "cliente(s)"}`
          : `${filtradas.length} de ${clientes.length}`}
      </p>

      {clientes.length === 0 ? (
        <p className="rounded-2xl bg-superficie px-4 py-6 text-center text-secundario">
          {arquivadas ? "Nenhuma cliente arquivada." : "Nenhuma cliente ainda. Toque no + ou importe do iPhone."}
        </p>
      ) : filtradas.length === 0 ? (
        <p className="rounded-2xl bg-superficie px-4 py-6 text-center text-secundario">Ninguém com “{busca}”.</p>
      ) : (
        <ul className="divide-y divide-linha overflow-hidden rounded-2xl border border-linha">
          {filtradas.slice(0, 300).map((c) => (
            <li key={c.id}>
              <Link
                href={`/clientes/${c.id}`}
                className="apertavel flex min-h-16 items-center gap-3 px-4 py-2 hover:bg-superficie"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{c.nome}</span>
                  {c.telefone && <span className="text-sm text-secundario tabular-nums">{formatarTelefone(c.telefone)}</span>}
                </span>
                <ChevronRight size={18} className="shrink-0 text-secundario" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {filtradas.length > 300 && (
        <p className="mt-3 text-center text-sm text-secundario">Mostrando 300. Digite para achar as outras.</p>
      )}
    </>
  );
}
