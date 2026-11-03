import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Aviso, BotaoFlutuante, Titulo } from "@/components/ui";
import { formatarDinheiro } from "@/lib/nucleo";
import { CATEGORIAS, LISTA_CATEGORIAS, type Categoria } from "@/lib/servicos";
import { criarClienteServidor } from "@/lib/supabase/servidor";

type Linha = {
  id: string;
  nome: string;
  categoria: Categoria;
  preco_centavos: number;
  duracao_min: number;
  ativo: boolean;
  e_manutencao: boolean;
};

export default async function PaginaServicos({ searchParams }: { searchParams: Promise<{ arquivados?: string }> }) {
  const arquivados = (await searchParams).arquivados === "1";
  const supabase = await criarClienteServidor();
  const q = supabase.from("servicos").select("id, nome, categoria, preco_centavos, duracao_min, ativo, e_manutencao");
  const { data, error } = await (arquivados ? q.not("deleted_at", "is", null) : q.is("deleted_at", null)).order("nome");
  const servicos = (data ?? []) as Linha[];

  return (
    <>
      <Titulo>{arquivados ? "Serviços arquivados" : "Serviços"}</Titulo>
      {error && <Aviso tipo="erro">Não deu para carregar os serviços.</Aviso>}
      {!error && servicos.length === 0 && (
        <p className="rounded-2xl bg-superficie px-4 py-6 text-center text-secundario">
          {arquivados ? "Nenhum serviço arquivado." : "Nenhum serviço ainda. Toque no + para criar o primeiro."}
        </p>
      )}
      <div className="flex flex-col gap-6">
        {LISTA_CATEGORIAS.map((cat) => {
          const daCategoria = servicos.filter((s) => s.categoria === cat);
          if (daCategoria.length === 0) return null;
          return (
            <section key={cat}>
              <h2 className="mb-2 text-sm font-semibold tracking-wide text-dourado-escuro uppercase">{CATEGORIAS[cat]}</h2>
              <ul className="divide-y divide-linha overflow-hidden rounded-2xl border border-linha">
                {daCategoria.map((s) => (
                  <li key={s.id}>
                    <Link href={`/servicos/${s.id}`} className="apertavel flex min-h-16 items-center gap-3 px-4 py-2 hover:bg-superficie">
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className={`truncate font-medium ${s.ativo ? "" : "text-secundario line-through"}`}>{s.nome}</span>
                        <span className="text-sm text-secundario tabular-nums">
                          {s.duracao_min} min{s.e_manutencao ? " · manutenção" : ""}
                          {!s.ativo ? " · pausado" : ""}
                        </span>
                      </span>
                      <span className="font-semibold tabular-nums">{formatarDinheiro(s.preco_centavos)}</span>
                      <ChevronRight size={18} className="shrink-0 text-secundario" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <Link
        href={arquivados ? "/servicos" : "/servicos?arquivados=1"}
        className="mt-6 block py-3 text-center text-sm font-medium text-secundario underline underline-offset-4"
      >
        {arquivados ? "Voltar para os ativos" : "Ver arquivados"}
      </Link>
      {!arquivados && <BotaoFlutuante href="/servicos/novo" rotulo="Novo serviço" />}
    </>
  );
}
