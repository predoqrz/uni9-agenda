import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BotaoFlutuante, Titulo } from "@/components/ui";
import type { Recorrencia } from "@/lib/caixa";
import { formatarDinheiro } from "@/lib/nucleo";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export default async function ContasFixas() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("recorrencias")
    .select("id, tipo, esfera, valor_centavos, descricao, categoria, dia_mes, comeca_em, ativo")
    .is("deleted_at", null)
    .order("dia_mes")
    .overrideTypes<Recorrencia[], { merge: false }>();
  const contas = data ?? [];
  const totalMes = contas.filter((c) => c.ativo && c.tipo === "saida").reduce((s, c) => s + c.valor_centavos, 0);

  return (
    <>
      <Titulo>Contas fixas</Titulo>
      <p className="mb-4 text-secundario">
        Viram lançamento sozinhas no dia do vencimento. Meses futuros aparecem só como previsão. Saídas por mês:{" "}
        <span className="font-semibold tabular-nums text-preto">{formatarDinheiro(totalMes)}</span>
      </p>
      {contas.length === 0 ? (
        <p className="rounded-2xl bg-superficie px-4 py-6 text-center text-secundario">Nenhuma conta fixa. Toque no + para criar (aluguel, internet…).</p>
      ) : (
        <ul className="divide-y divide-linha overflow-hidden rounded-2xl border border-linha">
          {contas.map((c) => (
            <li key={c.id}>
              <Link href={`/caixa/contas-fixas/${c.id}`} className="apertavel flex min-h-16 items-center gap-3 px-4 py-2 hover:bg-superficie">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-superficie text-sm font-semibold tabular-nums">{c.dia_mes}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={`truncate font-medium ${c.ativo ? "" : "text-secundario line-through"}`}>{c.descricao}</span>
                  <span className="text-sm text-secundario">
                    {c.tipo === "saida" ? "Saída" : "Entrada"} · {c.esfera}
                    {c.ativo ? "" : " · pausada"}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">{formatarDinheiro(c.valor_centavos)}</span>
                <ChevronRight size={18} className="text-secundario" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <BotaoFlutuante href="/caixa/contas-fixas/nova" rotulo="Nova conta fixa" />
    </>
  );
}
